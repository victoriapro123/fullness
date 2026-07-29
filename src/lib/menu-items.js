import { getSupabaseClient, isSupabaseConfigured } from "./supabase.js";
import { benefitPresets, tagPresets } from "./catalog-parameter-presets.js";

const MENU_ITEM_COLUMNS = "*";
const SHOP_SETTINGS_COLUMNS = "*";
const SHOP_SETTINGS_ID = "main";
const MEAL_LIBRARY_COLUMNS = "*";
const BENEFIT_DEFINITION_COLUMNS = "*";
const TAG_DEFINITION_COLUMNS = "*";
const CUSTOMER_SUBSCRIPTION_COLUMNS = "*, plan:menu_items(id,name,plan_frequency)";

function cleanText(value) {
  return String(value || "").trim();
}

function createStableDishSku(value) {
  const token = cleanText(value)
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase();

  return token ? `PL-${token}` : "";
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

function slugifyParameter(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function mapBenefitDefinition(row) {
  return {
    id: row.id,
    slug: row.slug || "",
    name: row.name || "",
    iconUrl: row.icon_url || "",
    iconStoragePath: row.icon_storage_path || "",
    defaultDescription: row.default_description || "",
    displayOrder: Number(row.display_order || 0),
    isActive: Boolean(row.is_active)
  };
}

function mapTagDefinition(row) {
  return {
    id: row.id,
    slug: row.slug || "",
    name: row.name || "",
    displayOrder: Number(row.display_order || 0),
    isActive: Boolean(row.is_active)
  };
}

function createCatalogContext(benefits = benefitPresets, tags = tagPresets) {
  const benefitList = benefits.length ? benefits : benefitPresets;
  const tagList = tags.length ? tags : tagPresets;

  return {
    benefits: benefitList,
    tags: tagList,
    benefitById: new Map(benefitList.map((item) => [item.id, item])),
    benefitBySlug: new Map(benefitList.map((item) => [item.slug, item])),
    benefitByName: new Map(benefitList.map((item) => [cleanText(item.name).toLocaleLowerCase("es"), item])),
    tagById: new Map(tagList.map((item) => [item.id, item])),
    tagBySlug: new Map(tagList.map((item) => [item.slug, item])),
    tagByName: new Map(tagList.map((item) => [cleanText(item.name).toLocaleLowerCase("es"), item]))
  };
}

function normalizeBenefitAssignments(value, legacyNames = [], context = createCatalogContext()) {
  const rawAssignments = Array.isArray(value) ? value : [];
  const candidates = [
    ...rawAssignments,
    ...normalizeTextList(legacyNames).map((name) => ({ name }))
  ];
  const seen = new Set();

  return candidates
    .map((raw) => {
      const item = typeof raw === "string" ? { name: raw } : raw || {};
      const rawId = cleanText(item.benefitId || item.benefit_id || item.id);
      const rawSlug = cleanText(item.slug) || slugifyParameter(item.name);
      const rawName = cleanText(item.name);
      const definition =
        context.benefitById.get(rawId) ||
        context.benefitBySlug.get(rawSlug) ||
        context.benefitByName.get(rawName.toLocaleLowerCase("es"));
      const benefitId = definition?.id || rawId;
      const name = definition?.name || rawName;
      const key = benefitId || slugifyParameter(name);

      if (!name || !key || seen.has(key)) return null;
      seen.add(key);

      return {
        benefitId,
        slug: definition?.slug || rawSlug,
        name,
        iconUrl: definition?.iconUrl || cleanText(item.iconUrl || item.icon_url),
        iconStoragePath: definition?.iconStoragePath || cleanText(item.iconStoragePath || item.icon_storage_path),
        defaultDescription: definition?.defaultDescription || cleanText(item.defaultDescription || item.default_description),
        explanation: cleanText(item.explanation || item.description)
      };
    })
    .filter(Boolean);
}

function normalizeTagAssignments(tagIds, legacyNames = [], context = createCatalogContext()) {
  const directTags = Array.isArray(tagIds)
    ? tagIds.map((item) => typeof item === "object" && item !== null ? item : { id: item })
    : [];
  const candidates = [
    ...directTags,
    ...normalizeTextList(legacyNames).map((name) => ({ name }))
  ];
  const seen = new Set();

  return candidates
    .map((raw) => {
      const rawId = cleanText(raw.id || raw.tagId || raw.tag_id);
      const rawName = cleanText(raw.name);
      const rawSlug = cleanText(raw.slug) || slugifyParameter(rawName);
      const definition =
        context.tagById.get(rawId) ||
        context.tagBySlug.get(rawSlug) ||
        context.tagByName.get(rawName.toLocaleLowerCase("es"));
      const id = definition?.id || rawId;
      const name = definition?.name || rawName;
      const key = id || slugifyParameter(name);

      if (!name || !key || seen.has(key)) return null;
      seen.add(key);

      return {
        id,
        slug: definition?.slug || rawSlug,
        name
      };
    })
    .filter(Boolean);
}

function serializeBenefitAssignments(value) {
  return normalizeBenefitAssignments(value).map((item) => ({
    benefitId: item.benefitId,
    slug: item.slug,
    name: item.name,
    iconUrl: item.iconUrl,
    iconStoragePath: item.iconStoragePath,
    defaultDescription: item.defaultDescription,
    explanation: item.explanation
  }));
}

function aggregateBenefits(items) {
  const aggregated = new Map();

  items.forEach((item) => {
    (item?.benefits || normalizeBenefitAssignments(item?.benefitAssignments, item?.benefitTags)).forEach((benefit) => {
      const key = benefit.benefitId || benefit.slug || benefit.name;
      const current = aggregated.get(key) || { ...benefit, sources: [] };
      const explanation = cleanText(benefit.explanation);

      if (explanation || item?.name) {
        current.sources.push({
          mealName: cleanText(item?.name),
          explanation: explanation || benefit.defaultDescription
        });
      }

      aggregated.set(key, current);
    });
  });

  return [...aggregated.values()];
}

function aggregateTags(items) {
  const aggregated = new Map();

  items.forEach((item) => {
    (item?.tags || []).forEach((tag) => {
      const key = tag.id || tag.slug || tag.name;
      if (key && !aggregated.has(key)) aggregated.set(key, tag);
    });
  });

  return [...aggregated.values()];
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

function normalizeIncludedItems(value, context = createCatalogContext(), libraryById = new Map()) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const libraryMealId = cleanText(item?.libraryMealId || item?.library_meal_id);
      const libraryMeal = libraryById.get(libraryMealId);
      const source = libraryMeal ? { ...item, ...libraryMeal } : item;
      const name = cleanText(source?.name);
      const description = cleanText(source?.description);

      if (!name && !description && !source?.photoUrl && !source?.photo_url) return null;

      const benefits = normalizeBenefitAssignments(
        source?.benefitAssignments || source?.benefit_assignments || source?.benefits,
        source?.benefitTags || source?.benefit_tags,
        context
      );
      const sourceTagIds = source?.tagIds || source?.tag_ids || [];
      const sourceTags = Array.isArray(source?.tags) ? source.tags : [];
      const tags = normalizeTagAssignments(
        [...sourceTagIds, ...sourceTags],
        source?.nutritionHighlights || source?.nutrition_highlights,
        context
      );

      return {
        id: cleanText(item?.id) || `meal-${index + 1}`,
        sku: cleanText(item?.sku || source?.sku) || createStableDishSku(libraryMealId || item?.id),
        libraryMealId,
        name,
        tag: cleanText(source?.tag),
        description,
        photoUrl: cleanText(source?.photoUrl || source?.photo_url),
        photoStoragePath: cleanText(source?.photoStoragePath || source?.photo_storage_path),
        secondaryPhotoUrl: cleanText(source?.secondaryPhotoUrl || source?.secondary_photo_url),
        secondaryPhotoStoragePath: cleanText(source?.secondaryPhotoStoragePath || source?.secondary_photo_storage_path),
        benefitAssignments: benefits,
        benefits,
        benefitTags: benefits.map((benefit) => benefit.name),
        tagIds: tags.map((tag) => tag.id).filter(Boolean),
        tags,
        ingredients: normalizeTextList(source?.ingredients),
        nutritionDescription: cleanText(source?.nutritionDescription || source?.nutrition_description),
        nutritionHighlights: tags.length
          ? tags.map((tag) => tag.name)
          : normalizeTextList(source?.nutritionHighlights || source?.nutrition_highlights),
        nutritionFacts: normalizeNutritionFacts(source?.nutritionFacts || source?.nutrition_facts),
        rethermalizationInstructions: cleanText(
          source?.rethermalizationInstructions || source?.rethermalization_instructions
        ),
        allergens: normalizeTextList(source?.allergens)
      };
    })
    .filter(Boolean);
}

