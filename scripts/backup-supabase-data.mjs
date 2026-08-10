import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const TABLES = [
  "backoffice_drafts",
  "benefit_definitions",
  "cart_items",
  "carts",
  "clients",
  "content_posts",
  "customer_addresses",
  "customer_subscriptions",
  "ecommerce_content_versions",
  "ecommerce_shop_settings",
  "email_deliveries",
  "email_logs",
  "email_subscribers",
  "health_profiles",
  "meal_library_items",
  "menu_items",
  "offers",
  "order_items",
  "order_status_events",
  "orders",
  "payment_events",
  "payments",
  "products",
  "profiles",
  "recipe_suggestions",
  "redemptions",
  "report_snapshots",
  "subscriptions",
  "tag_definitions"
];

const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!output || !url || !serviceRole) {
  throw new Error("Uso: node scripts/backup-supabase-data.mjs --output <archivo.json.gz> con las variables Supabase inyectadas temporalmente.");
}

const pageSize = 1000;
const headers = {
  apikey: serviceRole,
  Authorization: `Bearer ${serviceRole}`,
  Accept: "application/json",
  "Accept-Profile": "public"
};

async function readTable(table) {
  const rows = [];
  let from = 0;

  while (true) {
    const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=*`, {
      headers: {
        ...headers,
        Range: `${from}-${from + pageSize - 1}`,
        "Range-Unit": "items"
      }
    });

    if (!response.ok) {
      throw new Error(`${table}: ${response.status} ${await response.text()}`);
    }

    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
    from += page.length;
  }
}

const data = {};
for (const table of TABLES) {
  data[table] = await readTable(table);
}

const snapshot = {
  format: "fullness-supabase-data-v1",
  createdAt: new Date().toISOString(),
  source: new URL(url).host,
  tables: data,
  rowCounts: Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length]))
};
const payload = gzipSync(Buffer.from(JSON.stringify(snapshot)), { level: 9 });
const digest = createHash("sha256").update(payload).digest("hex");
const resolvedOutput = path.resolve(output);
const outputDirectory = path.dirname(resolvedOutput);

await mkdir(outputDirectory, { recursive: true });
await writeFile(`${resolvedOutput}.partial`, payload);
await rename(`${resolvedOutput}.partial`, resolvedOutput);
await writeFile(`${resolvedOutput}.sha256`, `${digest}  ${path.basename(resolvedOutput)}\n`);

console.log(JSON.stringify({ output: resolvedOutput, sha256: digest, rowCounts: snapshot.rowCounts }));
