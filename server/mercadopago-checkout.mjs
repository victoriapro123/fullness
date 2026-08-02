import {createHmac, randomUUID, timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {loadEnvFile} from "./r2-media.mjs";
import {sendApprovedOrderEmails} from "./transactional-email.mjs";

const localEnvReady = loadEnvFile(new URL("../.env.local", import.meta.url));
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

export async function createCheckoutPreference({cart, fulfillment, request}) {
  await localEnvReady;
  validateFulfillment(fulfillment);

  const normalizedCart = normalizeCart(cart);
  const catalogItems = await resolveCatalogItems(normalizedCart);
  const orderItems = normalizedCart.map((cartItem) => {
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
  const total = orderItems.reduce((sum, item) => sum + item.total, 0);

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw statusError(422, "El total del pedido no es valido.");
  }

  const supabase = getSupabaseAdmin();
  const customerSnapshot = buildCustomerSnapshot(fulfillment);
  const legacyTestSchema = isLegacyTestSchema();
  const {data: order, error: orderError} = await supabase
    .from("orders")
    .insert({
      client_id: isTestMode() ? cleanText(process.env.MERCADOPAGO_TEST_CLIENT_ID) || null : null,
      status: legacyTestSchema ? "cancelled" : "pending_payment",
      payment_status: "pending",
      delivery_status: "pending",
      subtotal_clp: total,
      discount_clp: 0,
      delivery_fee_clp: 0,
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
    product_snapshot: {
      slug: product.slug,
      sku: product.sku,
      productType: product.product_type,
      planFrequency: product.plan_frequency,
      tag: product.tag,
      photoUrl: product.photo_url,
      benefitTags: product.benefit_tags,
      servingLabel: product.serving_label,
      presetMenu: product.product_type === "plan"
        ? (Array.isArray(product.included_items)
          ? product.included_items.map((meal) => ({
            id: meal?.id || null,
            libraryMealId: meal?.libraryMealId || meal?.library_meal_id || null,
            name: meal?.name || "",
            sku: meal?.sku || null
          }))
          : [])
        : []
    },
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
    mercadoPagoPreference = await mercadoPagoRequest("/checkout/preferences", {
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
    currency: "CLP",
    initPoint,
    orderId: order.id,
    preferenceId: mercadoPagoPreference.id,
    testMode: isTestMode()
  };
}

export async function syncMercadoPagoPayment(paymentId, expectedOrderId = "") {
  await localEnvReady;

  const cleanPaymentId = cleanText(paymentId);
  if (!/^\d+$/.test(cleanPaymentId)) {
    throw statusError(400, "El identificador de pago no es valido.");
  }

  const payment = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(cleanPaymentId)}`);
  const orderId = cleanText(payment.external_reference || payment.metadata?.order_id);

  if (!orderId) {
    throw statusError(422, "El pago no esta asociado a una orden Fullness.");
  }

  if (expectedOrderId && orderId !== expectedOrderId) {
    throw statusError(409, "El pago no corresponde a la orden indicada.");
  }

  const supabase = getSupabaseAdmin();
  const {data: order, error: orderError} = await supabase
    .from("orders")
    .select("id,total_clp,currency,customer_snapshot")
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
      .select("product_name,quantity")
      .eq("order_id", order.id);

    if (emailItemsError) {
      throw statusError(502, "No pudimos cargar los productos para confirmar la orden.", emailItemsError);
    }

    emailDelivery = await sendApprovedOrderEmails({order, items: emailItems || [], supabase});
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

async function resolveCatalogItems(cart) {
  const slugs = [...new Set(cart.map((item) => item.slug))];
  const {data, error} = await getSupabaseAdmin()
    .from("menu_items")
    .select("*")
    .in("slug", slugs)
    .eq("is_active", true);

  if (error) {
    throw statusError(502, "No pudimos validar el catalogo.", error);
  }

  return new Map((data || []).map((row) => [row.slug, applyLegacyCheckoutOverride(row)]));
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

async function mercadoPagoRequest(path, {body, method = "GET"} = {}) {
  const token = cleanText(process.env.MERCADOPAGO_ACCESS_TOKEN);
  if (!token) {
    throw statusError(500, "Falta configurar Mercado Pago.");
  }

  const response = await fetch(`${MERCADOPAGO_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID()
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
    return {status: "cancelled", payment_status: status};
  }
  if (["refunded", "charged_back"].includes(status)) {
    return {status: "refunded", payment_status: status};
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
