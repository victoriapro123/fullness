import {syncMercadoPagoPayment} from "../../server/mercadopago-checkout.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    sendJson(res, 405, {error: {code: "METHOD_NOT_ALLOWED", message: "Metodo no permitido."}});
    return;
  }

  try {
    const paymentId = queryValue(req.query?.payment_id || req.query?.collection_id);
    const orderId = queryValue(req.query?.order_id || req.query?.external_reference);
    const {customerEmail: _customerEmail, ...data} = await syncMercadoPagoPayment(paymentId, orderId);

    sendJson(res, 200, {data});
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: {
        code: "PAYMENT_SYNC_ERROR",
        message: error.message || "No pudimos confirmar el pago."
      }
    });
  }
}

function queryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