function serializeIncludedItems(value) {
  return normalizeIncludedItems(value).map((item) => ({
    id: item.id,
    sku: item.sku,
    libraryMealId: item.libraryMealId,
    name: item.name,
    tag: item.tag,
    description: item.description,
    photoUrl: item.photoUrl,
    photoStoragePath: item.photoStoragePath,
    secondaryPhotoUrl: item.secondaryPhotoUrl,
    secondaryPhotoStoragePath: item.secondaryPhotoStoragePath,
    benefitAssignments: serializeBenefitAssignments(item.benefitAssignments),
    benefitTags: item.benefits.map((benefit) => benefit.name),
    tagIds: item.tagIds,
    ingredients: item.ingredients,
    nutritionDescription: item.nutritionDescription,
    nutritionHighlights: item.tags.map((tag) => tag.name),
    nutritionFacts: item.nutritionFacts,
    rethermalizationInstructions: item.rethermalizationInstructions,
    allergens: item.allergens
  }));
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

export function mapMenuItem(row, context = createCatalogContext(), libraryById = new Map()) {
  const productType = row.product_type || "family";
  const includedItems = normalizeIncludedItems(row.included_items, context, libraryById);
  const directBenefits = normalizeBenefitAssignments(
    row.benefit_assignments,
    row.benefit_tags,
    context
  );
  const directTags = normalizeTagAssignments(
    row.tag_ids,
    row.nutrition_highlights,
    context
  );
  const benefits = productType === "plan" ? aggregateBenefits(includedItems) : directBenefits;
  const tags = productType === "plan" ? aggregateTags(includedItems) : directTags;

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku || "",
    name: row.name,
    productType,
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
    libraryMealId: row.library_meal_id || "",
    benefitAssignments: benefits,
    benefits,
    benefitTags: benefits.map((benefit) => benefit.name),
    tagIds: tags.map((tag) => tag.id).filter(Boolean),
    tags,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    recipeSummary: row.recipe_summary || "",
    recipeSteps: Array.isArray(row.recipe_steps) ? row.recipe_steps : [],
    rethermalizationInstructions: productType === "family" ? row.recipe_summary || "" : "",
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    nutritionDescription: productType === "family" ? row.nutrition_description || "" : "",
    nutritionHighlights: productType === "family"
      ? (tags.length ? tags.map((tag) => tag.name) : Array.isArray(row.nutrition_highlights) ? row.nutrition_highlights : [])
      : [],
    nutritionFacts: productType === "family" ? row.nutrition_facts || {} : {},
    includedItems,
    servingLabel: row.serving_label || "",
    purchaseLabel: row.purchase_label || "",
    displayOrder: Number(row.display_order || 0),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at || ""
  };
}

