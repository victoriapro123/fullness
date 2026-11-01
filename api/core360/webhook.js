import {createClient} from "@supabase/supabase-js";
import {processCore360Webhook} from "../../server/core360-webhook.mjs";
import {loadEnvFile} from "../../server/r2-media.mjs";

const MAX_BODY_BYTES = 64 * 1024;
const localEnvReady = Promise.all([
  loadEnvFile(new URL("../../.env.local", import.meta.url)),
  loadEnvFile(new URL("../../.core360-commerce.local", import.meta.url))
]);

export const config = {api: {bodyParser: false}};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({error: "method_not_allowed"});
  }

  try {
    await localEnvReady;
    const rawBody = await readRawBody(request);
    const supabase = getSupabaseAdmin();
    const result = await processCore360Webhook({
      headers: request.headers,
      rawBody,
      supabase
    });
    return response.status(200).json({eventId: result.eventId, received: true, replayed: result.replayed});
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    return response.status(statusCode).json({error: cleanText(error?.code) || "core360_webhook_failed"});
  }
}

function getSupabaseAdmin() {
  const url = cleanText(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) {
    const error = new Error("Supabase no está configurado.");
    error.statusCode = 503;
    error.code = "core360_webhook_not_configured";
    throw error;
  }
  return createClient(url, serviceRoleKey, {auth: {autoRefreshToken: false, persistSession: false}});
}

async function readRawBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("El webhook excede el tamaño permitido.");
      error.statusCode = 413;
      error.code = "core360_webhook_too_large";
      throw error;
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function cleanText(value) {
  return String(value ?? "").trim();
}
