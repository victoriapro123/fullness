import {createClient} from "@supabase/supabase-js";
import {loadEnvFile} from "../server/r2-media.mjs";
import {recoverCore360CommerceDelivery} from "../server/core360-commerce-adapter.mjs";

const options = readOptions(process.argv.slice(2));
await Promise.all([
  loadEnvFile(new URL("../.env.local", import.meta.url)),
  loadEnvFile(new URL("../.core360-commerce.local", import.meta.url))
]);

const supabaseUrl = text(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const serviceRole = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!supabaseUrl || !serviceRole) {
  throw new Error("La recuperación privada requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY locales.");
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: {autoRefreshToken: false, persistSession: false}
});
const pages = [];
let cursor = options.cursor;
for (let page = 0; page < options.maxPages; page += 1) {
  const result = await recoverCore360CommerceDelivery({cursor, limit: options.limit, supabase});
  pages.push({
    delivered: result.delivered?.length || 0,
    enabled: result.enabled,
    failed: result.failed?.length || 0,
    queued: result.reconciled?.queued?.length || 0,
    scanned: result.scanned || 0
  });
  cursor = result.reconciled?.nextCursor || null;
  if (!result.enabled || !cursor) break;
}

console.log(JSON.stringify({
  nextCursor: cursor,
  pages,
  purpose: "Manual/private recovery only. It never changes a Mercado Pago payment and depends on the Core360 outbox flags."
}, null, 2));

function readOptions(args) {
  const options = {cursor: null, limit: 50, maxPages: 10};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--cursor" && value) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object") options.cursor = parsed;
      } catch {
        throw new Error("--cursor debe contener JSON con paidAt y orderId.");
      }
    }
    if (flag === "--limit" && value) options.limit = positiveInteger(value, "--limit");
    if (flag === "--max-pages" && value) options.maxPages = positiveInteger(value, "--max-pages");
  }
  return options;
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) throw new Error(`${label} debe ser un entero entre 1 y 100.`);
  return parsed;
}

function text(value) {
  return String(value ?? "").trim();
}
