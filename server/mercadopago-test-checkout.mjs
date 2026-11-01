import {createHash, randomBytes, timingSafeEqual} from "node:crypto";

const TEST_SESSION_TTL_MS = 10 * 60 * 1000;
const TEST_SESSION_TABLE = "checkout_test_sessions";
const TEST_SESSION_TOKEN_PATTERN = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{32,128})$/i;

/**
 * Mercado Pago TEST is selected only after the server validates a dedicated
 * code. The browser receives an opaque, short-lived, one-time authorization;
 * it never receives a provider credential or a client-controlled mode flag.
 */
export async function authorizeTestCheckoutSession({accessCode, env = process.env, fetchImpl = fetch, supabase} = {}) {
  if (!supabase?.from) throw checkoutTestError(503, "TEST_SESSION_STORAGE_UNAVAILABLE", "No pudimos habilitar la compra de prueba.");
  assertTestCheckoutAccessCode(accessCode, env);
  const profile = await resolveMercadoPagoProfile({env, fetchImpl, mode: "test", verifyTestIdentity: true});
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + TEST_SESSION_TTL_MS);
  const token = `${cryptoSafeUuid()}.${randomBytes(32).toString("base64url")}`;
  const {data, error} = await supabase
    .from(TEST_SESSION_TABLE)
    .insert({
      authorization_digest: digest(token),
      authorized_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      merchant_id: profile.merchantId,
      verification: {
        merchantId: profile.merchantId,
        profile: "mercado_pago_test",
        siteId: profile.siteId
      }
    })
    .select("id,expires_at")
    .single();

  if (error || !data?.id) {
    throw checkoutTestError(502, "TEST_SESSION_CREATE_FAILED", "No pudimos registrar la sesión de prueba.", error);
  }

  return {
    expiresAt: data.expires_at,
    testSessionToken: token
  };
}

export async function consumeTestCheckoutSession({env = process.env, sessionToken, supabase} = {}) {
  if (!supabase?.from) throw checkoutTestError(503, "TEST_SESSION_STORAGE_UNAVAILABLE", "No pudimos validar la compra de prueba.");
  const parsed = parseSessionToken(sessionToken);
  const now = new Date().toISOString();
  const {data, error} = await supabase
    .from(TEST_SESSION_TABLE)
    .update({consumed_at: now})
    .eq("id", parsed.id)
    .eq("authorization_digest", digest(sessionToken))
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select("id,merchant_id,expires_at")
    .maybeSingle();

  if (error) throw checkoutTestError(502, "TEST_SESSION_CONSUME_FAILED", "No pudimos validar la compra de prueba.", error);
  if (!data?.id) throw checkoutTestError(403, "TEST_SESSION_INVALID", "El acceso de prueba venció o ya fue utilizado. Ingresa el código nuevamente.");

  return {
    checkoutMode: "test",
    sessionId: data.id,
    merchantId: cleanText(data.merchant_id)
  };
}

export async function attachTestSessionOrder({orderId, preferenceId = "", sessionId, supabase} = {}) {
  const id = cleanText(sessionId);
  const cleanOrderId = cleanText(orderId);
  if (!id || !cleanOrderId || !supabase?.from) {
    throw checkoutTestError(502, "TEST_SESSION_TRACE_FAILED", "No pudimos enlazar la compra de prueba.");
  }
  const update = {order_id: cleanOrderId};
  if (cleanText(preferenceId)) update.preference_id = cleanText(preferenceId);
  const {error} = await supabase.from(TEST_SESSION_TABLE).update(update).eq("id", id);
  if (error) throw checkoutTestError(502, "TEST_SESSION_TRACE_FAILED", "No pudimos enlazar la compra de prueba.", error);
}

