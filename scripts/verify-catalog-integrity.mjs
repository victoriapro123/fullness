import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para validar el catálogo.");
}

const headers = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`
};

async function fetchRows(resource, select, params = {}) {
  const url = new URL(`/rest/v1/${resource}`, supabaseUrl);
  url.searchParams.set("select", select);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(payload)) {
    const detail = typeof payload?.message === "string" ? ` ${payload.message}` : "";
    throw new Error(`No fue posible leer ${resource}.${detail}`);
  }

  return payload;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeIds(value) {
  return Array.isArray(value)
    ? value.map(cleanText).filter(Boolean)
    : [];
}

function sameIds(left, right) {
  const normalizedLeft = [...new Set(normalizeIds(left))].sort();
  const normalizedRight = [...new Set(normalizeIds(right))].sort();
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function mealIdentity(meal) {
  return cleanText(meal?.libraryMealId || meal?.library_meal_id || meal?.id);
}

function labelFor(product) {
  return cleanText(product?.name || product?.slug || product?.id) || "Producto sin nombre";
}

const [products, links, weeklyNutritionTags, monthlyNutritionTags] = await Promise.all([
  fetchRows(
    "menu_items",
    "id,name,slug,product_type,plan_frequency,price_clp,description,photo_url,secondary_photo_url,included_items,is_active",
    { is_active: "eq.true", order: "display_order.asc,name.asc" }
  ),
  fetchRows(
    "monthly_plan_weeks",
    "monthly_plan_id,weekly_plan_id,week_position",
    { order: "monthly_plan_id.asc,week_position.asc" }
  ),
  fetchRows("weekly_plan_nutrition_tags", "weekly_plan_id,tag_ids"),
  fetchRows("monthly_plan_nutrition_tags", "monthly_plan_id,tag_ids")
]);

const issues = [];
if (products.length === 0) issues.push("No existen productos activos.");

const activeWeeklyPlans = products.filter((product) => (
  product.product_type === "plan" && product.plan_frequency === "weekly"
));
const activeMonthlyPlans = products.filter((product) => (
  product.product_type === "plan" && product.plan_frequency === "monthly"
));
const productById = new Map(products.map((product) => [product.id, product]));
const linksByMonthlyPlan = new Map();
const weeklyTagsByPlan = new Map(weeklyNutritionTags.map((row) => [row.weekly_plan_id, normalizeIds(row.tag_ids)]));
const monthlyTagsByPlan = new Map(monthlyNutritionTags.map((row) => [row.monthly_plan_id, normalizeIds(row.tag_ids)]));

for (const link of links) {
  const monthlyPlanId = cleanText(link.monthly_plan_id);
  const weeklyPlanId = cleanText(link.weekly_plan_id);
  const weekPosition = Number(link.week_position);
  if (!monthlyPlanId || !weeklyPlanId || !Number.isInteger(weekPosition)) continue;

  const monthlyLinks = linksByMonthlyPlan.get(monthlyPlanId) || [];
  monthlyLinks.push({ weeklyPlanId, weekPosition });
  linksByMonthlyPlan.set(monthlyPlanId, monthlyLinks);
}

for (const monthlyLinks of linksByMonthlyPlan.values()) {
  monthlyLinks.sort((left, right) => left.weekPosition - right.weekPosition);
}

if (activeWeeklyPlans.length === 0) {
  issues.push("Falta al menos un plan semanal activo y administrable.");
}

for (const product of products) {
  const label = labelFor(product);
  if (!product.name || !product.slug || !product.description) issues.push(`${label}: faltan datos editoriales obligatorios.`);
  if (!Number.isInteger(Number(product.price_clp)) || Number(product.price_clp) < 0) issues.push(`${label}: precio CLP inválido.`);
  if (!product.photo_url || product.photo_url.includes("fullness-food-crop.jpeg")) issues.push(`${label}: requiere una foto principal real.`);

  if (product.product_type !== "plan") continue;

  if (!["weekly", "monthly"].includes(product.plan_frequency)) {
    issues.push(`${label}: frecuencia de plan inválida.`);
    continue;
  }

  if (product.plan_frequency === "weekly") {
    if (!Array.isArray(product.included_items) || product.included_items.length !== 6) {
      issues.push(`${label}: un plan semanal visible debe contener exactamente seis mealpreps.`);
      continue;
    }

    const mealIds = product.included_items.map(mealIdentity);
    if (mealIds.some((id) => !id) || new Set(mealIds).size !== 6) {
      issues.push(`${label}: los seis mealpreps semanales deben ser identificables y distintos.`);
    }

    for (const meal of product.included_items) {
      if (!meal?.name || !meal?.photoUrl) {
        issues.push(`${label}: cada mealprep semanal requiere nombre y foto principal.`);
        break;
      }
    }

    const inheritedTagIds = weeklyTagsByPlan.get(product.id);
    if (!inheritedTagIds) {
      issues.push(`${label}: faltan los tags nutricionales heredados desde sus mealpreps.`);
    } else if (new Set(inheritedTagIds).size !== inheritedTagIds.length) {
      issues.push(`${label}: repite tags nutricionales heredados.`);
    }
  }

  if (product.plan_frequency === "monthly") {
    if (!Array.isArray(product.included_items) || product.included_items.length !== 0) {
      issues.push(`${label}: un plan mensual no debe guardar mealpreps directos.`);
    }

    const monthlyLinks = linksByMonthlyPlan.get(product.id) || [];
    const linkedWeekIds = monthlyLinks.map((link) => link.weeklyPlanId);
    const weekPositions = monthlyLinks.map((link) => link.weekPosition);
    if (monthlyLinks.length !== 4) {
      issues.push(`${label}: debe vincular exactamente cuatro planes semanales.`);
      continue;
    }
    if (new Set(linkedWeekIds).size !== 4 || !sameIds(weekPositions, [1, 2, 3, 4])) {
      issues.push(`${label}: sus cuatro semanas deben ser únicas y ocupar las posiciones 1 a 4.`);
    }

    for (const link of monthlyLinks) {
      const weeklyPlan = productById.get(link.weeklyPlanId);
      if (!weeklyPlan || weeklyPlan.product_type !== "plan" || weeklyPlan.plan_frequency !== "weekly") {
        issues.push(`${label}: la semana ${link.weekPosition} no apunta a un plan semanal visible.`);
      }
    }

    const expectedTagIds = monthlyLinks.flatMap((link) => weeklyTagsByPlan.get(link.weeklyPlanId) || []);
    const inheritedTagIds = monthlyTagsByPlan.get(product.id);
    if (!inheritedTagIds) {
      issues.push(`${label}: faltan los tags nutricionales heredados desde sus semanas.`);
    } else if (!sameIds(inheritedTagIds, expectedTagIds)) {
      issues.push(`${label}: sus tags nutricionales no coinciden con la unión única de sus semanas.`);
    }
  }
}

if (issues.length > 0) {
  console.error("Catálogo no apto para publicación:\n- " + issues.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(
    `Catálogo apto para publicación: ${products.length} productos activos, ${activeWeeklyPlans.length} planes semanales y ${activeMonthlyPlans.length} planes mensuales estructurados.`
  );
}
