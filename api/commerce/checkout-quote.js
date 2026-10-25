import {quoteCheckout, readJsonBody} from "../../server/mercadopago-checkout.mjs";

export default async function handler(req, res) {
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
    const data = await quoteCheckout({cart: body.cart, fulfillment: body.fulfillment});
    res.statusCode = 200;
    res.end(JSON.stringify({data}));
  } catch (error) {
    res.statusCode = error.statusCode || 503;
    res.end(JSON.stringify({error: {code: error.code || "CHECKOUT_QUOTE_ERROR", message: error.message || "No pudimos validar el total del pedido."}}));
  }
}
