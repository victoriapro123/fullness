import {assertBackofficeRequest, cleanText, statusError} from "../../server/backoffice-access.mjs";
import {readJsonBody, refundMercadoPagoPayment} from "../../server/mercadopago-checkout.mjs";
import {sendOrderStatusUpdateEmail} from "../../server/transactional-email.mjs";

const CORE360_STATE_SELECT = "core360_commerce_order_states(core_order_id,core_order_version,source_version,commercial_status,fulfillment_status,fiscal_status,fiscal_document_type,fiscal_folio,received_at,updated_at)";

const ORDER_SELECT = [
  "id",
  "status",
  "payment_status",
  "delivery_status",
  "subtotal_clp",
  "discount_clp",
  "delivery_fee_clp",
  "total_clp",
  "currency",
  "note",
  "customer_snapshot",
  "ordered_at",
  "paid_at",
  "received_at",
  "created_at",
  "order_items(id,product_name,quantity,unit_price_clp,total_clp,created_at)",
  "payments(id,provider,provider_payment_id,provider_preference_id,provider_merchant_order_id,status,status_detail,payment_method_id,payment_type_id,installments,transaction_amount_clp,currency,payer_email,paid_at,created_at)"
].join(",");

function orderSelect() {
  // The Core tables are a candidate migration. While polling is off, this
  // endpoint must remain compatible with the production schema that predates
  // them. Once polling is explicitly enabled, activation requires that
  // candidate migration to be applied first.
  return cleanText(process.env.CORE360_COMMERCE_POLL_ENABLED).toLowerCase() === "true"
    ? `${ORDER_SELECT},${CORE360_STATE_SELECT}`
    : ORDER_SELECT;
}

const NEXT_STATUSES = {
  paid: new Set(["preparing", "cancelled"]),
  preparing: new Set(["ready", "cancelled"]),
  ready: new Set(["out_for_delivery", "delivered", "cancelled"]),
  out_for_delivery: new Set(["delivered", "cancelled"]),
  pending_payment: new Set(["cancelled"])
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    await listOrders(req, res);
    return;
  }

  if (req.method === "PATCH") {
    await updateOrder(req, res);
    return;
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET, PATCH");
  sendJson(res, 405, {error: "Método no permitido."});
}

