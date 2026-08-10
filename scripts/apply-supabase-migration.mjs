import { readFile } from "node:fs/promises";
import path from "node:path";

const projectIndex = process.argv.indexOf("--project-ref");
const migrationIndex = process.argv.indexOf("--migration");
const projectRef = projectIndex >= 0 ? process.argv[projectIndex + 1] : "";
const migration = migrationIndex >= 0 ? process.argv[migrationIndex + 1] : "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !migration || !accessToken) {
  throw new Error(
    "Uso: node scripts/apply-supabase-migration.mjs --project-ref <ref> --migration <archivo.sql> con SUPABASE_ACCESS_TOKEN inyectado temporalmente."
  );
}

if (path.extname(migration).toLowerCase() !== ".sql") {
  throw new Error("La migración debe ser un archivo SQL versionado.");
}

const query = await readFile(migration, "utf8");
if (!query.trim()) {
  throw new Error("La migración SQL está vacía.");
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query })
});

if (!response.ok) {
  const detail = (await response.text()).slice(0, 1200);
  throw new Error(`Migration failed: ${response.status} ${detail}`);
}

const result = await response.json();
console.log(JSON.stringify({
  projectRef,
  migration: path.basename(migration),
  statementsResultSets: Array.isArray(result) ? result.length : 0,
  applied: true
}));
