import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildStructuredData, getSeoMetadata, SEO_PUBLIC_ROUTES} from "../src/lib/seo.js";

const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

assert.match(indexHtml, /<link rel="canonical" href="https:\/\/www\.fullnesslab\.com\/"/);
assert.match(indexHtml, /<meta name="robots" content="index, follow/);
assert.match(robots, /Sitemap: https:\/\/www\.fullnesslab\.com\/sitemap\.xml/);
assert.match(robots, /Disallow: \/api\//);

const publicMetadata = SEO_PUBLIC_ROUTES.map((pathname) => getSeoMetadata({pathname}));
assert.equal(publicMetadata.every((metadata) => metadata.isIndexable), true);
assert.equal(new Set(publicMetadata.map((metadata) => metadata.title)).size, SEO_PUBLIC_ROUTES.length);
assert.equal(new Set(publicMetadata.map((metadata) => metadata.canonical)).size, SEO_PUBLIC_ROUTES.length);

const homeSchema = buildStructuredData({metadata: publicMetadata[0]});
const organizationNode = homeSchema["@graph"].find((node) => node["@id"] === "https://www.fullnesslab.com/#organization");
assert.deepEqual(organizationNode["@type"], ["Organization", "LocalBusiness"]);
assert.equal(organizationNode.address.streetAddress, "Av. La Dehesa 1844, local 204");
assert.equal(organizationNode.address.addressLocality, "Lo Barnechea");

const product = {
  id: "product-1",
  slug: "plan-semanal-antinflamatorio",
  sku: "PL-PLANSEMAN",
  name: "Plan semanal antinflamatorio",
  description: "Cinco preparaciones listas para calentar durante la semana.",
  price: 44900,
  productType: "plan",
  isActive: true,
  image: "/assets/brand/fullness-lab-og-2026.png"
};
const productMetadata = getSeoMetadata({
  pathname: "/producto/plan-semanal-antinflamatorio",
  product
});
assert.equal(productMetadata.isIndexable, true);
assert.equal(productMetadata.robots, "index, follow");
assert.equal(productMetadata.canonical, "https://www.fullnesslab.com/producto/plan-semanal-antinflamatorio");

const productSchema = buildStructuredData({metadata: productMetadata, product});
const productNode = productSchema["@graph"].find((node) => node["@type"] === "Product");
assert.equal(productNode.offers.priceCurrency, "CLP");
assert.equal(productNode.offers.price, "44900");
assert.equal(productNode.offers.availability, "https://schema.org/InStock");

const missingProductMetadata = getSeoMetadata({
  pathname: "/producto/no-existe",
  productLoading: false
});
assert.equal(missingProductMetadata.isIndexable, false);
assert.match(missingProductMetadata.robots, /noindex/);

const transactionMetadata = getSeoMetadata({pathname: "/tienda", search: "?payment_id=123"});
assert.equal(transactionMetadata.isIndexable, false);
assert.match(transactionMetadata.robots, /noindex/);

const rewriteSources = new Set((vercel.rewrites || []).map((rewrite) => rewrite.source));
for (const source of [
  "/sitemap.xml",
  "/tienda",
  "/comunidad",
  "/quienes-somos",
  "/preguntas-frecuentes",
  "/producto/:slug"
]) {
  assert.equal(rewriteSources.has(source), true, `Falta rewrite para ${source}`);
}

console.log(`SEO QA OK: ${SEO_PUBLIC_ROUTES.length} rutas públicas, producto y estados no indexables verificados.`);
