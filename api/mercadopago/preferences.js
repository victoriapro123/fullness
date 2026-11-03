import {
  createCheckoutPreference,
  readJsonBody
} from "../../server/mercadopago-checkout.mjs";
import {ECOMMERCE_MAINTENANCE, ECOMMERCE_MAINTENANCE_MESSAGE} from '../../src/lib/ecommerce-maintenance.js';

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
    sendJson(res, 405, {error: {code: "METHOD_NOT_ALLOWED", message: "Metodo no permitido."}});
    return;
  }

  if (ECOMMERCE_MAINTENANCE) {
    res.setHeader('Retry-After', '3600');
    sendJson(res, 503, {error:{code:'SHOP_UNDER_CONSTRUCTION',message:ECOMMERCE_MAINTENANCE_MESSAGE}});
    return;
  }

  try {
    const body = await readJsonBody(req);
    const data = await createCheckoutPreference({
      cart: body.cart,
      fulfillment: body.fulfillment,
      expectedAmount: body.expectedAmount,
      request: req,
      testSessionToken: body.testSessionToken
    });

    sendJson(res, 201, {data});
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: {
        code: "CHECKOUT_ERROR",
        message: error.message || "No pudimos iniciar el pago."
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
