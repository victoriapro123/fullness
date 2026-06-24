import { getSupabaseClient, isSupabaseConfigured } from "./supabase.js";

const MENU_ITEM_COLUMNS = "*";

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

function normalizeProductType(value) {
  return value === "plan" ? "plan" : "family";
}

function normalizePlanFrequency(value, productType) {
  const frequency = cleanText(value);
  if (productType !== "plan") return null;
  return frequency === "monthly" ? "monthly" : "weekly";
}

function normalizeNutritionFacts(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeJsonObject(parsed);
    } catch {
      return {};
    }
  }

  return normalizeJsonObject(value);
}

function normalizeIncludedItems(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const name = cleanText(item?.name);
      const description = cleanText(item?.description);

      if (!name && !description && !item?.photoUrl && !item?.photo_url) return null;

      return {
        id: cleanText(item?.id) || `meal-${index + 1}`,
        name,
        tag: cleanText(item?.tag),
        description,
        photoUrl: cleanText(item?.photoUrl || item?.photo_url),
        photoStoragePath: cleanText(item?.photoStoragePath || item?.photo_storage_path),
        secondaryPhotoUrl: cleanText(item?.secondaryPhotoUrl || item?.secondary_photo_url),
        secondaryPhotoStoragePath: cleanText(item?.secondaryPhotoStoragePath || item?.secondary_photo_storage_path),
        benefitTags: normalizeTextList(item?.benefitTags || item?.benefit_tags),
        ingredients: normalizeTextList(item?.ingredients),
        nutritionDescription: cleanText(item?.nutritionDescription || item?.nutrition_description),
        nutritionHighlights: normalizeTextList(item?.nutritionHighlights || item?.nutrition_highlights),
        nutritionFacts: normalizeNutritionFacts(item?.nutritionFacts || item?.nutrition_facts),
        allergens: normalizeTextList(item?.allergens)
      };
    })
    .filter(Boolean);
}

export function mapMenuItem(row) {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku || "",
    name: row.name,
    productType: row.product_type || "family",
    planFrequency: row.plan_frequency || "",
    tag: row.tag || "",
    price: Number(row.price_clp || 0),
    description: row.description || "",
    image: row.photo_url || "",
    photoUrl: row.photo_url || "",
    photoStoragePath: row.photo_storage_path || "",
    secondaryImage: row.secondary_photo_url || "",
    secondaryPhotoUrl: row.secondary_photo_url || "",
    secondaryPhotoStoragePath: row.secondary_photo_storage_path || "",
    benefitTags: Array.isArray(row.benefit_tags) ? row.benefit_tags : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    nutritionDescription: row.nutrition_description || "",
    nutritionHighlights: Array.isArray(row.nutrition_highlights) ? row.nutrition_highlights : [],
    nutritionDetail: row.nutrition_detail || "",
    nutritionFacts: row.nutrition_facts || {},
    recipeSummary: row.recipe_summary || "",
    recipeSteps: Array.isArray(row.recipe_steps) ? row.recipe_steps : [],
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    includedItems: Array.isArray(row.included_items) ? row.included_items : [],
    servingLabel: row.serving_label || "",
    purchaseLabel: row.purchase_label || "",
    displayOrder: Number(row.display_order || 0),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at || ""
  };
}

function buildMenuItemPayload(input) {
  const productType = normalizeProductType(input.productType || input.product_type);

  return {
    slug: cleanText(input.slug),
    sku: nullableText(input.sku),
    name: cleanText(input.name),
    product_type: productType,
    plan_frequency: normalizePlanFrequency(input.planFrequency || input.plan_frequency, productType),
    tag: nullableText(input.tag),
    description: cleanText(input.description),
    photo_url: nullableText(input.photoUrl || input.photo_url),
    photo_storage_path: nullableText(input.photoStoragePath || input.photo_storage_path),
    secondary_photo_url: nullableText(input.secondaryPhotoUrl || input.secondary_photo_url),
    secondary_photo_storage_path: nullableText(input.secondaryPhotoStoragePath || input.secondary_photo_storage_path),
    price_clp: normalizePrice(input.priceClp ?? input.price_clp ?? input.price),
    currency: "CLP",
    benefit_tags: normalizeTextList(input.benefitTags || input.benefit_tags),
    ingredients: normalizeTextList(input.ingredients),
    nutrition_description: nullableText(input.nutritionDescription || input.nutrition_description),
    nutrition_highlights: normalizeTextList(input.nutritionHighlights || input.nutrition_highlights),
    nutrition_detail: nullableText(input.nutritionDetail || input.nutrition_detail),
    nutrition_facts: normalizeJsonObject(input.nutritionFacts || input.nutrition_facts),
    recipe_summary: nullableText(input.recipeSummary || input.recipe_summary),
    recipe_steps: normalizeTextList(input.recipeSteps || input.recipe_steps),
    allergens: normalizeTextList(input.allergens),
    included_items: normalizeIncludedItems(input.includedItems || input.included_items),
    serving_label: nullableText(input.servingLabel || input.serving_label),
    purchase_label: nullableText(input.purchaseLabel || input.purchase_label),
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

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (sessionError || !token) {
    return {
      data: null,
      error: sessionError || new Error("Debes iniciar sesión como administrador para subir imágenes."),
      configured: true
    };
  }

  const base64 = await fileToBase64(file);
  const response = await fetch("/api/upload-media", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      contentType: file.type || "image/jpeg",
      dataBase64: base64,
      fileName: file.name,
      folder: "images/meal-preps"
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      data: null,
      error: new Error(payload.error || "No pudimos subir la imagen a R2."),
      configured: true
    };
  }

  return {
    data: {
      photoUrl: payload.publicUrl,
      photoStoragePath: payload.key
    },
    error: null,
    configured: true
  };
}

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}
