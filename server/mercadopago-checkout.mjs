import {createHmac, randomUUID, timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {
  deliverCore360OutboxEvent,
  enqueueCore360PaymentApproved,
  isCore360CommerceCheckoutPreflightEnabled,
  isCore360CommercePollingEnabled,
  previewCore360Checkout,
  resolveCore360DeliveryService
} from "./core360-commerce-adapter.mjs";
import {loadEnvFile} from "./r2-media.mjs";
import {sendApprovedOrderEmails, sendOrderStatusUpdateEmail} from "./transactional-email.mjs";
import {getProductAvailability, getProductDispatchRule, isPlanProduct, santiagoDate, serializeAvailability} from "../src/lib/product-availability.js";
import {getDeliveryQuote, serializeDeliveryQuote} from "../src/lib/delivery-rates.js";

const localEnvReady = Promise.all([
  loadEnvFile(new URL("../.env.local", import.meta.url)),
  loadEnvFile(new URL("../.core360-commerce.local", import.meta.url))
]);
const MERCADOPAGO_API_URL = "https://api.mercadopago.com";
const MAX_BODY_BYTES = 64 * 1024;
const MAX_CART_LINES = 20;
const MAX_ITEM_QUANTITY = 20;
const PAYMENT_STATUSES = new Set([
  "pending",
  "approved",
  "authorized",
  "in_process",
  "rejected",
  "cancelled",
  "refunded",
  "charged_back"
]);

const LEGACY_CHECKOUT_OVERRIDES = new Map([
  [
    "trucha-betarraga-quinoa",
    {
      name: "Plan semanal antinflamatorio",
      price_clp: 44900,
      product_type: "plan",
      plan_frequency: "weekly"
    }
  ],
  [
    "pollo-curcuma-vegetales",
    {
      name: "Plan mensual Fullness",
      price_clp: 169000,
      product_type: "plan",
      plan_frequency: "monthly"
    }
  ],
  [
    "legumbres-granos-oliva",
    {
      name: "Salmon familiar y arroz verde",
      price_clp: 32900,
      product_type: "family",
      plan_frequency: null
    }
  ]
]);

let supabaseAdmin;

export async function createCheckoutPreference({cart, fulfillment, request, expectedAmount, dependencies = {}}) {
  await localEnvReady;
  validateFulfillment(fulfillment);
  const checkoutNow = dependencies.now || new Date();

  const normalizedCart = normalizeCart(cart);
  const env = dependencies.env || process.env;
  const deliveryQuote = getDeliveryQuote(fulfillment);
  if (!deliveryQuote.canPayOnline) throw statusError(422, deliveryQuote.message);
  const deliveryService = await (dependencies.resolveDeliveryService || resolveCore360DeliveryService)({
    env, feeClp: deliveryQuote.feeClp, issuedOn: santiagoDate(checkoutNow), fetchImpl: dependencies.core360FetchImpl || fetch
  });
  const supabase = dependencies.supabase || getSupabaseAdmin();
  if (isCore360CommercePollingEnabled(env) && !isCore360CommerceCheckoutPreflightEnabled(env)) {
    throw statusError(503, "La validación canónica pre-pago Core360 aún no está habilitada.");
  }
  const catalogItems = await applyCore360ProjectedPrices({
    catalogItems: await resolveCatalogItems(normalizedCart, {supabase, now: checkoutNow}),
    env,
    supabase
  });
  let orderItems = normalizedCart.map((cartItem) => {
    const product = catalogItems.get(cartItem.slug);

    if (!product) {
      throw statusError(422, `El producto ${cartItem.slug} ya no esta disponible.`);
    }

    return {
      product,
      quantity: cartItem.quantity,
      total: Number(product.price_clp) * cartItem.quantity
    };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal + deliveryQuote.feeClp;

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw statusError(422, "El total del pedido no es valido.");
  }
  if (expectedAmount !== undefined && (!Number.isSafeInteger(expectedAmount) || expectedAmount !== total)) {
    throw statusError(409, "El total vigente cambió. Revisa el carrito antes de pagar.");
  }

  const core360Preflight = await previewCore360Checkout({
    env,
    fetchImpl: dependencies.core360FetchImpl || fetch,
    items: orderItems,
    deliveryService
  });
  if (core360Preflight.enabled) {
    const previewVersion = cleanText(core360Preflight.result?.version || core360Preflight.result?.sourceVersion) || null;
    const checkedAt = new Date().toISOString();
    orderItems = orderItems.map((item) => ({
      ...item,
      product: {
        ...item.product,
        core360_preflight_checked_at: checkedAt,
        core360_preview_version: previewVersion
      }
    }));
  }

  // The public quote path ends before any order, item, outbox, email or MP write.
  if (dependencies.quoteOnly === true) {
    return {amount: total, subtotal, deliveryFee: deliveryQuote.feeClp, currency: "CLP", deliveryVerified: deliveryQuote.feeClp === 0 || Boolean(deliveryService), corePreviewVerified: core360Preflight.enabled === true};
  }

  const customerSnapshot = buildCustomerSnapshot(fulfillment);
  customerSnapshot.comuna = deliveryQuote.commune;
  customerSnapshot.deliveryQuote = serializeDeliveryQuote(deliveryQuote);
  if (deliveryService) customerSnapshot.deliveryService = deliveryService;
  customerSnapshot.weeklyDispatchWeekdays = orderItems.some(({product}) => isPlanProduct(product)) ? [2, 5] : null;
  customerSnapshot.dispatchPolicies = [...new Set(orderItems.map(({product}) => isPlanProduct(product) ? "weekly_fixed_menu" : "fullness_coordination"))];
  const legacyTestSchema = isLegacyTestSchema();
  const {data: order, error: orderError} = await supabase
    .from("orders")
    .insert({
      client_id: isTestMode() ? cleanText(process.env.MERCADOPAGO_TEST_CLIENT_ID) || null : null,
      status: legacyTestSchema ? "cancelled" : "pending_payment",
      payment_status: "pending",
      delivery_status: "pending",
      subtotal_clp: subtotal,
      discount_clp: 0,
      delivery_fee_clp: deliveryQuote.feeClp,
      total_clp: total,
      currency: "CLP",
      note: cleanText(fulfillment.instructions) || null,
      customer_snapshot: customerSnapshot
    })
    .select("id")
    .single();

  if (orderError || !order?.id) {
    throw statusError(502, "No pudimos crear la orden en Fullness.", orderError);
  }

  const orderRows = orderItems.map(({product, quantity, total: itemTotal}) => ({
    order_id: order.id,
    product_id: legacyTestSchema
      ? cleanText(process.env.MERCADOPAGO_TEST_PRODUCT_ID) || null
      : product.id,
    quantity,
    unit_price_clp: Number(product.price_clp),
    total_clp: itemTotal,
    product_name: product.name,
    product_snapshot: buildProductSnapshot(product, checkoutNow),
    ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
    nutrition_description: product.nutrition_description || null
  }));
  const {error: itemsError} = await supabase.from("order_items").insert(orderRows);

  if (itemsError) {
    await supabase.from("orders").update({status: "cancelled"}).eq("id", order.id);
    throw statusError(502, "No pudimos guardar los productos de la orden.", itemsError);
  }

  const siteUrl = getCheckoutSiteUrl(request);
  const preference = {
    ...(deliveryQuote.feeClp > 0 ? {shipments: {cost: deliveryQuote.feeClp, mode: "not_specified"}} : {}),
    items: orderItems.map(({product, quantity}) => ({
      id: product.slug,
      title: product.name,
      description: buildItemDescription(product),
      category_id: "food",
      currency_id: "CLP",
      quantity,
      unit_price: Number(product.price_clp)
    })),
    payer: {
      name: customerSnapshot.name,
      email: isTestMode()
        ? process.env.MERCADOPAGO_TEST_PAYER_EMAIL || "test@testuser.com"
        : customerSnapshot.email,
      phone: {
        number: customerSnapshot.phone
      }
    },
    external_reference: order.id,
    metadata: {
      order_id: order.id,
      customer_email: customerSnapshot.email,
      fulfillment_mode: customerSnapshot.mode
    },
    statement_descriptor: "FULLNESS LAB",
    back_urls: {
      success: `${siteUrl}/tienda?checkout_status=success&order_id=${encodeURIComponent(order.id)}`,
      pending: `${siteUrl}/tienda?checkout_status=pending&order_id=${encodeURIComponent(order.id)}`,
      failure: `${siteUrl}/tienda?checkout_status=failure&order_id=${encodeURIComponent(order.id)}`
    },
    auto_return: "approved"
  };

  if (process.env.MERCADOPAGO_WEBHOOK_SECRET && siteUrl.startsWith("https://")) {
    preference.notification_url = `${siteUrl}/api/mercadopago/webhook`;
  }

  let mercadoPagoPreference;

  try {
    mercadoPagoPreference = await (dependencies.mercadoPagoRequest || mercadoPagoRequest)("/checkout/preferences", {
      body: preference,
      method: "POST"
    });
  } catch (error) {
    await supabase.from("orders").update({status: "cancelled"}).eq("id", order.id);
    throw error;
  }

  const {error: preferenceSaveError} = await supabase
    .from("orders")
    .update({
      mercadopago_preference_id: mercadoPagoPreference.id,
      mercadopago_external_reference: order.id
    })
    .eq("id", order.id);

  if (preferenceSaveError) {
    throw statusError(502, "Mercado Pago creo el pago, pero no pudimos enlazarlo a la orden.", preferenceSaveError);
  }

  const initPoint = isTestMode()
    ? mercadoPagoPreference.sandbox_init_point || mercadoPagoPreference.init_point
    : mercadoPagoPreference.init_point;

  if (!initPoint) {
    throw statusError(502, "Mercado Pago no devolvio un enlace de pago.");
  }

  return {
    amount: total,
    subtotal,
    deliveryFee: deliveryQuote.feeClp,
    currency: "CLP",
    initPoint,
    orderId: order.id,
    preferenceId: mercadoPagoPreference.id,
    testMode: isTestMode()
  };
}

export async function quoteCheckout({cart, fulfillment, dependencies = {}}) {
  return createCheckoutPreference({
    cart,
    fulfillment: {mode: fulfillment?.mode, comuna: fulfillment?.comuna, address: "Cotización sin dirección", name: "Cotización web", email: "quote@fullness.invalid", phone: "+56000000000"},
    dependencies: {...dependencies, quoteOnly: true}
  });
}

export async function syncMercadoPagoPayment(paymentId, expectedOrderId = "", dependencies = {}) {
  await localEnvReady;

  const cleanPaymentId = cleanText(paymentId);
  if (!/^\d+$/.test(cleanPaymentId)) {
    throw statusError(400, "El identificador de pago no es valido.");
  }

  const payment = await (dependencies.mercadoPagoRequest || mercadoPagoRequest)(`/v1/payments/${encodeURIComponent(cleanPaymentId)}`);
  const orderId = cleanText(payment.external_reference || payment.metadata?.order_id);

  if (!orderId) {
    throw statusError(422, "El pago no esta asociado a una orden Fullness.");
  }

  if (expectedOrderId && orderId !== expectedOrderId) {
    throw statusError(409, "El pago no corresponde a la orden indicada.");
  }

  const supabase = dependencies.supabase || getSupabaseAdmin();
  const {data: order, error: orderError} = await supabase
    .from("orders")
    .select("id,client_id,status,payment_status,subtotal_clp,discount_clp,delivery_fee_clp,total_clp,currency,customer_snapshot,note,ordered_at,created_at,paid_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    throw statusError(404, "No encontramos la orden asociada al pago.", orderError);
  }

  const paymentStatus = normalizePaymentStatus(payment.status);
  const transactionAmount = Math.round(Number(payment.transaction_amount || 0));

  if (transactionAmount !== Number(order.total_clp) || payment.currency_id !== order.currency) {
    throw statusError(409, "El monto confirmado por Mercado Pago no coincide con la orden.");
  }

  const paymentRow = {
    order_id: order.id,
    provider: "mercado_pago",
    provider_payment_id: String(payment.id),
    provider_preference_id: cleanText(payment.preference_id) || null,
    provider_merchant_order_id: cleanText(payment.order?.id) || null,
    status: paymentStatus,
    status_detail: cleanText(payment.status_detail) || null,
    payment_method_id: cleanText(payment.payment_method_id) || null,
    payment_type_id: cleanText(payment.payment_type_id) || null,
    installments: Number.isFinite(Number(payment.installments)) ? Number(payment.installments) : null,
    transaction_amount_clp: transactionAmount,
    currency: payment.currency_id || "CLP",
    payer_email: cleanText(payment.payer?.email) || null,
    raw_payload: payment,
    paid_at: payment.date_approved || null
  };
  const {data: existingPayment, error: existingPaymentError} = await supabase
    .from("payments")
    .select("id")
    .eq("provider", "mercado_pago")
    .eq("provider_payment_id", String(payment.id))
    .maybeSingle();

  if (existingPaymentError) {
    throw statusError(502, "No pudimos conciliar el pago.", existingPaymentError);
  }

  const paymentQuery = existingPayment?.id
    ? supabase.from("payments").update(paymentRow).eq("id", existingPayment.id)
    : supabase.from("payments").insert(paymentRow);
  const {error: paymentSaveError} = await paymentQuery;

  if (paymentSaveError) {
    throw statusError(502, "No pudimos guardar el pago.", paymentSaveError);
  }

  const orderUpdate = orderUpdateForPayment(paymentStatus, payment.date_approved);
  const {error: orderUpdateError} = await supabase
    .from("orders")
    .update(orderUpdate)
    .eq("id", order.id);

  if (orderUpdateError) {
    throw statusError(502, "No pudimos actualizar el estado de la orden.", orderUpdateError);
  }

  let emailDelivery = null;
  if (paymentStatus === "approved") {
    const {data: emailItems, error: emailItemsError} = await supabase
      .from("order_items")
      .select("id,product_id,product_name,quantity,unit_price_clp,total_clp,product_snapshot")
      .eq("order_id", order.id);

    if (emailItemsError) {
      throw statusError(502, "No pudimos cargar los productos para confirmar la orden.", emailItemsError);
    }

    // Disabled by default: while false this returns before querying Supabase or Core360.
    // A failed optional outbox must never turn a reconciled Mercado Pago payment into an error.
    let coreOutbox = null;
    try {
      coreOutbox = await (dependencies.enqueueCore360PaymentApproved || enqueueCore360PaymentApproved)({
        items: emailItems || [],
        order: {...order, ...orderUpdate},
        payment: paymentRow,
        supabase
      });
    } catch (error) {
      console.error("Core360 commerce outbox was not queued:", cleanText(error?.message));
    }

    emailDelivery = await (dependencies.sendApprovedOrderEmails || sendApprovedOrderEmails)({order, items: emailItems || [], supabase});

    // The daily Vercel Cron is recovery only. A newly persisted event gets one
    // bounded, idempotent delivery attempt after transactional mail is safely
    // handled. Any Core failure remains in the outbox and never reverses the
    // Mercado Pago result or turns mail confirmation into a failed checkout.
    if (coreOutbox?.eventId) {
      try {
        await deliverCore360OutboxEvent({
          event: {id: coreOutbox.eventId, status: coreOutbox.status},
          supabase
        });
      } catch (error) {
        console.error("Core360 commerce immediate delivery failed:", cleanText(error?.message));
      }
    }
  } else if (order.status !== orderUpdate.status) {
    const {data: emailItems, error: emailItemsError} = await supabase
      .from("order_items")
      .select("product_name,quantity")
      .eq("order_id", order.id);

    if (!emailItemsError) {
      await sendOrderStatusUpdateEmail({
        order: {...order, ...orderUpdate},
        items: emailItems || [],
        nextStatus: orderUpdate.status,
        supabase
      });
    }
  }

  return {
    customerEmail: cleanText(order.customer_snapshot?.email),
    orderId: order.id,
    paymentId: String(payment.id),
    status: paymentStatus,
    statusDetail: cleanText(payment.status_detail),
    total: Number(order.total_clp),
    customerConfirmationSent: Boolean(emailDelivery?.customer?.sent),
    operationsNotificationSent: Boolean(emailDelivery?.operations?.sent)
  };
}

export async function refundMercadoPagoPayment({orderId}) {
  await localEnvReady;

  const cleanOrderId = cleanText(orderId);
  if (!cleanOrderId) throw statusError(400, "No encontramos la orden a reembolsar.");

  const supabase = getSupabaseAdmin();
  const {data: order, error: orderError} = await supabase
    .from("orders")
    .select("id,status,payment_status,total_clp,currency,customer_snapshot,paid_at")
    .eq("id", cleanOrderId)
    .maybeSingle();

  if (orderError || !order) throw statusError(404, "No encontramos la orden a reembolsar.", orderError);
  if (["refunded", "cancelled"].includes(order.status) || order.payment_status === "refunded") {
    throw statusError(409, "Esta orden ya fue cancelada o reembolsada.");
  }

  const {data: payment, error: paymentError} = await supabase
    .from("payments")
    .select("id,provider,provider_payment_id,status,transaction_amount_clp,currency,paid_at,raw_payload")
    .eq("order_id", order.id)
    .eq("provider", "mercado_pago")
    .eq("status", "approved")
    .order("paid_at", {ascending: false, nullsFirst: false})
    .limit(1)
    .maybeSingle();

  if (paymentError) throw statusError(502, "No pudimos revisar el pago de la orden.", paymentError);
  if (!payment?.provider_payment_id) {
    throw statusError(422, "Sólo se pueden reembolsar pedidos con un pago aprobado por Mercado Pago.");
  }

  const paidAt = payment.paid_at || order.paid_at;
  if (paidAt && Date.now() - new Date(paidAt).getTime() > 180 * 24 * 60 * 60 * 1000) {
    throw statusError(422, "Mercado Pago permite reembolsos hasta 180 días después de aprobar el pago.");
  }

  const amount = Math.round(Number(payment.transaction_amount_clp || order.total_clp));
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw statusError(422, "No encontramos un monto válido para reembolsar.");
  }

  const providerRefund = await mercadoPagoRequest(
    `/v1/payments/${encodeURIComponent(payment.provider_payment_id)}/refunds`,
    {
      body: {amount},
      idempotencyKey: order.id,
      method: "POST"
    }
  );

  const {error: paymentUpdateError} = await supabase
    .from("payments")
    .update({
      raw_payload: {
        ...(payment.raw_payload && typeof payment.raw_payload === "object" ? payment.raw_payload : {}),
        refund: providerRefund
      },
      status: "refunded",
      status_detail: "refunded_by_backoffice"
    })
    .eq("id", payment.id);

  if (paymentUpdateError) throw statusError(502, "Mercado Pago aprobó el reembolso, pero no pudimos registrarlo.", paymentUpdateError);

  const {error: orderUpdateError} = await supabase
    .from("orders")
    .update({
      delivery_status: "cancelled",
      payment_status: "refunded",
      status: "refunded"
    })
    .eq("id", order.id);

  if (orderUpdateError) throw statusError(502, "Mercado Pago aprobó el reembolso, pero no pudimos actualizar la orden.", orderUpdateError);

  return {
    order: {
      ...order,
      delivery_status: "cancelled",
      payment_status: "refunded",
      status: "refunded"
    },
    payment: {
      ...payment,
      status: "refunded"
    },
    providerRefund
  };
}

export async function recordWebhookEvent(payload) {
  await localEnvReady;
  const supabase = getSupabaseAdmin();
  const providerEventId = cleanText(payload?.id) || `${cleanText(payload?.action)}:${cleanText(payload?.data?.id)}`;

  if (providerEventId) {
    const {data: existingEvent, error: lookupError} = await supabase
      .from("payment_events")
      .select("id,processed_at")
      .eq("provider", "mercado_pago")
      .eq("provider_event_id", providerEventId)
      .maybeSingle();

    if (lookupError) {
      throw statusError(502, "No pudimos revisar el evento de pago.", lookupError);
    }

    if (existingEvent?.processed_at) {
      return {id: existingEvent.id, alreadyProcessed: true};
    }

    if (existingEvent?.id) {
      return {id: existingEvent.id, alreadyProcessed: false};
    }
  }

  const {data: event, error} = await supabase
    .from("payment_events")
    .insert({
      provider: "mercado_pago",
      provider_event_id: providerEventId || null,
      event_type: cleanText(payload?.type) || null,
      action: cleanText(payload?.action) || null,
      resource_url: cleanText(payload?.resource) || null,
      raw_payload: payload || {}
    })
    .select("id")
    .single();

  if (error || !event?.id) {
    throw statusError(502, "No pudimos registrar el evento de pago.", error);
  }

  return {id: event.id, alreadyProcessed: false};
}

export async function finishWebhookEvent(eventId, error = null) {
  await localEnvReady;
  const update = error
    ? {processing_error: cleanText(error.message).slice(0, 1000)}
    : {processed_at: new Date().toISOString(), processing_error: null};

  await getSupabaseAdmin().from("payment_events").update(update).eq("id", eventId);
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.byteLength;
    if (total > MAX_BODY_BYTES) {
      throw statusError(413, "La solicitud supera el tamano permitido.");
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export function validateWebhookSignature({dataId, requestId, signature}) {
  const secret = cleanText(process.env.MERCADOPAGO_WEBHOOK_SECRET);
  if (!secret) {
    throw statusError(503, "Falta configurar la firma del webhook de Mercado Pago.");
  }

  const parts = Object.fromEntries(
    cleanText(signature)
      .split(",")
      .map((part) => part.trim().split("=", 2))
      .filter(([key, value]) => key && value)
  );
  const manifest = `id:${cleanText(dataId)};request-id:${cleanText(requestId)};ts:${cleanText(parts.ts)};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = cleanText(parts.v1);

  if (!received || received.length !== expected.length) {
    throw statusError(401, "Firma de webhook invalida.");
  }

  const matches = timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
  if (!matches) {
    throw statusError(401, "Firma de webhook invalida.");
  }
}

export function statusError(statusCode, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.statusCode = statusCode;
  return error;
}

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw statusError(500, "Falta configurar Supabase para procesar compras.");
  }

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {autoRefreshToken: false, persistSession: false}
  });

  return supabaseAdmin;
}

async function applyCore360ProjectedPrices({catalogItems, env = process.env, supabase}) {
  if (!isCore360CommercePollingEnabled(env)) return catalogItems;

  const products = [...catalogItems.values()];
  const ids = products.map((product) => cleanText(product?.id)).filter(Boolean);
  if (ids.length === 0) return catalogItems;
  const {data, error} = await supabase
    .from("core360_catalog_projection")
    .select("source_menu_item_id,core_item_id,core_sku,gross_minor,currency,price_available,product_version,tax_bps,unit,quantity_milli_per_unit,core_item_available,uom_compatible,factor_compatible,reconciliation_reason")
    .in("source_menu_item_id", ids);
  if (error) throw statusError(503, "No pudimos consultar los precios canónicos Core360.", error);

  const {data: imageMappings, error: imageMappingsError} = await supabase
    .from("core360_product_mappings")
    .select("source_menu_item_id,core_item_id,image_reference,image_version")
    .in("source_menu_item_id", ids)
    .eq("is_active", true);
  if (imageMappingsError) throw statusError(503, "No pudimos consultar los metadatos Core360 del producto.", imageMappingsError);

  const projectionBySourceId = new Map((data || [])
    .filter((row) => row?.price_available === true
      && row?.core_item_available === true
      && row?.uom_compatible === true
      && row?.factor_compatible === true
      && cleanText(row?.currency) === "CLP")
    .map((row) => [cleanText(row.source_menu_item_id), row])
    .filter(([id]) => id));
  const result = new Map();
  const mediaBySourceId = new Map((imageMappings || [])
    .map((mapping) => [cleanText(mapping?.source_menu_item_id), mapping])
    .filter(([sourceMenuItemId]) => sourceMenuItemId));
  for (const [slug, product] of catalogItems.entries()) {
    const projection = projectionBySourceId.get(cleanText(product?.id));
    if (!projection) {
      throw statusError(503, "Core360 no confirmó disponibilidad comercial actual para uno de los productos.");
    }
    const grossMinor = Math.round(Number(projection.gross_minor));
    if (!Number.isSafeInteger(grossMinor) || grossMinor <= 0) {
      throw statusError(503, "Core360 devolvió un precio canónico inválido.");
    }
    const commercialVersion = cleanText(projection.product_version);
    const coreItemId = cleanText(projection.core_item_id);
    const coreSku = cleanText(projection.core_sku);
    const coreUnit = cleanText(projection.unit);
    const coreTaxBps = Number(projection.tax_bps);
    const quantityMilliPerUnit = Number(projection.quantity_milli_per_unit);
    if (
      !commercialVersion
      || !coreItemId
      || !coreSku
      || !coreUnit
      || !Number.isSafeInteger(coreTaxBps)
      || coreTaxBps < 0
      || !Number.isSafeInteger(quantityMilliPerUnit)
      || quantityMilliPerUnit < 1
    ) {
      throw statusError(503, "Core360 devolvió una identidad comercial incompleta.");
    }
    const media = mediaBySourceId.get(cleanText(product?.id));
    if (media && cleanText(media?.core_item_id) !== coreItemId) {
      throw statusError(503, "La metadata Core360 no corresponde al artículo comercial cotizado.");
    }
    result.set(slug, {
      ...product,
      core360_commercial_version: commercialVersion,
      core360_item_id: coreItemId,
      core360_quantity_milli_per_unit: quantityMilliPerUnit,
      core360_sku: coreSku,
      core360_tax_bps: coreTaxBps,
      core360_uom_code: coreUnit,
      core360_image_reference: cleanText(media?.image_reference) || null,
      core360_image_version: cleanText(media?.image_version) || null,
      price_clp: grossMinor
    });
  }
  return result;
}

async function resolveCatalogItems(cart, {supabase = getSupabaseAdmin(), now = new Date()} = {}) {
  const slugs = [...new Set(cart.map((item) => item.slug))];
  const {data, error} = await supabase
    .from("menu_items")
    .select("*")
    .in("slug", slugs)
    .eq("is_active", true);

  if (error) {
    throw statusError(502, "No pudimos validar el catalogo.", error);
  }

  const catalogItems = (data || []).map(applyLegacyCheckoutOverride);
  for (const product of catalogItems) {
    const availability = getProductAvailability(product, now);
    if (!availability.available) {
      throw statusError(409, `${product.name}: ${availability.message}.`);
    }
  }
  const catalogWithMonthlyWeeks = await resolveMonthlyPlanWeeks(catalogItems, {supabase});

  return new Map(catalogWithMonthlyWeeks.map((row) => [row.slug, row]));
}

function isMonthlyPlan(product) {
  return product?.product_type === "plan" && product?.plan_frequency === "monthly";
}

function mealIdentity(meal) {
  return cleanText(meal?.libraryMealId || meal?.library_meal_id || meal?.id);
}

function weeklyPlanHasSixDistinctMealpreps(weeklyPlan) {
  if (!Array.isArray(weeklyPlan?.included_items) || weeklyPlan.included_items.length !== 6) return false;

  const ids = weeklyPlan.included_items.map(mealIdentity);
  return ids.every(Boolean) && new Set(ids).size === 6;
}

async function resolveMonthlyPlanWeeks(catalogItems, {supabase = getSupabaseAdmin()} = {}) {
  const monthlyPlans = catalogItems.filter(isMonthlyPlan);
  if (monthlyPlans.length === 0) return catalogItems;

  const monthlyPlanIds = monthlyPlans.map((plan) => plan.id).filter(Boolean);
  const {data: links, error: linksError} = await supabase
    .from("monthly_plan_weeks")
    .select("monthly_plan_id,weekly_plan_id,week_position")
    .in("monthly_plan_id", monthlyPlanIds)
    .order("week_position", {ascending: true});

  if (linksError) {
    throw statusError(502, "No pudimos validar las semanas del plan mensual.", linksError);
  }

  const linksByMonthlyPlan = new Map();
  for (const link of links || []) {
    const monthlyPlanId = cleanText(link?.monthly_plan_id);
    const weeklyPlanId = cleanText(link?.weekly_plan_id);
    const weekPosition = Number(link?.week_position);
    if (!monthlyPlanId || !weeklyPlanId || !Number.isInteger(weekPosition)) continue;

    const monthlyLinks = linksByMonthlyPlan.get(monthlyPlanId) || [];
    monthlyLinks.push({weeklyPlanId, weekPosition});
    linksByMonthlyPlan.set(monthlyPlanId, monthlyLinks);
  }

  const weeklyPlanIds = [...new Set(
    [...linksByMonthlyPlan.values()].flatMap((monthlyLinks) => monthlyLinks.map((link) => link.weeklyPlanId))
  )];
  const {data: weeklyPlans, error: weeklyPlansError} = weeklyPlanIds.length
    ? await supabase
      .from("menu_items")
      .select("*")
      .in("id", weeklyPlanIds)
      .eq("is_active", true)
    : {data: [], error: null};

  if (weeklyPlansError) {
    throw statusError(502, "No pudimos validar los planes semanales del mensual.", weeklyPlansError);
  }

  const weeklyPlanById = new Map((weeklyPlans || []).map((plan) => [plan.id, plan]));

  return catalogItems.map((product) => {
    if (!isMonthlyPlan(product)) return product;

    const monthlyLinks = (linksByMonthlyPlan.get(product.id) || [])
      .sort((left, right) => left.weekPosition - right.weekPosition);
    const weeklyIds = monthlyLinks.map((link) => link.weeklyPlanId);
    const weekPositions = monthlyLinks.map((link) => link.weekPosition);
    const validPositions = weekPositions.length === 4
      && new Set(weekPositions).size === 4
      && weekPositions.every((position, index) => position === index + 1);

    if (monthlyLinks.length !== 4 || new Set(weeklyIds).size !== 4 || !validPositions) {
      throw statusError(422, `El plan mensual ${cleanText(product.name) || "seleccionado"} no tiene sus cuatro semanas configuradas.`);
    }

    const monthlyWeeks = monthlyLinks.map((link) => {
      const weeklyPlan = weeklyPlanById.get(link.weeklyPlanId);
      if (
        !weeklyPlan
        || weeklyPlan.product_type !== "plan"
        || weeklyPlan.plan_frequency !== "weekly"
        || !weeklyPlanHasSixDistinctMealpreps(weeklyPlan)
      ) {
        throw statusError(
          422,
          `El plan mensual ${cleanText(product.name) || "seleccionado"} contiene una semana no disponible o incompleta.`
        );
      }

      return {...weeklyPlan, week_position: link.weekPosition};
    });

    return {...product, monthly_weeks: monthlyWeeks};
  });
}

function snapshotMealprep(meal) {
  return {
    id: meal?.id || null,
    libraryMealId: meal?.libraryMealId || meal?.library_meal_id || null,
    name: meal?.name || "",
    sku: meal?.sku || null
  };
}

function snapshotWeeklyPresetMenu(weeklyPlan) {
  return Array.isArray(weeklyPlan?.included_items)
    ? weeklyPlan.included_items.map(snapshotMealprep)
    : [];
}

function buildProductSnapshot(product, now = new Date()) {
  const monthlyWeeks = isMonthlyPlan(product) && Array.isArray(product.monthly_weeks)
    ? product.monthly_weeks.map((weeklyPlan) => ({
      weekPosition: Number(weeklyPlan.week_position),
      weeklyPlanId: weeklyPlan.id || null,
      weeklyPlanSlug: weeklyPlan.slug || "",
      weeklyPlanSku: weeklyPlan.sku || null,
      weeklyPlanName: weeklyPlan.name || "",
      dispatch: getProductAvailability(weeklyPlan, now).dispatch,
      mealpreps: snapshotWeeklyPresetMenu(weeklyPlan)
    }))
    : [];

  return {
    core360CatalogVersion: cleanText(product.core360_preview_version) || null,
    core360ImageReference: cleanText(product.core360_image_reference) || null,
    core360ImageVersion: cleanText(product.core360_image_version) || null,
    core360ItemId: cleanText(product.core360_item_id) || null,
    core360PriceVersion: cleanText(product.core360_commercial_version) || null,
    core360PreflightCheckedAt: cleanText(product.core360_preflight_checked_at) || null,
    core360QuantityMilliPerUnit: Number(product.core360_quantity_milli_per_unit) || null,
    core360Sku: cleanText(product.core360_sku) || null,
    core360TaxBps: Number.isSafeInteger(Number(product.core360_tax_bps)) ? Number(product.core360_tax_bps) : null,
    core360UnitGrossMinor: Number(product.price_clp) || null,
    core360UomCode: cleanText(product.core360_uom_code) || null,
    slug: product.slug,
    sku: product.sku,
    productType: product.product_type,
    planFrequency: product.plan_frequency,
    availability: serializeAvailability(product.metadata?.availability),
    dispatch: getProductAvailability(product, now).dispatch,
    dispatchRule: getProductDispatchRule(product),
    dispatchPolicy: isPlanProduct(product) ? "weekly_fixed_menu" : "fullness_coordination",
    weeklyDispatchWeekdays: isPlanProduct(product) ? [2, 5] : null,
    tag: product.tag,
    photoUrl: product.photo_url,
    benefitTags: product.benefit_tags,
    servingLabel: product.serving_label,
    planStructure: isMonthlyPlan(product)
      ? "monthly_weeks_v1"
      : product.product_type === "plan"
        ? "weekly_mealpreps_v1"
        : null,
    // Monthly plans deliberately leave this flat compatibility field empty.
    // Their immutable order snapshot is grouped by the four weekly plans.
    presetMenu: product.product_type === "plan" && !isMonthlyPlan(product)
      ? snapshotWeeklyPresetMenu(product)
      : [],
    monthlyWeeks
  };
}

function applyLegacyCheckoutOverride(row) {
  const override = LEGACY_CHECKOUT_OVERRIDES.get(row.slug);
  const photoUrl = cleanText(row.photo_url);
  const isLegacyPlaceholder = override && (!photoUrl || photoUrl.includes("fullness-food-crop.jpeg"));

  return isLegacyPlaceholder ? {...row, ...override} : row;
}

function normalizeCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > MAX_CART_LINES) {
    throw statusError(422, "El carrito no contiene productos validos.");
  }

  return cart.map((item) => {
    const slug = cleanText(item?.slug);
    const quantity = Math.round(Number(item?.quantity ?? item?.qty));

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw statusError(422, "Uno de los productos no tiene un identificador valido.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw statusError(422, `La cantidad de ${slug} no es valida.`);
    }

    return {quantity, slug};
  });
}

function validateFulfillment(fulfillment) {
  const mode = cleanText(fulfillment?.mode);
  const name = cleanText(fulfillment?.name);
  const email = cleanText(fulfillment?.email).toLowerCase();
  const phone = cleanText(fulfillment?.phone);

  if (!['delivery', 'pickup'].includes(mode)) {
    throw statusError(422, "Selecciona despacho o retiro en local.");
  }
  if (name.length < 2 || name.length > 120) {
    throw statusError(422, "Ingresa un nombre valido.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw statusError(422, "Ingresa un correo valido.");
  }
  if (phone.length < 8 || phone.length > 30) {
    throw statusError(422, "Ingresa un telefono valido.");
  }
  if (mode === "delivery") {
    if (cleanText(fulfillment?.address).length < 5) {
      throw statusError(422, "Ingresa una direccion de despacho valida.");
    }
    if (cleanText(fulfillment?.comuna).length < 2) {
      throw statusError(422, "Ingresa la comuna de despacho.");
    }
  }
}

function buildCustomerSnapshot(fulfillment) {
  return {
    mode: cleanText(fulfillment.mode),
    name: cleanText(fulfillment.name),
    email: cleanText(fulfillment.email).toLowerCase(),
    phone: cleanText(fulfillment.phone),
    address: cleanText(fulfillment.address),
    comuna: cleanText(fulfillment.comuna),
    instructions: cleanText(fulfillment.instructions)
  };
}

function getCheckoutSiteUrl(request) {
  const configured = cleanText(process.env.CHECKOUT_SITE_URL).replace(/\/+$/, "");
  if (configured) return configured;

  const proto = cleanText(request?.headers?.["x-forwarded-proto"]) || "https";
  const host = cleanText(request?.headers?.["x-forwarded-host"] || request?.headers?.host);
  if (!host || /^(localhost|127\.0\.0\.1)(:|$)/.test(host)) {
    throw statusError(500, "Falta configurar CHECKOUT_SITE_URL con un dominio HTTPS.");
  }

  return `${proto}://${host}`;
}

function buildItemDescription(product) {
  return [product.tag, product.serving_label].map(cleanText).filter(Boolean).join(" - ").slice(0, 250);
}

async function mercadoPagoRequest(path, {body, idempotencyKey = randomUUID(), method = "GET"} = {}) {
  const token = cleanText(process.env.MERCADOPAGO_ACCESS_TOKEN);
  if (!token) {
    throw statusError(500, "Falta configurar Mercado Pago.");
  }

  const response = await fetch(`${MERCADOPAGO_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const providerMessage = cleanText(payload.message || payload.error || payload.cause?.[0]?.description);
    throw statusError(response.status >= 500 ? 502 : 422, providerMessage || "Mercado Pago rechazo la solicitud.");
  }

  return payload;
}

function normalizePaymentStatus(status) {
  const normalized = cleanText(status);
  return PAYMENT_STATUSES.has(normalized) ? normalized : "pending";
}

function orderUpdateForPayment(status, dateApproved) {
  if (status === "approved") {
    return {status: "paid", payment_status: "approved", paid_at: dateApproved || new Date().toISOString()};
  }
  if (["rejected", "cancelled"].includes(status)) {
    return {delivery_status: "cancelled", status: "cancelled", payment_status: status};
  }
  if (["refunded", "charged_back"].includes(status)) {
    return {delivery_status: "cancelled", status: "refunded", payment_status: status};
  }
  return {status: "pending_payment", payment_status: status};
}

function isTestMode() {
  return cleanText(process.env.MERCADOPAGO_TEST_MODE).toLowerCase() === "true";
}

function isLegacyTestSchema() {
  return isTestMode() && cleanText(process.env.MERCADOPAGO_LEGACY_SCHEMA_TEST_MODE).toLowerCase() === "true";
}

function cleanText(value) {
  return String(value ?? "").trim();
}
