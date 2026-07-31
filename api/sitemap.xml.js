import {loadEnvFile} from "../server/r2-media.mjs";

const envReady = loadEnvFile(new URL("../.env.local", import.meta.url));
const STATIC_ROUTES = [
  "/",
  "/tienda",
  "/comunidad",
  "/quienes-somos",
  "/preguntas-frecuentes"
];

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET,HEAD");
    res.end("Method not allowed");
    return;
  }

  await envReady;

  const siteUrl = getSiteUrl();
  const entries = STATIC_ROUTES.map((pathname) => ({
    loc: `${siteUrl}${pathname}`,
    lastmod: ""
  }));

  for (const product of await getActiveProducts()) {
    entries.push({
      loc: `${siteUrl}/producto/${encodeURIComponent(product.slug)}`,
      lastmod: formatLastModified(product.updated_at)
    });
  }

  const body = buildSitemap(entries);
  res.statusCode = 200;
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(body);
}

async function getActiveProducts() {
  const supabaseUrl = String(
    process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ""
  )
    .trim()
    .replace(/\/+$/, "");
  const supabaseKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ""
  ).trim();

  if (!supabaseUrl || !supabaseKey) return [];

  const url = new URL(`${supabaseUrl}/rest/v1/menu_items`);
  url.searchParams.set("select", "slug,updated_at");
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("slug", "not.is.null");
  url.searchParams.set("order", "display_order.asc");

  try {
    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`
      }
    });
    if (!response.ok) return [];

    const rows = await response.json();
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row) => ({
        slug: String(row?.slug || "").trim(),
        updated_at: row?.updated_at || ""
      }))
      .filter((row) => /^[a-z0-9][a-z0-9-]*$/i.test(row.slug));
  } catch {
    return [];
  }
}

function getSiteUrl() {
  const candidate = process.env.SITE_URL || "https://www.fullnesslab.com";

  try {
    const url = new URL(String(candidate).includes("://") ? candidate : `https://${candidate}`);
    return url.origin;
  } catch {
    return "https://www.fullnesslab.com";
  }
}

function formatLastModified(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(entries) {
  const urls = entries
    .map(({loc, lastmod}) => `    <url>\n      <loc>${escapeXml(loc)}</loc>${lastmod ? `\n      <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}\n    </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
