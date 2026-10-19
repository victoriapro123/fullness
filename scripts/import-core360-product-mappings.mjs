import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";

const [receiptPath, outputPath = "runtime/fullness-core360-mappings.local"] = process.argv.slice(2);

if (!receiptPath) {
  throw new Error("Uso: node scripts/import-core360-product-mappings.mjs <products-import-result.json> [salida.local]");
}

const receipt = JSON.parse(await readFile(path.resolve(receiptPath), "utf8"));
const sourceMappings = Array.isArray(receipt?.mapping) ? receipt.mapping : [];

if (sourceMappings.length === 0) {
  throw new Error("El recibo no contiene mapeos de productos.");
}

const seenFullnessIds = new Set();
const mappings = sourceMappings.map((mapping) => {
  const sourceMenuItemId = requiredText(mapping?.fullnessMenuItemId, "fullnessMenuItemId");
  const coreItemId = requiredText(mapping?.coreItemId, "coreItemId");
  const currency = requiredText(mapping?.currency, "currency");
  const taxBps = asInteger(mapping?.taxBps, "taxBps");

  if (seenFullnessIds.has(sourceMenuItemId)) {
    throw new Error("El recibo contiene un menu_item de Fullness duplicado.");
  }
  seenFullnessIds.add(sourceMenuItemId);

  if (currency !== "CLP") throw new Error("El recibo contiene una moneda no admitida.");
  if (taxBps !== 1900) throw new Error("El recibo no confirma IVA 19% para todos los productos.");

  return {
    source_menu_item_id: sourceMenuItemId,
    core_item_id: coreItemId,
    core_sku: requiredText(mapping?.coreSku || mapping?.sku, "coreSku"),
    is_active: true,
    provenance: "core360-canonical-import-receipt",
    record_version: requiredText(mapping?.recordVersion, "recordVersion"),
    commercial_version: requiredText(mapping?.commercialVersion || mapping?.recordVersion, "commercialVersion"),
    commercial_kind: requiredText(mapping?.commercialKind, "commercialKind"),
    sku: requiredText(mapping?.sku, "sku"),
    currency,
    tax_bps: taxBps,
    gross_unit_price_minor: asPositiveInteger(mapping?.grossUnitPriceMinor, "grossUnitPriceMinor"),
    net_unit_price_minor: asInteger(mapping?.netUnitPriceMinor, "netUnitPriceMinor"),
    quantity_rounding: mapping?.quantityRounding || null,
    uom_code: requiredText(mapping?.uomCode || "unit", "uomCode"),
    availability_version: optionalText(mapping?.availabilityVersion),
    image_reference: optionalText(mapping?.imageReference)
  };
});

const resolvedOutputPath = path.resolve(outputPath);
await mkdir(path.dirname(resolvedOutputPath), {recursive: true});
await writeFile(resolvedOutputPath, `${JSON.stringify({mappings}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({mappingCount: mappings.length, outputPath: resolvedOutputPath}, null, 2));

function requiredText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`El recibo no contiene ${label}.`);
  return text;
}

function asInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`El recibo contiene ${label} inválido.`);
  }
  return number;
}

function asPositiveInteger(value, label) {
  const number = asInteger(value, label);
  if (number <= 0) throw new Error(`El recibo contiene ${label} inválido.`);
  return number;
}

function optionalText(value) {
  const text = String(value || "").trim();
  return text || null;
}
