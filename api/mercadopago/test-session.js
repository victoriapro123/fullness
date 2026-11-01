import {createTestCheckoutSession, readJsonBody} from "../../server/mercadopago-checkout.mjs";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "POST,OPTIONS");
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST,OPTIONS");
    sendJson(res, 405, {error: {code: "METHOD_NOT_ALLOWED", message: "Método no permitido."}});
    return;
  }

  try {
    const body = await readJsonBody(req);
    const data = await createTestCheckoutSession({accessCode: body?.accessCode});
    sendJson(res, 201, {data});
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: {
        code: error.code || "TEST_CHECKOUT_ERROR",
        message: error.message || "No pudimos habilitar la compra de prueba."
      }
    });
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
