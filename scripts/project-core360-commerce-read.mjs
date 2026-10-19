import {createClient} from "@supabase/supabase-js";
import {loadEnvFile} from "../server/r2-media.mjs";
import {projectCore360CommerceRead} from "../server/core360-commerce-adapter.mjs";

await Promise.all([
  loadEnvFile(new URL("../.env.local", import.meta.url)),
  loadEnvFile(new URL("../.core360-commerce.local", import.meta.url))
]);

const supabaseUrl = text(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const serviceRole = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!supabaseUrl || !serviceRole) {
  throw new Error("La proyección privada requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY locales.");
}

const result = await projectCore360CommerceRead({
  supabase: createClient(supabaseUrl, serviceRole, {
    auth: {autoRefreshToken: false, persistSession: false}
  })
});
console.log(JSON.stringify({
  ...result,
  purpose: "Manual/private Core360 projection. It preserves editorial menu data and never converts absent or non-inventory stock into zero."
}, null, 2));

function text(value) {
  return String(value ?? "").trim();
}
