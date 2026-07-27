import { getSupabaseClient, isSupabaseConfigured } from "./supabase.js";

const MENU_ITEM_COLUMNS = "*";
const SHOP_SETTINGS_COLUMNS = "*";
const SHOP_SETTINGS_ID = "main";
const MEAL_LIBRARY_COLUMNS = "*";
const CUSTOMER_SUBSCRIPTION_COLUMNS = "*, plan:menu_items(id,name,plan_frequency)";

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
        libraryMealId: cleanText(item?.libraryMealId || item?.library_meal_id),
        name,
        tag: cleanText(item?.tag),
        description,
        photoUrl: cleanText(item?.photoUrl || item?.photo_url),
        photoStoragePath: cleanText(item?.photoStoragePath || item?.photo_storage_path),
        secondaryPhotoUrl: cleanText(item?.secondaryPhotoUrl || item?.secondary_photo_url),
        secondaryPhotoStoragePath: cleanText(item?.secondaryPhotoStoragePath || item?.secondary_photo_storage_path),
        benefitTags: normalizeTextList(item?.benefitTags || item?.benefit_tags),
        ingredients: normalizeTextList(item?.ingredients),
        allergens: normalizeTextList(item?.allergens)
      };
    })
    .filter(Boolean);
}

function normalizeComparisonRows(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;

      const label = cleanText(row.label || row.name);
      const subscription = cleanText(row.subscription || row.subscriptionValue || row.plan);
      const weekly = cleanText(row.weekly || row.weeklyValue || row.single || row.purchase);

      if (!label && !subscription && !weekly) return null;

      return { label, subscription, weekly };
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

export function mapMealLibraryItem(row) {
  return {
    id: row.id,
    name: row.name || "",
    tag: row.tag || "",
    description: row.description || "",
    photoUrl: row.photo_url || "",
    photoStoragePath: row.photo_storage_path || "",
    secondaryPhotoUrl: row.secondary_photo_url || "",
    secondaryPhotoStoragePath: row.secondary_photo_storage_path || "",
    benefitTags: Array.isArray(row.benefit_tags) ? row.benefit_tags : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at || ""
  };
}

export function mapCustomerSubscription(row) {
  return {
    id: row.id,
    customerName: row.customer_name || "",
    customerEmail: row.customer_email || "",
    frequency: row.frequency || "weekly",
    status: row.status || "active",
    nextDeliveryAt: row.next_delivery_at || "",
    planName: row.plan?.name || "Plan sin asignar",
    planFrequency: row.plan?.plan_frequency || "",
    startsAt: row.starts_at || ""
  };
}

export function mapShopSettings(row) {
  return {
    id: row.id || SHOP_SETTINGS_ID,
    heroEyebrow: row.hero_eyebrow || "",
    heroTitle: row.hero_title || "",
    heroBody: row.hero_body || "",
    heroImageUrl: row.hero_image_url || "",
    heroImageStoragePath: row.hero_image_storage_path || "",
    heroPrimaryLabel: row.hero_primary_label || "",
    heroSecondaryLabel: row.hero_secondary_label || "",
    heroMetrics: Array.isArray(row.hero_metrics) ? row.hero_metrics : [],
    subscriptionEyebrow: row.subscription_eyebrow || "",
    subscriptionTitle: row.subscription_title || "",
    subscriptionBody: row.subscription_body || "",
    subscriptionCtaLabel: row.subscription_cta_label || "",
    subscriptionBenefits: Array.isArray(row.subscription_benefits) ? row.subscription_benefits : [],
    subscriptionComparison: normalizeComparisonRows(row.subscription_comparison),
    updatedAt: row.updated_at || ""
  };
}

export function buildMenuItemPayload(input) {
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

export function buildMealLibraryPayload(input) {
  return {
    name: cleanText(input.name),
    tag: nullableText(input.tag),
    description: cleanText(input.description),
    photo_url: nullableText(input.photoUrl || input.photo_url),
    photo_storage_path: nullableText(input.photoStoragePath || input.photo_storage_path),
    secondary_photo_url: nullableText(input.secondaryPhotoUrl || input.secondary_photo_url),
    secondary_photo_storage_path: nullableText(input.secondaryPhotoStoragePath || input.secondary_photo_storage_path),
    benefit_tags: normalizeTextList(input.benefitTags || input.benefit_tags),
    ingredients: normalizeTextList(input.ingredients),
    nutrition_description: null,
    nutrition_highlights: [],
    nutrition_facts: {},
    allergens: normalizeTextList(input.allergens),
    is_active: Boolean(input.isActive ?? input.is_active)
  };
}

function buildShopSettingsPayload(input) {
  return {
    id: SHOP_SETTINGS_ID,
    hero_eyebrow: nullableText(input.heroEyebrow || input.hero_eyebrow),
    hero_title: nullableText(input.heroTitle || input.hero_title),
    hero_body: nullableText(input.heroBody || input.hero_body),
    hero_image_url: nullableText(input.heroImageUrl || input.hero_image_url),
    hero_image_storage_path: nullableText(input.heroImageStoragePath || input.hero_image_storage_path),
    hero_primary_label: nullableText(input.heroPrimaryLabel || input.hero_primary_label),
    hero_secondary_label: nullableText(input.heroSecondaryLabel || input.hero_secondary_label),
    hero_metrics: normalizeTextList(input.heroMetrics || input.hero_metrics),
    subscription_eyebrow: nullableText(input.subscriptionEyebrow || input.subscription_eyebrow),
    subscription_title: nullableText(input.subscriptionTitle || input.subscription_title),
    subscription_body: nullableText(input.subscriptionBody || input.subscription_body),
    subscription_cta_label: nullableText(input.subscriptionCtaLabel || input.subscription_cta_label),
    subscription_benefits: normalizeTextList(input.subscriptionBenefits || input.subscription_benefits),
    subscription_comparison: normalizeComparisonRows(input.subscriptionComparison || input.subscription_comparison)
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

export async function listMealLibraryItems() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return { data: [], error: null, configured: false };

  const { data, error } = await supabase
    .from("meal_library_items")
    .select(MEAL_LIBRARY_COLUMNS)
    .order("name", { ascending: true });

  if (error) return { data: [], error, configured: true };

  return { data: (data || []).map(mapMealLibraryItem), error: null, configured: true };
}

export async function saveMealLibraryItem(input) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const payload = buildMealLibraryPayload(input);
  const query = input.id
    ? supabase.from("meal_library_items").update(payload).eq("id", input.id)
    : supabase.from("meal_library_items").insert(payload);
  const { data, error } = await query.select(MEAL_LIBRARY_COLUMNS).single();

  if (error) return { data: null, error, configured: true };

  return { data: mapMealLibraryItem(data), error: null, configured: true };
}

export async function deleteMealLibraryItem(id) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const { error } = await supabase.from("meal_library_items").delete().eq("id", id);
  return { data: error ? null : id, error, configured: true };
}

export async function listAdminCustomerSubscriptions() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return { data: [], error: null, configured: false };

  const { data, error } = await supabase
    .from("customer_subscriptions")
    .select(CUSTOMER_SUBSCRIPTION_COLUMNS)
    .order("next_delivery_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return { data: [], error, configured: true };

  return { data: (data || []).map(mapCustomerSubscription), error: null, configured: true };
}

export async function getShopSettings() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const { data, error } = await supabase
    .from("ecommerce_shop_settings")
    .select(SHOP_SETTINGS_COLUMNS)
    .eq("id", SHOP_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    return { data: null, error, configured: true };
  }

  return { data: data ? mapShopSettings(data) : null, error: null, configured: true };
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

export async function saveShopSettings(input) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const payload = buildShopSettingsPayload(input);
  const { data, error } = await supabase
    .from("ecommerce_shop_settings")
    .upsert(payload, { onConflict: "id" })
    .select(SHOP_SETTINGS_COLUMNS)
    .single();

  if (error) {
    return { data: null, error, configured: true };
  }

  return { data: mapShopSettings(data), error: null, configured: true };
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
