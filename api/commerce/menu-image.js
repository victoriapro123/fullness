import {createClient} from "@supabase/supabase-js";
import {isCore360CommerceMediaProxyEnabled, readCore360ProductImageBytes} from "../../server/core360-commerce-adapter.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_CONTENT_TYPES = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);

export function createMenuImageHandler({
  createSupabaseClient = createClient,
  env = process.env,
  isMediaProxyEnabled = () => isCore360CommerceMediaProxyEnabled(env),
  readImage = (input) => readCore360ProductImageBytes({...input, env})
} = {}) {
  return async function handler(request, response) {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return response.status(405).end();
    }
    if (!isMediaProxyEnabled()) return response.status(404).end();

    const menuItemId = text(request.query?.id);
    if (!UUID.test(menuItemId)) return response.status(404).end();

    const supabaseUrl = text(env.VITE_SUPABASE_URL || env.SUPABASE_URL);
    const serviceRole = text(env.SUPABASE_SERVICE_ROLE_KEY);
    if (!supabaseUrl || !serviceRole) return response.status(503).end();

    let editorialUrl = "";
    try {
      const supabase = createSupabaseClient(supabaseUrl, serviceRole, {
        auth: {autoRefreshToken: false, persistSession: false}
      });
      const {data: menuItem, error: menuError} = await supabase
        .from("menu_items")
        .select("id,photo_url")
        .eq("id", menuItemId)
        .eq("is_active", true)
        .maybeSingle();
      if (menuError || !menuItem?.id) return response.status(404).end();
      editorialUrl = safeEditorialImageUrl(menuItem.photo_url);

      const {data: mapping, error} = await supabase
        .from("core360_product_mappings")
        .select("core_item_id,image_reference,image_version")
        .eq("source_menu_item_id", menuItemId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return response.status(404).end();
      if (!text(mapping?.core_item_id) || !text(mapping?.image_reference)) {
        return respondWithEditorialFallback(response, editorialUrl);
      }

      const image = await readImage({
        imageVersionId: text(mapping.image_reference),
        productId: text(mapping.core_item_id)
      });
      const contentType = text(image?.contentType).toLowerCase();
      if (!IMAGE_CONTENT_TYPES.has(contentType) || !image?.bytes?.byteLength) {
        return respondWithEditorialFallback(response, editorialUrl);
      }

      response.status(200);
      response.setHeader("Cache-Control", "public, max-age=300");
      if (text(mapping.image_version)) response.setHeader("ETag", `\"fullness-menu-${menuItemId}-${text(mapping.image_version)}\"`);
      response.setHeader("Content-Type", contentType);
      response.end(Buffer.from(image.bytes));
    } catch (error) {
      if (error?.statusCode === 404) return respondWithEditorialFallback(response, editorialUrl);
      console.error("Core360 menu image proxy failed:", text(error?.code || error?.message));
      response.status(404).end();
    }
  };
}

export default createMenuImageHandler();

function respondWithEditorialFallback(response, editorialUrl) {
  if (!editorialUrl) return response.status(404).end();
  response.status(302);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Location", editorialUrl);
  response.end();
}

function safeEditorialImageUrl(value) {
  const candidate = text(value);
  if (!candidate) return "";

  try {
    const base = "https://fullnesslab.invalid";
    const parsed = new URL(candidate, base);
    if (!['http:', 'https:'].includes(parsed.protocol)) return "";
    return parsed.origin === base ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  } catch {
    return "";
  }
}

function text(value) {
  return String(value ?? "").trim();
}
