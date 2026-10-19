import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {loadEnvFile} from "../server/r2-media.mjs";
import {
  readCore360Catalog,
  readCore360Stock,
  verifyCore360ProductMappings
} from "../server/core360-commerce-adapter.mjs";

const catalogPath = path.resolve("runtime/fullness-core360-catalog.local");
const mappingsPath = path.resolve("runtime/fullness-core360-mappings.local");
const reportPath = path.resolve("runtime/fullness-core360-read-report.local");

await Promise.all([
  loadEnvFile(new URL("../.env.local", import.meta.url)),
  loadEnvFile(new URL("../.core360-commerce.local", import.meta.url))
]);

const fullnessCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
const mappings = await readOptionalMappings(mappingsPath);
const coreProducts = await collectPages(readCore360Catalog);
const coreStock = await collectPages(readCore360Stock);
const mappingVerification = verifyCore360ProductMappings({
  coreProducts,
  fullnessProducts: fullnessCatalog.products,
  mappings
});

const report = {
  checkedAt: new Date().toISOString(),
  core360: {
    catalogProducts: coreProducts.length,
    stockRows: coreStock.length
  },
  fullness: {
    catalogSourceFetchedAt: fullnessCatalog.source?.fetchedAt || null,
    activeProducts: fullnessCatalog.products.length
  },
  mappingVerification,
  note: "Lectura únicamente: no crea pedidos, no reserva/descuenta stock, no emite DTE y no activa el outbox."
};

await mkdir(path.dirname(reportPath), {recursive: true});
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  catalogProducts: coreProducts.length,
  mappingSummary: mappingVerification.summary,
  reportPath,
  stockRows: coreStock.length
}, null, 2));

async function collectPages(read) {
  const rows = [];
  let cursor = "";
  do {
    const result = await read({query: {cursor, limit: 100}});
    if (!result.enabled) throw new Error("La lectura Core360 está deshabilitada.");
    rows.push(...(Array.isArray(result.rows) ? result.rows : []));
    cursor = String(result.page?.nextCursor || "");
  } while (cursor);
  return rows;
}

async function readOptionalMappings(filePath) {
  try {
    const raw = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(raw) ? raw : Array.isArray(raw.mappings) ? raw.mappings : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}