async function listOrders(req, res) {
  try {
    const {supabase} = await assertBackofficeRequest(req);
    const {data, error} = await supabase
      .from("orders")
      .select(orderSelect())
      .order("ordered_at", {ascending: false})
      .limit(250);

    if (error) throw statusError(502, "No pudimos cargar los pedidos.", error);

    sendJson(res, 200, {
      data: {
        orders: (data || []).map(presentOrder)
      }
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {error: error.message || "No pudimos cargar los pedidos."});
  }
}

async function updateOrder(req, res) {
  try {
    const {supabase, user, role} = await assertBackofficeRequest(req);
    const body = await readJsonBody(req);
    const action = cleanText(body?.action);
    const orderId = cleanText(body?.orderId);

    if (!orderId) throw statusError(422, "Selecciona un pedido para continuar.");

    if (action === "update-status") {
      const result = await updateOperationalStatus({
        nextStatus: cleanText(body?.status),
        orderId,
        supabase,
        userId: user.id
      });
      sendJson(res, 200, {data: result});
      return;
    }

    if (action === "refund") {
      if (role !== "owner") {
        throw statusError(403, "Solo el administrador propietario puede reembolsar pagos.");
      }

      const result = await refundOrder({orderId, supabase, userId: user.id});
      sendJson(res, 200, {data: result});
      return;
    }

    throw statusError(422, "La acción solicitada no está disponible.");
  } catch (error) {
    sendJson(res, error.statusCode || 500, {error: error.message || "No pudimos actualizar el pedido."});
  }
}

async function updateOperationalStatus({nextStatus, orderId, supabase, userId}) {
  const {data: current, error: currentError} = await supabase
    .from("orders")
    .select(orderSelect())
    .eq("id", orderId)
    .maybeSingle();

  if (currentError || !current) throw statusError(404, "No encontramos el pedido.", currentError);
  if (!NEXT_STATUSES[current.status]?.has(nextStatus)) {
    throw statusError(422, "Ese cambio de estado no está disponible para este pedido.");
  }

  const update = {
    delivery_status: deliveryStatusFor(nextStatus, current.delivery_status),
    status: nextStatus
  };
  if (nextStatus === "delivered") update.received_at = new Date().toISOString();

  const {data: order, error: updateError} = await supabase
    .from("orders")
    .update(update)
    .eq("id", current.id)
    .select(orderSelect())
    .single();

  if (updateError || !order) throw statusError(502, "No pudimos actualizar el estado del pedido.", updateError);

  await recordStatusEvent({
    nextStatus,
    orderId: current.id,
    previousStatus: current.status,
    source: "backoffice",
    supabase,
    userId
  });

  const notification = await sendOrderStatusUpdateEmail({
    order,
    items: order.order_items || [],
    nextStatus,
    supabase
  });

  return {
    message: notification.sent
      ? "Estado actualizado y correo enviado al cliente."
      : notification.skipped
        ? "Estado actualizado. El pedido no tiene correo para notificar."
        : "Estado actualizado. No pudimos enviar el correo; podrás reintentar el estado cuando sea necesario.",
    notification,
    order: presentOrder(order)
  };
}

async function refundOrder({orderId, supabase, userId}) {
  const {data: current, error: currentError} = await supabase
    .from("orders")
    .select(orderSelect())
    .eq("id", orderId)
    .maybeSingle();

  if (currentError || !current) throw statusError(404, "No encontramos el pedido.", currentError);

  const refunded = await refundMercadoPagoPayment({orderId: current.id});
  await recordStatusEvent({
    nextStatus: "refunded",
    orderId: current.id,
    previousStatus: current.status,
    source: "backoffice_refund",
    supabase,
    userId
  });

  const orderForEmail = {
    ...current,
    delivery_status: "cancelled",
    payment_status: "refunded",
    status: "refunded"
  };
  const notification = await sendOrderStatusUpdateEmail({
    order: orderForEmail,
    items: current.order_items || [],
    nextStatus: "refunded",
    supabase
  });

  return {
    message: notification.sent
      ? "Reembolso completo solicitado y correo enviado al cliente."
      : notification.skipped
        ? "Reembolso completo solicitado. El pedido no tiene correo para notificar."
        : "Reembolso completo solicitado. No pudimos enviar el correo al cliente.",
    notification,
    order: presentOrder({
      ...orderForEmail,
      payments: (current.payments || []).map((payment) => payment.id === refunded.payment.id
        ? {...payment, status: "refunded", status_detail: "refunded_by_backoffice"}
        : payment)
    })
  };
}

function deliveryStatusFor(orderStatus, currentDeliveryStatus) {
  const statuses = {
    cancelled: "cancelled",
    delivered: "delivered",
    out_for_delivery: "out_for_delivery",
    preparing: "preparing",
    ready: "ready"
  };

  return statuses[orderStatus] || currentDeliveryStatus || "pending";
}

async function recordStatusEvent({nextStatus, orderId, previousStatus, source, supabase, userId}) {
  const {error} = await supabase.from("order_status_events").insert({
    changed_by: userId,
    next_status: nextStatus,
    order_id: orderId,
    previous_status: previousStatus,
    source
  });

  if (error) throw statusError(502, "El estado fue actualizado, pero no pudimos registrar su seguimiento.", error);
}

function presentOrder(order) {
  const customer = asRecord(order.customer_snapshot);
  const payments = Array.isArray(order.payments) ? [...order.payments] : [];
  payments.sort((left, right) => String(right.paid_at || right.created_at || "").localeCompare(String(left.paid_at || left.created_at || "")));
  const primaryPayment = payments[0] || null;
  const coreState = Array.isArray(order.core360_commerce_order_states)
    ? order.core360_commerce_order_states[0]
    : order.core360_commerce_order_states || null;

  return {
    canRefund: Boolean(
      primaryPayment?.provider === "mercado_pago"
      && primaryPayment?.provider_payment_id
      && order.payment_status === "approved"
      && !["cancelled", "refunded"].includes(order.status)
    ),
    createdAt: order.created_at || null,
    core360: coreState ? {
      commercialStatus: cleanText(coreState.commercial_status) || "unknown",
      coreOrderId: cleanText(coreState.core_order_id),
      coreOrderVersion: Number(coreState.core_order_version),
      fiscal: {
        documentType: cleanText(coreState.fiscal_document_type),
        folio: cleanText(coreState.fiscal_folio),
        status: cleanText(coreState.fiscal_status) || "unknown"
      },
      fulfillmentStatus: cleanText(coreState.fulfillment_status),
      receivedAt: coreState.received_at || null,
      sourceVersion: cleanText(coreState.source_version),
      updatedAt: coreState.updated_at || null
    } : null,
    currency: cleanText(order.currency) || "CLP",
    customer: {
      address: cleanText(customer.address),
      comuna: cleanText(customer.comuna),
      email: cleanText(customer.email).toLowerCase(),
      instructions: cleanText(customer.instructions || order.note),
      mode: cleanText(customer.mode) || "delivery",
      name: cleanText(customer.name),
      phone: cleanText(customer.phone)
    },
    deliveryStatus: cleanText(order.delivery_status) || "pending",
    deliveryFeeClp: Number(order.delivery_fee_clp || 0),
    subtotalClp: Number(order.subtotal_clp || 0),
    discountClp: Number(order.discount_clp || 0),
    id: order.id,
    items: (Array.isArray(order.order_items) ? order.order_items : []).map((item) => ({
      createdAt: item.created_at || null,
      id: item.id,
      productName: cleanText(item.product_name),
      quantity: Number(item.quantity || 0),
      totalClp: Number(item.total_clp || 0),
      unitPriceClp: Number(item.unit_price_clp || 0)
    })),
    orderedAt: order.ordered_at || order.created_at || null,
    paidAt: order.paid_at || null,
    payment: primaryPayment ? presentPayment(primaryPayment) : null,
    paymentStatus: cleanText(order.payment_status) || "pending",
    receivedAt: order.received_at || null,
    status: cleanText(order.status) || "pending_payment",
    totalClp: Number(order.total_clp || 0)
  };
}

function presentPayment(payment) {
  return {
    currency: cleanText(payment.currency) || "CLP",
    id: payment.id,
    installments: Number(payment.installments || 0) || null,
    paidAt: payment.paid_at || null,
    payerEmail: cleanText(payment.payer_email).toLowerCase(),
    paymentMethodId: cleanText(payment.payment_method_id),
    paymentTypeId: cleanText(payment.payment_type_id),
    provider: cleanText(payment.provider),
    providerMerchantOrderId: cleanText(payment.provider_merchant_order_id),
    providerPaymentId: cleanText(payment.provider_payment_id),
    providerPreferenceId: cleanText(payment.provider_preference_id),
    status: cleanText(payment.status) || "pending",
    statusDetail: cleanText(payment.status_detail),
    transactionAmountClp: Number(payment.transaction_amount_clp || 0)
  };
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
