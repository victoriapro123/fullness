import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";

const DEFAULT_SHOP_URL = "https://www.fullnesslab.com/tienda";
const DEFAULT_OUTPUT = "runtime/fullness-core360-catalog.local";
const PRODUCT_FIELDS = [
  "id",
  "slug",
  "sku",
  "name",
  "price_clp",
  "currency",
  "is_active",
  "product_type",
  "plan_frequency",
  "tag",
  "photo_url",
  "secondary_photo_url",
  "photo_storage_path",
  "secondary_photo_storage_path",
  "display_order",
  "included_items"
].join(",");

const options = readOptions(process.argv.slice(2));
const shopUrl = options.shopUrl || DEFAULT_SHOP_URL;
const outputPath = path.resolve(options.output || DEFAULT_OUTPUT);
const retrievedAt = new Date().toISOString();

const {publicKey, supabaseUrl} = await discoverPublicSupabaseConfig(shopUrl);
const products = await fetchActiveMenuItems({publicKey, supabaseUrl});
const catalog = buildCatalogExport({products, retrievedAt, shopUrl, supabaseUrl});

await mkdir(path.dirname(outputPath), {recursive: true});
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  activeProducts: catalog.products.length,
  outputPath,
  source: catalog.source.shopUrl,
  supabaseHost: catalog.source.supabaseHost
}, null, 2));

function readOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--output" && value) options.output = value;
    if (flag === "--shop-url" && value) options.shopUrl = value;
  }
  return options;
}

async function discoverPublicSupabaseConfig(shopUrl) {
  const pageResponse = await fetch(shopUrl);
  if (!pageResponse.ok) throw new Error(`La tienda publicó HTTP ${pageResponse.status}.`);

  const page = await pageResponse.text();
  const scriptSources = [...page.matchAll(/<script[^>]+src="([^"]+\.js(?:\?[^\"]*)?)"/gi)]
    .map((match) => new URL(match[1], shopUrl).href);
  if (scriptSources.length === 0) throw new Error("No encontramos el bundle público de la tienda.");

  for (const source of scriptSources) {
    const bundleResponse = await fetch(source);
    if (!bundleResponse.ok) continue;
    const bundle = await bundleResponse.text();
    const supabaseUrl = bundle.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i)?.[0];
    const publicKey = bundle.match(/sb_publishable_[A-Za-z0-9._-]+/)?.[0]
      || bundle.match(/eyJ[a-zA-Z0-9._-]{80,}/)?.[0];
    if (supabaseUrl && publicKey) return {publicKey, supabaseUrl};
  }

  throw new Error("No encontramos la configuración pública de catálogo Supabase en la tienda.");
}

async function fetchActiveMenuItems({publicKey, supabaseUrl}) {
  const endpoint = new URL("/rest/v1/menu_items", supabaseUrl);
  endpoint.searchParams.set("select", PRODUCT_FIELDS);
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("order", "display_order.asc,name.asc");

  const response = await fetch(endpoint, {
    headers: {
      apikey: publicKey,
      authorization: `Bearer ${publicKey}`
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(`No pudimos leer menu_items activo (HTTP ${response.status}).`);
  }
  return payload;
}

function buildCatalogExport({products, retrievedAt, shopUrl, supabaseUrl}) {
  const seenIds = new Set();
  const seenSkus = new Set();
  const normalized = products.map((product) => {
    const id = cleanText(product.id);
    const sku = cleanText(product.sku);
    const priceClp = Number(product.price_clp);
    const currency = cleanText(product.currency);
    if (!id || seenIds.has(id)) throw new Error("El catálogo público contiene un id ausente o repetido.");
    if (!sku || seenSkus.has(sku)) throw new Error(`El catálogo público contiene un SKU ausente o repetido (${id}).`);
    if (!Number.isSafeInteger(priceClp) || priceClp < 0 || currency !== "CLP") {
      throw new Error(`El producto ${id} no tiene precio CLP entero válido.`);
    }
    seenIds.add(id);
    seenSkus.add(sku);

    const productType = cleanText(product.product_type);
    const planFrequency = cleanText(product.plan_frequency) || null;
    return {
      category: cleanText(product.tag) || null,
      fullnessCommercialKind: productType === "plan" ? "plan" : "plato",
      id,
      images: {
        primaryUrl: cleanText(product.photo_url) || null,
        secondaryUrl: cleanText(product.secondary_photo_url) || null
      },
      isActive: product.is_active === true,
      name: cleanText(product.name),
      planFrequency,
      price: {amountMinor: String(priceClp), currency},
      productType,
      sku,
      slug: cleanText(product.slug),
      sourceComposition: productType === "plan" ? product.included_items || [] : [],
      stock: {known: false, reason: "Fullness menu_items no contiene fuente de stock o reservas."},
      tax: {known: false, reason: "Fullness menu_items no expone impuesto comercial por producto."}
    };
  });

  return {
    schemaVersion: 1,
    source: {
      activeOnly: true,
      fetchedAt: retrievedAt,
      shopUrl,
      supabaseHost: new URL(supabaseUrl).host
    },
    products: normalized
  };
}

function cleanText(value) {
  return String(value ?? "").trim();
}
