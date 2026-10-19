import {createClient} from "@supabase/supabase-js";
import {isCore360CommerceMediaProxyEnabled, readCore360ProductImageBytes} from "../../server/core360-commerce-adapter.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_CONTENT_TYPES = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).end();
  }
  if (!isCore360CommerceMediaProxyEnabled()) return response.status(404).end();

  const menuItemId = text(request.query?.id);
  if (!UUID.test(menuItemId)) return response.status(404).end();

  const supabaseUrl = text(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceRole = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRole) return response.status(503).end();

  try {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: {autoRefreshToken: false, persistSession: false}
    });
    const {data: mapping, error} = await supabase
      .from("core360_product_mappings")
      .select("core_item_id,image_reference,image_version")
      .eq("source_menu_item_id", menuItemId)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !text(mapping?.core_item_id) || !text(mapping?.image_reference)) return response.status(404).end();
    const {data: menuItem, error: menuError} = await supabase
      .from("menu_items")
      .select("id")
      .eq("id", menuItemId)
      .eq("is_active", true)
      .maybeSingle();
    if (menuError || !menuItem?.id) return response.status(404).end();

    const image = await readCore360ProductImageBytes({
      imageVersionId: text(mapping.image_reference),
      productId: text(mapping.core_item_id)
    });
    const contentType = text(image?.contentType).toLowerCase();
    if (!IMAGE_CONTENT_TYPES.has(contentType) || !image?.bytes?.byteLength) return response.status(404).end();

    response.status(200);
    response.setHeader("Cache-Control", "public, max-age=300");
    if (text(mapping.image_version)) response.setHeader("ETag", `\"core360-${text(mapping.image_reference)}-${text(mapping.image_version)}\"`);
    response.setHeader("Content-Type", contentType);
    response.end(Buffer.from(image.bytes));
  } catch (error) {
    console.error("Core360 menu image proxy failed:", text(error?.code || error?.message));
    response.status(404).end();
  }
}

function text(value) {
  return String(value ?? "").trim();
}
