import { getSupabaseClient, isSupabaseConfigured } from "./supabase.js";

const MENU_ITEM_COLUMNS = [
  "id",
  "slug",
  "sku",
  "name",
  "tag",
  "description",
  "photo_url",
  "photo_storage_path",
  "price_clp",
  "currency",
  "ingredients",
  "nutrition_description",
  "nutrition_highlights",
  "nutrition_detail",
  "nutrition_facts",
  "recipe_summary",
  "recipe_steps",
  "allergens",
  "display_order",
  "is_active",
  "updated_at"
].join(",");

function cleanText(value) {
  return String(value || "").trim();
}

function nullableText(value) {
  const text = cleanText(value);
  return text || null;
}

function normalizeTextList(value) {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]/)
    .map(cleanText)
    .filter(Boolean);
}

function normalizeJsonObject(value) {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};

  return value;
}

function normalizePrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function normalizeDisplayOrder(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

export function mapMenuItem(row) {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku || "",
    name: row.name,
    tag: row.tag || "",
    price: Number(row.price_clp || 0),
    description: row.description || "",
    image: row.photo_url || "",
    photoUrl: row.photo_url || "",
    photoStoragePath: row.photo_storage_path || "",
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    nutritionDescription: row.nutrition_description || "",
    nutritionHighlights: Array.isArray(row.nutrition_highlights) ? row.nutrition_highlights : [],
    nutritionDetail: row.nutrition_detail || "",
    nutritionFacts: row.nutrition_facts || {},
    recipeSummary: row.recipe_summary || "",
    recipeSteps: Array.isArray(row.recipe_steps) ? row.recipe_steps : [],
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    displayOrder: Number(row.display_order || 0),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at || ""
  };
}

function buildMenuItemPayload(input) {
  return {
    slug: cleanText(input.slug),
    sku: nullableText(input.sku),
    name: cleanText(input.name),
    tag: nullableText(input.tag),
    description: cleanText(input.description),
    photo_url: nullableText(input.photoUrl || input.photo_url),
    photo_storage_path: nullableText(input.photoStoragePath || input.photo_storage_path),
    price_clp: normalizePrice(input.priceClp ?? input.price_clp ?? input.price),
    currency: "CLP",
    ingredients: normalizeTextList(input.ingredients),
    nutrition_description: nullableText(input.nutritionDescription || input.nutrition_description),
    nutrition_highlights: normalizeTextList(input.nutritionHighlights || input.nutrition_highlights),
    nutrition_detail: nullableText(input.nutritionDetail || input.nutrition_detail),
    nutrition_facts: normalizeJsonObject(input.nutritionFacts || input.nutrition_facts),
    recipe_summary: nullableText(input.recipeSummary || input.recipe_summary),
    recipe_steps: normalizeTextList(input.recipeSteps || input.recipe_steps),
    allergens: normalizeTextList(input.allergens),
    is_active: Boolean(input.isActive ?? input.is_active),
    display_order: normalizeDisplayOrder(input.displayOrder ?? input.display_order)
  };
}

function unavailableResult() {
  return { data: null, error: null, configured: false };
}

async function getConfiguredSupabase() {
  if (!isSupabaseConfigured) return null;

  return getSupabaseClient();
}

export async function listActiveMenuItems() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) {
    return { data: [], error: null, configured: false };
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_COLUMNS)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error, configured: true };
  }

  return {
    data: (data || []).map(mapMenuItem),
    error: null,
    configured: true
  };
}

export async function listAdminMenuItems() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) {
    return { data: [], error: null, configured: false };
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error, configured: true };
  }

  return {
    data: (data || []).map(mapMenuItem),
    error: null,
    configured: true
  };
}

export async function saveMenuItem(input) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const payload = buildMenuItemPayload(input);
  const query = input.id
    ? supabase.from("menu_items").update(payload).eq("id", input.id)
    : supabase.from("menu_items").insert(payload);

  const { data, error } = await query.select(MENU_ITEM_COLUMNS).single();

  if (error) {
    return { data: null, error, configured: true };
  }

  return { data: mapMenuItem(data), error: null, configured: true };
}

export async function deleteMenuItem(id) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  return { data: error ? null : id, error, configured: true };
}

export async function uploadMenuPhoto(file) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const randomId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const storagePath = `${new Date().toISOString().slice(0, 7)}/${randomId}.${extension}`;

  const { error } = await supabase.storage
    .from("menu-photos")
    .upload(storagePath, file, {
      cacheControl: "31536000",
      contentType: file.type || undefined,
      upsert: false
    });

  if (error) {
    return { data: null, error, configured: true };
  }

  const { data } = supabase.storage.from("menu-photos").getPublicUrl(storagePath);

  return {
    data: {
      photoUrl: data.publicUrl,
      photoStoragePath: storagePath
    },
    error: null,
    configured: true
  };
}