export async function attachTestSessionPayment({orderId, paymentId, supabase} = {}) {
  const cleanOrderId = cleanText(orderId);
  const cleanPaymentId = cleanText(paymentId);
  if (!cleanOrderId || !cleanPaymentId || !supabase?.from) return;
  const {error} = await supabase
    .from(TEST_SESSION_TABLE)
    .update({provider_payment_id: cleanPaymentId})
    .eq("order_id", cleanOrderId);
  if (error) throw checkoutTestError(502, "TEST_SESSION_PAYMENT_TRACE_FAILED", "No pudimos registrar el pago de prueba.", error);
}

export async function resolveMercadoPagoProfile({env = process.env, fetchImpl = fetch, mode = "live", verifyTestIdentity = false} = {}) {
  if (mode === "test") {
    const accessToken = cleanText(env.MERCADOPAGO_TEST_ACCESS_TOKEN);
    const publicKey = cleanText(env.MERCADOPAGO_TEST_PUBLIC_KEY);
    const merchantId = cleanText(env.MERCADOPAGO_TEST_USER_ID);
    const webhookSecret = cleanText(env.MERCADOPAGO_TEST_WEBHOOK_SECRET);
    if (!accessToken || !publicKey || !merchantId || !webhookSecret) {
      throw checkoutTestError(503, "TEST_PROFILE_NOT_CONFIGURED", "La compra de prueba no está configurada completamente.");
    }

    const profile = {accessToken, merchantId, mode: "test", publicKey, webhookSecret};
    if (!verifyTestIdentity) return profile;

    let response;
    try {
      response = await fetchImpl("https://api.mercadopago.com/users/me", {
        headers: {Accept: "application/json", Authorization: `Bearer ${accessToken}`},
        redirect: "error",
        signal: AbortSignal.timeout(8_000)
      });
    } catch (error) {
      throw checkoutTestError(503, "TEST_PROFILE_VERIFICATION_FAILED", "No pudimos verificar el perfil TEST de Mercado Pago.", error);
    }
    const merchant = await response.json().catch(() => ({}));
    const validIdentity = response.ok
      && cleanText(merchant?.id) === merchantId
      && Array.isArray(merchant?.tags)
      && merchant.tags.includes("test_user")
      && cleanText(merchant?.site_id) === "MLC";
    if (!validIdentity) {
      throw checkoutTestError(503, "TEST_PROFILE_IDENTITY_MISMATCH", "El perfil TEST de Mercado Pago no pudo verificarse.");
    }
    return {...profile, siteId: "MLC"};
  }

  const accessToken = cleanText(env.MERCADOPAGO_PRODUCTION_ACCESS_TOKEN || env.MERCADOPAGO_ACCESS_TOKEN);
  const webhookSecret = cleanText(env.MERCADOPAGO_WEBHOOK_SECRET);
  if (!accessToken) throw checkoutTestError(500, "LIVE_PROFILE_NOT_CONFIGURED", "Falta configurar Mercado Pago.");
  return {accessToken, mode: "live", webhookSecret};
}

export function checkoutMode(value) {
  return cleanText(value).toLowerCase() === "test" ? "test" : "live";
}

function assertTestCheckoutAccessCode(value, env) {
  const expected = cleanText(env.FULLNESS_TEST_CHECKOUT_ACCESS_CODE);
  const received = cleanText(value);
  if (!expected || !received || !constantTimeEqual(expected, received)) {
    throw checkoutTestError(403, "TEST_ACCESS_DENIED", "El código de prueba no es válido.");
  }
}

function parseSessionToken(value) {
  const token = cleanText(value);
  const match = token.match(TEST_SESSION_TOKEN_PATTERN);
  if (!match) throw checkoutTestError(403, "TEST_SESSION_INVALID", "El acceso de prueba no es válido.");
  return {id: match[1]};
}

function constantTimeEqual(left, right) {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function digest(value) {
  return createHash("sha256").update(cleanText(value), "utf8").digest("hex");
}

function cryptoSafeUuid() {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function checkoutTestError(statusCode, code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}
