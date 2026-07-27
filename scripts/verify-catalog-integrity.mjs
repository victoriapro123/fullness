import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para validar el catálogo.");
}

const response = await fetch(
  `${supabaseUrl}/rest/v1/menu_items?select=id,name,slug,product_type,plan_frequency,price_clp,description,photo_url,secondary_photo_url,included_items,is_active&is_active=eq.true&order=display_order.asc`,
  {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`
    }
  }
);

const products = await response.json();
if (!response.ok || !Array.isArray(products)) {
  throw new Error(`No fue posible leer el catálogo activo: ${JSON.stringify(products)}`);
}

const issues = [];
if (products.length === 0) issues.push("No existen productos activos.");

for (const frequency of ["weekly", "monthly"]) {
  if (!products.some((product) => product.product_type === "plan" && product.plan_frequency === frequency)) {
    issues.push(`Falta un plan ${frequency === "weekly" ? "semanal" : "mensual"} activo y administrable.`);
  }
}

for (const product of products) {
  const label = `${product.name || product.slug || product.id}`;
  if (!product.name || !product.slug || !product.description) issues.push(`${label}: faltan datos editoriales obligatorios.`);
  if (!Number.isInteger(Number(product.price_clp)) || Number(product.price_clp) < 0) issues.push(`${label}: precio CLP inválido.`);
  if (!product.photo_url || product.photo_url.includes("fullness-food-crop.jpeg")) issues.push(`${label}: requiere una foto principal real.`);
  if (!product.secondary_photo_url) issues.push(`${label}: requiere una segunda foto para el hover.`);

  if (product.product_type === "plan") {
    if (!Array.isArray(product.included_items) || product.included_items.length === 0) {
      issues.push(`${label}: requiere al menos un meal prep incluido.`);
      continue;
    }

    for (const meal of product.included_items) {
      if (!meal?.name || !meal?.photoUrl || !meal?.secondaryPhotoUrl) {
        issues.push(`${label}: cada meal prep incluido requiere nombre y ambas fotos.`);
        break;
      }
    }
  }
}

if (issues.length > 0) {
  console.error("Catálogo no apto para publicación:\n- " + issues.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(`Catálogo apto para publicación: ${products.length} productos activos y editables.`);
}
