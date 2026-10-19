import {createClient} from "@supabase/supabase-js";
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
      queued: result.reconciled?.queued?.length || 0,
      scanned: result.scanned || 0,
      skipped: result.skipped || false
    });
  } catch (error) {
    console.error("Core360 private recovery failed:", text(error?.code || error?.message));
    return response.status(502).json({error: "core360_recovery_failed"});
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
