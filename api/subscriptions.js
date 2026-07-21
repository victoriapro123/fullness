import {registerEmailSubscriber} from "../server/transactional-email.mjs";
import {readJsonBody} from "../server/mercadopago-checkout.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    sendJson(res, 405, {error: {code: "METHOD_NOT_ALLOWED", message: "Método no permitido."}});
    return;
  }

  try {
    const body = await readJsonBody(req);
    const data = await registerEmailSubscriber(body);
    sendJson(res, 201, {data: {emailSent: data.emailSent}});
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: {code: "SUBSCRIPTION_ERROR", message: error.message || "No pudimos registrar tu suscripción."}
    });
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
