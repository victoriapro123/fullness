import {createTestCheckoutSession} from "../../server/mercadopago-checkout.mjs";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "GET,POST,OPTIONS");
    res.end();
    return;
  }
  if (!["POST","GET"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET,POST,OPTIONS");
    sendJson(res, 405, {error: {code: "METHOD_NOT_ALLOWED", message: "Método no permitido."}});
    return;
  }

  try {
    const data = await createTestCheckoutSession({request:req,inspectOnly:req.method==='GET'});
    sendJson(res, req.method==='GET'?200:201, {data});
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
