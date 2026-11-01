import {createHmac, timingSafeEqual} from "node:crypto";
import {projectCanonicalCore360OrderState} from "./core360-commerce-adapter.mjs";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const PROVIDER = "core360";
const EVENT_TYPE = "order.updated";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_ID_PATTERN = /^[A-Za-z0-9._:@-]{8,200}$/;
const EXPECTED_PAYLOAD_KEYS = new Set([
  "type",
  "eventId",
  "clientId",
  "tenantId",
  "companyId",
  "externalOrderId",
  "coreOrderId",
  "version",
  "occurredAt"
]);

/**
 * Verifies the dedicated Core360 HMAC contract before JSON payload data is
 * trusted. The Core bearer credential is never used as a webhook secret.
 */
export function verifyCore360WebhookSignature({env = process.env, headers, now = new Date(), rawBody} = {}) {
  const secret = cleanText(env.CORE360_WEBHOOK_SECRET);
  if (secret.length < 32) {
    throw webhookError(503, "CORE360_WEBHOOK_NOT_CONFIGURED", "El webhook Core360 no está configurado.");
  }
  const body = typeof rawBody === "string" ? rawBody : "";
  if (!body) throw webhookError(400, "INVALID_CORE360_WEBHOOK", "El cuerpo del webhook Core360 está vacío.");

  const eventId = headerValue(headers, "x-core360-event-id");
  const timestamp = headerValue(headers, "x-core360-timestamp");
  const signature = headerValue(headers, "x-core360-signature");
  if (!EVENT_ID_PATTERN.test(eventId) || !/^\d{10,13}$/.test(timestamp) || !/^sha256=[0-9a-f]{64}$/i.test(signature)) {
    throw webhookError(401, "INVALID_CORE360_WEBHOOK_SIGNATURE", "La firma del webhook Core360 no es válida.");
  }

  const timestampMs = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (!Number.isSafeInteger(timestampMs) || Math.abs(new Date(now).getTime() - timestampMs) > MAX_CLOCK_SKEW_MS) {
    throw webhookError(401, "EXPIRED_CORE360_WEBHOOK", "El webhook Core360 está fuera de la ventana de tiempo permitida.");
  }

  const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex")}`;
  const receivedBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) {
    throw webhookError(401, "INVALID_CORE360_WEBHOOK_SIGNATURE", "La firma del webhook Core360 no es válida.");
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw webhookError(400, "INVALID_CORE360_WEBHOOK", "El webhook Core360 no contiene JSON válido.");
  }
  validateWebhookPayload({env, eventId, payload});
  return {eventId, payload, timestamp: new Date(timestampMs).toISOString()};
}

/**
 * Receives a signed Core notification, gets the canonical order over the
 * existing authenticated REST channel, and projects only that canonical
 * state. This handler never emits POST/PATCH/event traffic back to Core360.
 */
export async function processCore360Webhook({
  env = process.env,
  fetchImpl = fetch,
  headers,
  now = new Date(),
  rawBody,
  supabase
} = {}) {
  if (!supabase?.from || typeof supabase.rpc !== "function") {
    throw webhookError(503, "CORE360_WEBHOOK_STORAGE_UNAVAILABLE", "El webhook Core360 no puede acceder al almacenamiento.");
  }
  const notification = verifyCore360WebhookSignature({env, headers, now, rawBody});
  const payload = notification.payload;

  const {data: order, error: orderError} = await supabase
    .from("orders")
    .select("id,checkout_mode")
    .eq("id", payload.externalOrderId)
    .maybeSingle();
  if (orderError) throw webhookError(502, "CORE360_WEBHOOK_ORDER_LOOKUP_FAILED", "No pudimos localizar la orden Fullness.", orderError);
  if (!order?.id) throw webhookError(404, "CORE360_WEBHOOK_ORDER_NOT_FOUND", "La orden Core360 no existe en Fullness.");
  if (cleanText(order.checkout_mode).toLowerCase() === "test") {
    throw webhookError(409, "CORE360_WEBHOOK_TEST_ORDER", "Las compras TEST no participan en la integración operativa Core360.");
  }

  const previous = await readWebhookReceipt({eventId: notification.eventId, supabase});
  if (previous?.processed_at) {
    return {eventId: notification.eventId, received: true, replayed: true};
  }

  const receiptId = previous?.id || await createWebhookReceipt({notification, supabase});
  try {
    const canonical = await projectCanonicalCore360OrderState({
      env,
      expectedCoreOrderId: payload.coreOrderId,
      externalOrderId: payload.externalOrderId,
      fetchImpl,
      now,
      supabase
    });
    const {error: receiptError} = await supabase
      .from("payment_events")
      .update({
        processed_at: new Date(now).toISOString(),
        processing_error: null,
        raw_payload: {canonical: canonical.state, notification: payload}
      })
      .eq("id", receiptId);
    if (receiptError) throw webhookError(502, "CORE360_WEBHOOK_RECEIPT_WRITE_FAILED", "No pudimos cerrar el recibo del webhook Core360.", receiptError);
    return {eventId: notification.eventId, received: true, replayed: false};
  } catch (error) {
    await supabase
      .from("payment_events")
      .update({processing_error: cleanText(error?.code || error?.message).slice(0, 1000) || "core360_webhook_failed"})
      .eq("id", receiptId);
    throw error;
  }
}

