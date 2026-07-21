import {assertBackofficeRequest, cleanText, statusError} from "../../server/backoffice-access.mjs";
import {readJsonBody} from "../../server/mercadopago-checkout.mjs";

const DEFAULT_SITE_URL = "https://fullnesslab.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    sendJson(res, 405, {error: "Método no permitido."});
    return;
  }

  try {
    const body = await readJsonBody(req);
    const email = cleanText(body.email).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw statusError(422, "Ingresa un correo válido.");
    }

    const {supabase} = await assertBackofficeRequest(req);
    const {error} = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl()
    });

    if (error) {
      throw statusError(502, "No pudimos solicitar el correo de recuperación.", error);
    }

    sendJson(res, 200, {
      data: {
        message: "Si el correo está registrado, recibirá un enlace para restablecer su contraseña."
      }
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {error: error.message || "No pudimos enviar la recuperación."});
  }
}

function siteUrl() {
  return (cleanText(process.env.SITE_URL) || cleanText(process.env.CHECKOUT_SITE_URL) || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
