import {
  finishWebhookEvent,
  readJsonBody,
  recordWebhookEvent,
  syncMercadoPagoPayment,
  validateWebhookSignature
} from "../../server/mercadopago-checkout.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end();
    return;
  }

  let event;

  try {
    const payload = await readJsonBody(req);
    const dataId = queryValue(req.query?.["data.id"]) || payload?.data?.id;

    validateWebhookSignature({
      dataId,
      requestId: req.headers["x-request-id"],
      signature: req.headers["x-signature"]
    });

    event = await recordWebhookEvent(payload);
    if (!event.alreadyProcessed && payload?.type === "payment" && dataId) {
      await syncMercadoPagoPayment(dataId);
    }
    if (!event.alreadyProcessed) await finishWebhookEvent(event.id);

    res.statusCode = 200;
    res.end("ok");
  } catch (error) {
    if (event?.id) await finishWebhookEvent(event.id, error);
    res.statusCode = error.statusCode || 500;
    res.end(error.message || "Webhook error");
  }
}

function queryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