export function mapMealLibraryItem(row, context = createCatalogContext()) {
  const benefits = normalizeBenefitAssignments(
    row.benefit_assignments,
    row.benefit_tags,
    context
  );
  const tags = normalizeTagAssignments(
    row.tag_ids,
    row.nutrition_highlights,
    context
  );

  return {
    id: row.id,
    sku: row.sku || createStableDishSku(row.id),
    name: row.name || "",
    tag: row.tag || "",
    description: row.description || "",
    photoUrl: row.photo_url || "",
    photoStoragePath: row.photo_storage_path || "",
    secondaryPhotoUrl: row.secondary_photo_url || "",
    secondaryPhotoStoragePath: row.secondary_photo_storage_path || "",
    benefitAssignments: benefits,
    benefits,
    benefitTags: benefits.map((benefit) => benefit.name),
    tagIds: tags.map((tag) => tag.id).filter(Boolean),
    tags,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    nutritionDescription: row.nutrition_description || "",
    nutritionHighlights: tags.length
      ? tags.map((tag) => tag.name)
      : Array.isArray(row.nutrition_highlights) ? row.nutrition_highlights : [],
    nutritionFacts: row.nutrition_facts || {},
    rethermalizationInstructions: row.rethermalization_instructions || "",
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
  const includedItems = productType === "plan"
    ? normalizeIncludedItems(input.includedItems || input.included_items)
    : [];
  const directBenefits = normalizeBenefitAssignments(
    input.benefitAssignments || input.benefit_assignments,
    input.benefitTags || input.benefit_tags
  );
  const directTags = normalizeTagAssignments(
    input.tags || input.tagAssignments || input.tagIds || input.tag_ids,
    input.nutritionHighlights || input.nutrition_highlights
  );
  const benefits = directBenefits;
  const tags = directTags;
  const recipeSummary = nullableText(input.recipeSummary || input.recipe_summary);
  const rethermalizationInstructions = productType === "family" && input.rethermalizationInstructions !== undefined
    ? cleanText(input.rethermalizationInstructions)
    : recipeSummary || "";

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
    library_meal_id: productType === "family" ? nullableText(input.libraryMealId || input.library_meal_id) : null,
    ingredients: normalizeTextList(input.ingredients),
    recipe_summary: productType === "family" ? rethermalizationInstructions || null : recipeSummary,
    recipe_steps: normalizeTextList(input.recipeSteps || input.recipe_steps),
    allergens: normalizeTextList(input.allergens),
    included_items: productType === "plan" ? serializeIncludedItems(includedItems) : [],
    serving_label: nullableText(input.servingLabel || input.serving_label),
    purchase_label: nullableText(input.purchaseLabel || input.purchase_label),
    is_active: Boolean(input.isActive ?? input.is_active),
    display_order: normalizeDisplayOrder(input.displayOrder ?? input.display_order),
    ...(productType === "family"
      ? {
          benefit_assignments: serializeBenefitAssignments(benefits),
          benefit_tags: benefits.map((benefit) => benefit.name),
          tag_ids: tags.map((tag) => tag.id).filter(Boolean),
          nutrition_description: nullableText(input.nutritionDescription || input.nutrition_description),
          nutrition_highlights: tags.length
            ? tags.map((tag) => tag.name)
            : normalizeTextList(input.nutritionHighlights || input.nutrition_highlights),
          nutrition_facts: normalizeNutritionFacts(input.nutritionFacts || input.nutrition_facts)
        }
      : {})
  };
}

