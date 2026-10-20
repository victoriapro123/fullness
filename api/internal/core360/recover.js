import {createClient} from "@supabase/supabase-js";
import {createHash} from "node:crypto";
import {recoverCore360CommerceDelivery} from "../../../server/core360-commerce-adapter.mjs";

export default async function handler(request, response) {
  const isCron = request.method === "GET";
  if (!isCron && request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({error: "method_not_allowed"});
  }
  const secret = text(isCron ? process.env.CRON_SECRET : process.env.CORE360_RECOVERY_TOKEN);
  if (!secret) {
    return response.status(503).json({error: "recovery_not_configured"});
  }
  if (!secret || request.headers.authorization !== `Bearer ${secret}`) {
    return response.status(401).json({error: "unauthorized"});
  }
  if (isCron && request.query?.providerProbe === "mercadopago") {
    return response.status(200).json({
      configuration: runtimeConfiguration(),
      provider: await probeMercadoPagoCredential()
    });
  }

  const supabaseUrl = text(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRole = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRole) {
    return response.status(503).json({error: "recovery_not_configured"});
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: {autoRefreshToken: false, persistSession: false}
    });
    const body = isCron ? {} : request.body || {};
    const limit = positiveInteger(body.limit, 50);
    const result = await recoverCore360CommerceDelivery({
      cursor: validCursor(body.cursor),
      limit,
      supabase
    });
    return response.status(200).json({
      configuration: runtimeConfiguration(),
      catalog: {
        failed: result.catalog?.failed === true,
        refreshed: result.catalog?.catalogRows || 0,
        unavailable: result.catalog?.unavailable || 0
      },
      delivered: result.delivered?.length || 0,
      enabled: result.enabled,
      failed: result.failed?.length || 0,
      nextCursor: result.reconciled?.nextCursor || null,
      orderStates: {
        failed: result.orderStates?.failed?.length || 0,
        persisted: result.orderStates?.persisted || 0,
        scanned: result.orderStates?.scanned || 0,
        skipped: result.orderStates?.skipped || false
      },
      images: {
        failed: result.images?.failed === true,
        refreshed: result.images?.refreshed || 0,
        scanned: result.images?.scanned || 0
      },
      queued: result.reconciled?.queued?.length || 0,
      scanned: result.scanned || 0,
      skipped: result.skipped || false,
      wakeupFailures: result.wakeupFailures?.length || 0
    });
  } catch (error) {
    console.error("Core360 private recovery failed:", text(error?.code || error?.message));
    return response.status(502).json({error: "core360_recovery_failed"});
  }
}

// Returned only after the private recovery request has authenticated. These
// allowlisted facts prove the deployment configuration without exposing keys.
export function runtimeConfiguration(env = process.env) {
  const enabled = (key) => text(env[key]).toLowerCase() === "true";
  const rawCutover = text(env.CORE360_COMMERCE_SYNC_FROM);
  const cutover = rawCutover ? new Date(rawCutover) : null;
  const commitSha = text(env.VERCEL_GIT_COMMIT_SHA);
  let notificationUrl = null;
  try {
    const site = new URL(text(env.CHECKOUT_SITE_URL));
    if (site.protocol === "https:" && !site.username && !site.password
      && site.pathname === "/" && !site.search && !site.hash) {
      notificationUrl = new URL("/api/mercadopago/webhook", site.origin).href;
    }
  } catch {}

  return {
    commitSha: /^[0-9a-f]{40}$/i.test(commitSha) ? commitSha : null,
    customerMode: text(env.CORE360_COMMERCE_CUSTOMER_MODE) || "anonymous",
    fiscalIntent: text(env.CORE360_FISCAL_INTENT) || "pending",
    paymentExportPolicy: "live_only",
    flags: Object.fromEntries([
      "CORE360_COMMERCE_READ_ENABLED",
      "CORE360_COMMERCE_POLL_ENABLED",
      "CORE360_COMMERCE_PREVIEW_ENABLED",
      "CORE360_COMMERCE_MEDIA_PROXY_ENABLED",
      "CORE360_COMMERCE_MEDIA_WRITE_ENABLED",
      "CORE360_COMMERCE_SYNC_ENABLED",
      "CORE360_COMMERCE_DELIVERY_ENABLED"
    ].map((key) => [key, enabled(key)])),
    mercadoPago: {
      accessTokenConfigured: Boolean(text(env.MERCADOPAGO_ACCESS_TOKEN)),
      accessTokenKind: text(env.MERCADOPAGO_ACCESS_TOKEN).startsWith("TEST-")
        ? "test"
        : text(env.MERCADOPAGO_ACCESS_TOKEN).startsWith("APP_USR-") ? "production" : "unknown",
      clientTestMode: enabled("VITE_CHECKOUT_TEST_MODE"),
      notificationUrl,
      testMode: enabled("MERCADOPAGO_TEST_MODE"),
      webhookSecretConfigured: Boolean(text(env.MERCADOPAGO_WEBHOOK_SECRET))
    },
    syncFrom: cutover && !Number.isNaN(cutover.getTime()) ? cutover.toISOString() : null
  };
}

export async function probeMercadoPagoCredential({env = process.env, fetchImpl = fetch} = {}) {
  const token = text(env.MERCADOPAGO_ACCESS_TOKEN);
  if (!token) return {configured: false, status: null, verified: false};
  try {
    const result = await fetchImpl("https://api.mercadopago.com/users/me", {
      headers: {Authorization: `Bearer ${token}`, Accept: "application/json"},
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
    const merchant = await result.json().catch(() => ({}));
    return {
      configured: true,
      merchantIdSha256: result.ok && merchant?.id
        ? createHash("sha256").update(String(merchant.id)).digest("hex") : null,
      status: result.status,
      verified: result.ok && Boolean(merchant?.id)
    };
  } catch {
    return {configured: true, status: null, verified: false};
  }
}

function validCursor(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && text(value.orderId) && text(value.paidAt)
    ? {orderId: text(value.orderId), paidAt: text(value.paidAt)}
    : null;
}

function positiveInteger(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) return fallback;
  return parsed;
}

function text(value) {
  return String(value ?? "").trim();
}
