import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const apply = process.argv.includes("--apply");
const protectedKeys = new Set([
  "id", "sku", "slug", "benefitId", "benefit_id", "libraryMealId", "library_meal_id",
  "photoUrl", "photo_url", "photoStoragePath", "photo_storage_path",
  "secondaryPhotoUrl", "secondary_photo_url", "secondaryPhotoStoragePath", "secondary_photo_storage_path",
  "iconUrl", "icon_url", "iconStoragePath", "icon_storage_path"
]);

function readEnv() {
  const values = {};
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
  }
  return values;
}

function preserveCase(value, lower, title, upper) {
  if (value === value.toUpperCase()) return upper;
  if (value[0] === value[0].toUpperCase()) return title;
  return lower;
}

function normalizeText(value) {
  return value
    .replace(/\bpure\b/gi, (match) => preserveCase(match, "puré", "Puré", "PURÉ"))
    .replace(/\benergetico\b/gi, (match) => preserveCase(match, "energético", "Energético", "ENERGÉTICO"))
    .replace(/\bproteinas\b/gi, (match) => preserveCase(match, "proteínas", "Proteínas", "PROTEÍNAS"))
    .replace(/\bomega\s+3\b/gi, (match) => preserveCase(match, "omega-3", "Omega-3", "OMEGA-3"))
    .replace(/\bquinoa\s+lentejas\b/gi, (match) => preserveCase(match, "quinoa y lentejas", "Quinoa y lentejas", "QUINOA Y LENTEJAS"))
    .replace(/\bSin ultraprocesados\b/gi, (match) => preserveCase(match, "sin ultra procesados", "Sin ultra procesados", "SIN ULTRA PROCESADOS"))
    .replace(/Crispy quinoa Salad/g, "Crispy Quinoa Salad")
    .replace(/Rico en vegetales\s*·\s*Fuente/gi, "Rico en vegetales · Fuente")
    .replace(/\bsous vide\s{2,}al\b/gi, "sous vide al");
}

function normalizeValue(value, key = "") {
  if (protectedKeys.has(key)) return value;
  if (typeof value === "string") return normalizeText(value);
  if (Array.isArray(value)) return value.map((entry) => normalizeValue(entry));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, normalizeValue(childValue, childKey)]));
}

function changed(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

async function updateRows(supabase, table, fields) {
  const { data, error } = await supabase.from(table).select(["id", ...fields].join(","));
  if (error) throw error;

  const updates = (data || []).flatMap((row) => {
    const payload = Object.fromEntries(fields.map((field) => [field, normalizeValue(row[field], field)]));
    return changed(Object.fromEntries(fields.map((field) => [field, row[field]])), payload)
      ? [{ id: row.id, payload }]
      : [];
  });

  for (const update of updates) {
    if (apply) {
      const { error: updateError } = await supabase.from(table).update(update.payload).eq("id", update.id);
      if (updateError) throw updateError;
    }
  }
  return updates.length;
}

const env = readEnv();
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing Supabase service credentials in .env.local.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const counts = {
  menu_items: await updateRows(supabase, "menu_items", [
    "name", "tag", "description", "nutrition_description", "nutrition_highlights", "benefit_tags",
    "recipe_summary", "recipe_steps", "allergens", "included_items", "benefit_assignments"
  ]),
  meal_library_items: await updateRows(supabase, "meal_library_items", [
    "name", "tag", "description", "nutrition_description", "nutrition_highlights", "benefit_tags",
    "rethermalization_instructions", "allergens", "benefit_assignments"
  ]),
  benefit_definitions: await updateRows(supabase, "benefit_definitions", ["name", "default_description"])
};

console.log(`${apply ? "Applied" : "Preview"} typography corrections: ${JSON.stringify(counts)}`);