function validateWebhookPayload({env, eventId, payload}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw webhookError(400, "INVALID_CORE360_WEBHOOK", "El payload Core360 no es un objeto válido.");
  }
  const keys = Object.keys(payload);
  if (keys.length !== EXPECTED_PAYLOAD_KEYS.size || keys.some((key) => !EXPECTED_PAYLOAD_KEYS.has(key))) {
    throw webhookError(400, "INVALID_CORE360_WEBHOOK", "El payload Core360 no coincide con el contrato firmado.");
  }
  if (cleanText(payload.type) !== EVENT_TYPE || cleanText(payload.eventId) !== eventId || !UUID_PATTERN.test(cleanText(payload.eventId))) {
    throw webhookError(400, "INVALID_CORE360_WEBHOOK", "El evento Core360 no coincide con sus encabezados.");
  }
  for (const [field, envKey] of [
    ["clientId", "CORE360_COMMERCE_CLIENT_ID"],
    ["tenantId", "CORE360_COMMERCE_TENANT_ID"],
    ["companyId", "CORE360_COMMERCE_COMPANY_ID"]
  ]) {
    const expected = cleanText(env[envKey]);
    const actual = cleanText(payload[field]);
    if (!UUID_PATTERN.test(expected) || actual !== expected) {
      throw webhookError(401, "CORE360_WEBHOOK_IDENTITY_MISMATCH", "La identidad Core360 del webhook no coincide con la configuración.");
    }
  }
  if (!UUID_PATTERN.test(cleanText(payload.externalOrderId)) || !cleanText(payload.coreOrderId) || !/^\d+$/.test(String(payload.version))) {
    throw webhookError(400, "INVALID_CORE360_WEBHOOK", "La orden o versión Core360 no es válida.");
  }
  const occurredAt = new Date(cleanText(payload.occurredAt));
  if (Number.isNaN(occurredAt.getTime())) {
    throw webhookError(400, "INVALID_CORE360_WEBHOOK", "La fecha del webhook Core360 no es válida.");
  }
}

async function readWebhookReceipt({eventId, supabase}) {
  const {data, error} = await supabase
    .from("payment_events")
    .select("id,processed_at")
    .eq("provider", PROVIDER)
    .eq("provider_event_id", eventId)
    .maybeSingle();
  if (error) throw webhookError(502, "CORE360_WEBHOOK_RECEIPT_LOOKUP_FAILED", "No pudimos revisar el recibo Core360.", error);
  return data || null;
}

async function createWebhookReceipt({notification, supabase}) {
  const {data, error} = await supabase
    .from("payment_events")
    .insert({
      action: EVENT_TYPE,
      event_type: EVENT_TYPE,
      provider: PROVIDER,
      provider_event_id: notification.eventId,
      raw_payload: {notification: notification.payload},
      resource_url: `core360:orders/${notification.payload.externalOrderId}`
    })
    .select("id")
    .single();
  if (!error && data?.id) return data.id;

  // The versioned database guard makes this branch race-safe after migration;
  // until then it also handles a sequential retry without treating it as a new
  // business event.
  if (error?.code === "23505" || /duplicate|unique/i.test(cleanText(error?.message))) {
    const existing = await readWebhookReceipt({eventId: notification.eventId, supabase});
    if (existing?.id) return existing.id;
  }
  throw webhookError(502, "CORE360_WEBHOOK_RECEIPT_WRITE_FAILED", "No pudimos registrar el recibo Core360.", error);
}

function headerValue(headers, name) {
  if (headers?.get) return cleanText(headers.get(name));
  const entries = Object.entries(headers || {});
  const match = entries.find(([key]) => String(key).toLowerCase() === name);
  return cleanText(match?.[1]);
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function webhookError(statusCode, code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}