export function buildMealLibraryPayload(input) {
  const benefits = normalizeBenefitAssignments(
    input.benefitAssignments || input.benefit_assignments,
    input.benefitTags || input.benefit_tags
  );
  const tags = normalizeTagAssignments(
    input.tags || input.tagAssignments || input.tagIds || input.tag_ids,
    input.nutritionHighlights || input.nutrition_highlights
  );

  return {
    name: cleanText(input.name),
    tag: nullableText(input.tag),
    description: cleanText(input.description),
    photo_url: nullableText(input.photoUrl || input.photo_url),
    photo_storage_path: nullableText(input.photoStoragePath || input.photo_storage_path),
    secondary_photo_url: nullableText(input.secondaryPhotoUrl || input.secondary_photo_url),
    secondary_photo_storage_path: nullableText(input.secondaryPhotoStoragePath || input.secondary_photo_storage_path),
    benefit_assignments: serializeBenefitAssignments(benefits),
    benefit_tags: benefits.map((benefit) => benefit.name),
    tag_ids: tags.map((tag) => tag.id).filter(Boolean),
    ingredients: normalizeTextList(input.ingredients),
    nutrition_description: nullableText(input.nutritionDescription || input.nutrition_description),
    nutrition_highlights: tags.length
      ? tags.map((tag) => tag.name)
      : normalizeTextList(input.nutritionHighlights || input.nutrition_highlights),
    nutrition_facts: normalizeNutritionFacts(input.nutritionFacts || input.nutrition_facts),
    rethermalization_instructions: cleanText(
      input.rethermalizationInstructions ?? input.rethermalization_instructions
    ),
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

async function fetchCatalogContext(supabase, { includeInactive = false } = {}) {
  let benefitQuery = supabase
    .from("benefit_definitions")
    .select(BENEFIT_DEFINITION_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  let tagQuery = supabase
    .from("tag_definitions")
    .select(TAG_DEFINITION_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    benefitQuery = benefitQuery.eq("is_active", true);
    tagQuery = tagQuery.eq("is_active", true);
  }

  const [benefitResult, tagResult] = await Promise.all([benefitQuery, tagQuery]);
  const benefits = benefitResult.error
    ? benefitPresets
    : (benefitResult.data || []).map(mapBenefitDefinition);
  const tags = tagResult.error
    ? tagPresets
    : (tagResult.data || []).map(mapTagDefinition);

  return {
    context: createCatalogContext(benefits, tags),
    benefits,
    tags,
    error: benefitResult.error || tagResult.error || null
  };
}

async function fetchMealLibraryRows(supabase, { includeInactive = false } = {}) {
  let query = supabase
    .from("meal_library_items")
    .select(MEAL_LIBRARY_COLUMNS)
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function listActiveMenuItems() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) {
    return { data: [], error: null, configured: false };
  }

  const [menuResult, parameterResult, libraryResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select(MENU_ITEM_COLUMNS)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    fetchCatalogContext(supabase),
    fetchMealLibraryRows(supabase)
  ]);
  const { data, error } = menuResult;

  if (error) {
    return { data: [], error, configured: true };
  }

  const libraryItems = libraryResult.error
    ? []
    : libraryResult.data.map((row) => mapMealLibraryItem(row, parameterResult.context));
  const libraryById = new Map(libraryItems.map((item) => [item.id, item]));

  return {
    data: (data || []).map((row) => mapMenuItem(row, parameterResult.context, libraryById)),
    error: null,
    configured: true
  };
}

export async function listAdminMenuItems() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) {
    return { data: [], error: null, configured: false };
  }

  const [menuResult, parameterResult, libraryResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select(MENU_ITEM_COLUMNS)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    fetchCatalogContext(supabase, { includeInactive: true }),
    fetchMealLibraryRows(supabase, { includeInactive: true })
  ]);
  const { data, error } = menuResult;

  if (error) {
    return { data: [], error, configured: true };
  }

  const libraryItems = libraryResult.error
    ? []
    : libraryResult.data.map((row) => mapMealLibraryItem(row, parameterResult.context));
  const libraryById = new Map(libraryItems.map((item) => [item.id, item]));

  return {
    data: (data || []).map((row) => mapMenuItem(row, parameterResult.context, libraryById)),
    error: null,
    configured: true
  };
}

