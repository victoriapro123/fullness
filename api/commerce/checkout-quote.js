import {quoteCheckout, readJsonBody} from "../../server/mercadopago-checkout.mjs";

import {ECOMMERCE_MAINTENANCE,ECOMMERCE_MAINTENANCE_MESSAGE} from "../../src/lib/ecommerce-maintenance.js";
export default async function handler(req, res) {
  if (ECOMMERCE_MAINTENANCE && req.method === "POST") { res.statusCode=503;res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Retry-After","3600");res.end(JSON.stringify({error:{code:"SHOP_UNDER_CONSTRUCTION",message:ECOMMERCE_MAINTENANCE_MESSAGE}}));return; }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({error: {code: "METHOD_NOT_ALLOWED", message: "Método no permitido."}}));
    return;
  }
  try {
    const body = await readJsonBody(req);
    const data = await quoteCheckout({cart: body.cart, fulfillment: body.fulfillment,checkoutKey:body.checkoutKey,expectedAmount:body.expectedAmount});
    res.statusCode = 200;
    res.end(JSON.stringify({data}));
  } catch (error) {
    res.statusCode = error.statusCode || 503;
    res.end(JSON.stringify({error: {code: error.code || "CHECKOUT_QUOTE_ERROR", message: error.message || "No pudimos validar el total del pedido."}}));
  }
}
