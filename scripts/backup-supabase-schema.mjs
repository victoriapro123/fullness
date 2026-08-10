import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const outputIndex = process.argv.indexOf("--output");
const projectIndex = process.argv.indexOf("--project-ref");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "";
const projectRef = projectIndex >= 0 ? process.argv[projectIndex + 1] : "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!output || !projectRef || !accessToken) {
  throw new Error("Uso: node scripts/backup-supabase-schema.mjs --project-ref <ref> --output <archivo.json.gz> con SUPABASE_ACCESS_TOKEN inyectado temporalmente.");
}

const queries = {
  tables: `select table_name, table_type from information_schema.tables where table_schema = 'public' order by table_name`,
  columns: `select table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`,
  constraints: `select tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name, kcu.ordinal_position, ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name from information_schema.table_constraints tc left join information_schema.key_column_usage kcu on tc.constraint_schema = kcu.constraint_schema and tc.constraint_name = kcu.constraint_name and tc.table_name = kcu.table_name left join information_schema.constraint_column_usage ccu on tc.constraint_schema = ccu.constraint_schema and tc.constraint_name = ccu.constraint_name where tc.table_schema = 'public' order by tc.table_name, tc.constraint_name, kcu.ordinal_position`,
  indexes: `select tablename as table_name, indexname as index_name, indexdef as definition from pg_indexes where schemaname = 'public' order by tablename, indexname`,
  policies: `select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'public' order by tablename, policyname`,
  functions: `select p.proname as name, pg_get_function_identity_arguments(p.oid) as arguments, pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by p.proname`,
  triggers: `select event_object_table as table_name, trigger_name, event_manipulation, action_timing, action_statement from information_schema.triggers where trigger_schema = 'public' order by event_object_table, trigger_name`
};

async function runQuery(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) throw new Error(`Schema backup query failed: ${response.status} ${await response.text()}`);
  return response.json();
}

const schema = {};
for (const [name, query] of Object.entries(queries)) {
  schema[name] = await runQuery(query);
}

const snapshot = {
  format: "fullness-supabase-schema-v1",
  createdAt: new Date().toISOString(),
  projectRef,
  schema
};
const payload = gzipSync(Buffer.from(JSON.stringify(snapshot)), { level: 9 });
const digest = createHash("sha256").update(payload).digest("hex");
const resolvedOutput = path.resolve(output);
const outputDirectory = path.dirname(resolvedOutput);

await mkdir(outputDirectory, { recursive: true });
await writeFile(`${resolvedOutput}.partial`, payload);
await rename(`${resolvedOutput}.partial`, resolvedOutput);
await writeFile(`${resolvedOutput}.sha256`, `${digest}  ${path.basename(resolvedOutput)}\n`);

console.log(JSON.stringify({ output: resolvedOutput, sha256: digest, tableCount: schema.tables.length }));
