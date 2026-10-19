import {createClient} from "@supabase/supabase-js";
import {isCore360CommercePollingEnabled} from "../../server/core360-commerce-adapter.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({error: "method_not_allowed"});
  }

  if (!isCore360CommercePollingEnabled()) {
    return sendJson(response, 200, {data: {enabled: false, products: []}});
  }

  const supabaseUrl = text(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRole = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRole) {
    return sendJson(response, 503, {error: "catalog_projection_unavailable"});
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: {autoRefreshToken: false, persistSession: false}
    });
    const [projectionResult, mappingResult, menuResult] = await Promise.all([
      supabase
        .from("core360_catalog_projection")
        .select("source_menu_item_id,gross_minor,currency,product_version,price_available,updated_at")
        .eq("price_available", true)
        .eq("currency", "CLP"),
      supabase
        .from("core360_product_mappings")
        .select("source_menu_item_id")
        .eq("is_active", true),
      supabase
        .from("menu_items")
        .select("id")
        .eq("is_active", true)
    ]);
    if (projectionResult.error || mappingResult.error || menuResult.error) {
      throw projectionResult.error || mappingResult.error || menuResult.error;
    }

    const activeMappingIds = new Set((mappingResult.data || []).map((row) => text(row.source_menu_item_id)).filter(Boolean));
    const activeMenuItemIds = new Set((menuResult.data || []).map((row) => text(row.id)).filter(Boolean));

    const products = (projectionResult.data || []).map((row) => ({
      commercialVersion: text(row.product_version),
      id: text(row.source_menu_item_id),
      priceClp: safePrice(row.gross_minor),
      updatedAt: row.updated_at || null
    })).filter((row) => row.id && activeMappingIds.has(row.id) && activeMenuItemIds.has(row.id) && row.commercialVersion && row.priceClp);
    return sendJson(response, 200, {data: {enabled: true, products}});
  } catch (error) {
    console.error("Core360 public catalogue projection failed:", text(error?.code || error?.message));
    return sendJson(response, 503, {error: "catalog_projection_unavailable"});
  }
}

function safePrice(value) {
  const price = Math.round(Number(value));
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

function sendJson(response, status, payload) {
  response.status(status);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function text(value) {
  return String(value ?? "").trim();
}