export async function listMealLibraryItems() {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return { data: [], error: null, configured: false };

  const [libraryResult, parameterResult] = await Promise.all([
    fetchMealLibraryRows(supabase, { includeInactive: true }),
    fetchCatalogContext(supabase, { includeInactive: true })
  ]);
  const { data, error } = libraryResult;

  if (error) return { data: [], error, configured: true };

  return {
    data: (data || []).map((row) => mapMealLibraryItem(row, parameterResult.context)),
    error: null,
    configured: true
  };
}

export async function saveMealLibraryItem(input) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const payload = buildMealLibraryPayload(input);
  let data;
  let error;
  let replacedMissingReference = false;

  if (input.id) {
    const updateResult = await supabase
      .from("meal_library_items")
      .update(payload)
      .eq("id", input.id)
      .select(MEAL_LIBRARY_COLUMNS)
      .maybeSingle();

    data = updateResult.data;
    error = updateResult.error;

    // Plans created before the library link was stabilized can point to a
    // deleted mealprep. Preserve the plan's form data by creating its library item.
    if (!error && !data) {
      const insertResult = await supabase
        .from("meal_library_items")
        .insert(payload)
        .select(MEAL_LIBRARY_COLUMNS)
        .single();

      data = insertResult.data;
      error = insertResult.error;
      replacedMissingReference = !error && Boolean(data);
    }
  } else {
    const insertResult = await supabase
      .from("meal_library_items")
      .insert(payload)
      .select(MEAL_LIBRARY_COLUMNS)
      .single();

    data = insertResult.data;
    error = insertResult.error;
  }

  if (error) return { data: null, error, configured: true };

  const parameterResult = await fetchCatalogContext(supabase, { includeInactive: true });
  return {
    data: mapMealLibraryItem(data, parameterResult.context),
    error: null,
    configured: true,
    replacedMissingReference
  };
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

