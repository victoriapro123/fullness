import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {loadEnvFile} from "../server/r2-media.mjs";
import {readCore360Catalog} from "../server/core360-commerce-adapter.mjs";

const outputPath = path.resolve(process.argv[2] || "runtime/fullness-core360-price-conversion-candidate.local");
const catalogPath = path.resolve("runtime/fullness-core360-catalog.local");
const mappingsPath = path.resolve("runtime/fullness-core360-mappings.local");

await Promise.all([
  loadEnvFile(new URL("../.env.local", import.meta.url)),
  loadEnvFile(new URL("../.core360-commerce.local", import.meta.url))
]);

const [fullnessCatalog, mappingFile] = await Promise.all([
  readJson(catalogPath, "el catálogo Fullness privado"),
  readJson(mappingsPath, "los mapeos Core360 privados")
]);
const fullnessProducts = Array.isArray(fullnessCatalog?.products) ? fullnessCatalog.products : [];
const mappings = Array.isArray(mappingFile?.mappings) ? mappingFile.mappings : Array.isArray(mappingFile) ? mappingFile : [];
const coreProducts = await collectCoreProducts();

if (fullnessProducts.length !== 9 || mappings.length !== 9) {
  throw new Error("La propuesta requiere exactamente 9 artículos activos y 9 mapeos explícitos.");
}

const fullnessById = indexBy(fullnessProducts, "id", "Fullness");
const coreById = indexBy(coreProducts, "id", "Core360");
const rows = mappings
  .map((mapping) => buildCandidateRow({
    core: coreById.get(requiredText(mapping?.core_item_id, "core_item_id")),
    fullness: fullnessById.get(requiredText(mapping?.source_menu_item_id, "source_menu_item_id")),
    mapping
  }))
  .sort((left, right) => left.fullness.sku.localeCompare(right.fullness.sku));

const candidate = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  purpose: "dry-run: revisión de conversión comercial Fullness -> Core360; no aplica cambios ni movimientos",
  guardrails: {
    adjustedStock: false,
    createdOrders: false,
    emittedFiscalDocuments: false,
    changedCore360: false,
    source: "Solo GET catálogo Core360, catálogo Fullness y mapeos UUID explícitos"
  },
  assumptions: {
    currency: "CLP",
    ivaBps: 1900,
    ivaStatus: "confirmado por Fullness para los 9 precios web",
    stockCondition: "Core360 reporta cero stock vigente; esta propuesta no lo ajusta ni interpreta disponibilidad."
  },
  rows,
  summary: {
    mappedArticles: rows.length,
    proposedGrossMinorTotal: rows.reduce((total, row) => total + row.proposal.grossMinor, 0),
    unchangedCore360: true,
    zeroStockConditionPreserved: true
  }
};
const serialized = `${JSON.stringify(candidate, null, 2)}\n`;
await mkdir(path.dirname(outputPath), {recursive: true});
await writeFile(outputPath, serialized, "utf8");

console.log(JSON.stringify({
  artifactPath: outputPath,
  mappedArticles: rows.length,
  sha256: createHash("sha256").update(serialized).digest("hex"),
  zeroStockConditionPreserved: true
}, null, 2));

async function collectCoreProducts() {
  const rows = [];
  let cursor = "";
  do {
    const result = await readCore360Catalog({query: {cursor, limit: 100}});
    if (!result.enabled) throw new Error("La lectura Core360 está deshabilitada; no se generó la propuesta.");
    rows.push(...(Array.isArray(result.rows) ? result.rows : []));
    cursor = String(result?.page?.nextCursor || "");
  } while (cursor);
  return rows;
}

function buildCandidateRow({core, fullness, mapping}) {
  if (!core) throw new Error("Falta el artículo Core360 de un mapeo explícito; no se infirió coincidencia.");
  if (!fullness) throw new Error("Falta el artículo Fullness de un mapeo explícito; no se infirió coincidencia.");
  const webGrossMinor = positiveInteger(fullness?.price?.amountMinor, "precio web bruto");
  const currentAmountMinor = positiveInteger(firstPresent(core, ["unitGrossMinor", "grossUnitPriceMinor", "grossMinor", "price_minor"]), "importe Core360 actual");
  const currentBaseNetMinor = nonNegativeInteger(firstPresent(core?.priceBasis, ["netMinor", "unitNetMinor", "netAmountMinor", "unitNetAmountMinor"]) ?? firstPresent(core, ["unitNetMinor", "netUnitPriceMinor", "netMinor", "base_price_minor"]), "base neta Core360 actual");
  const masterVersion = requiredText(firstPresent(core, ["commercialVersion", "recordVersion", "version"]), "versión maestra Core360");
  const mappedVersion = requiredText(mapping?.commercial_version ?? mapping?.record_version, "versión comercial del mapeo");
  return {
    fullness: {
      menuItemId: fullness.id,
      name: fullness.name,
      sku: fullness.sku,
      webGrossMinor,
      webPriceIncludesIvaBps: 1900
    },
    core360: {
      itemId: core.id,
      masterVersion,
      sku: core.sku,
      uom: core.unit,
      current: {
        amountActualMinor: currentAmountMinor,
        baseActualNetMinor: currentBaseNetMinor,
        currency: core.currency || core.base_currency || null,
        priceBasis: core.priceBasis || core.price_basis || null
      }
    },
    proposal: {
      currency: "CLP",
      grossMinor: webGrossMinor,
      grossDeltaMinor: webGrossMinor - currentAmountMinor,
      ivaBps: 1900,
      status: "dry-run-only",
      validation: {
        mappingVersionMatchesMaster: masterVersion === mappedVersion,
        skuMatchesExplicitMapping: String(core?.sku || "") === String(mapping?.core_sku || mapping?.sku || ""),
        uomMatchesExplicitMapping: String(core?.unit || "") === String(mapping?.uom_code || "")
      }
    }
  };
}

function firstPresent(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function indexBy(values, field, label) {
  const result = new Map();
  for (const value of values) {
    const id = requiredText(value?.[field], `${label}.${field}`);
    if (result.has(id)) throw new Error(`${label} tiene una clave repetida.`);
    result.set(id, value);
  }
  return result;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    throw new Error(`No pudimos leer ${label}.`);
  }
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Falta ${label}.`);
  return text;
}

function nonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} no es un entero válido.`);
  return parsed;
}

function positiveInteger(value, label) {
  const parsed = nonNegativeInteger(value, label);
  if (parsed <= 0) throw new Error(`${label} debe ser mayor que cero.`);
  return parsed;
}