export async function listCatalogParameters({ includeInactive = false } = {}) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) {
    return {
      data: { benefits: benefitPresets, tags: tagPresets },
      error: null,
      configured: false
    };
  }

  const result = await fetchCatalogContext(supabase, { includeInactive });

  return {
    data: {
      benefits: result.benefits,
      tags: result.tags
    },
    error: result.error,
    configured: true
  };
}

export async function saveBenefitDefinition(input) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const payload = {
    slug: slugifyParameter(input.slug || input.name),
    name: cleanText(input.name),
    icon_url: cleanText(input.iconUrl || input.icon_url),
    icon_storage_path: nullableText(input.iconStoragePath || input.icon_storage_path),
    default_description: cleanText(input.defaultDescription || input.default_description),
    display_order: normalizeDisplayOrder(input.displayOrder ?? input.display_order),
    is_active: Boolean(input.isActive ?? input.is_active)
  };
  const query = input.id
    ? supabase.from("benefit_definitions").update(payload).eq("id", input.id)
    : supabase.from("benefit_definitions").insert(payload);
  const { data, error } = await query.select(BENEFIT_DEFINITION_COLUMNS).single();

  return {
    data: data ? mapBenefitDefinition(data) : null,
    error,
    configured: true
  };
}

export async function deleteBenefitDefinition(id) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const { error } = await supabase.from("benefit_definitions").delete().eq("id", id);
  return { data: error ? null : id, error, configured: true };
}

export async function saveTagDefinition(input) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const payload = {
    slug: slugifyParameter(input.slug || input.name),
    name: cleanText(input.name),
    display_order: normalizeDisplayOrder(input.displayOrder ?? input.display_order),
    is_active: Boolean(input.isActive ?? input.is_active)
  };
  const query = input.id
    ? supabase.from("tag_definitions").update(payload).eq("id", input.id)
    : supabase.from("tag_definitions").insert(payload);
  const { data, error } = await query.select(TAG_DEFINITION_COLUMNS).single();

  return {
    data: data ? mapTagDefinition(data) : null,
    error,
    configured: true
  };
}

export async function deleteTagDefinition(id) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const { error } = await supabase.from("tag_definitions").delete().eq("id", id);
  return { data: error ? null : id, error, configured: true };
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

  const parameterResult = await fetchCatalogContext(supabase, { includeInactive: true });
  return {
    data: mapMenuItem(data, parameterResult.context),
    error: null,
    configured: true
  };
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

export async function uploadMenuPhoto(file, folder = "images/meal-preps") {
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

  try {
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
        folder
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
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("No pudimos preparar la imagen para subirla."),
      configured: true
    };
  }
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
