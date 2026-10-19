import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

// Public-schema data only. Authentication, Storage/R2, Vault, schema and policies are deliberately outside this REST snapshot.
const TABLES = [
  "backoffice_drafts", "benefit_definitions", "cart_items", "carts", "customer_addresses",
  "customer_subscriptions", "ecommerce_content_versions", "ecommerce_shop_settings", "email_deliveries",
  "email_subscribers", "meal_library_items", "menu_items", "monthly_plan_weeks", "order_items",
  "order_status_events", "orders", "payment_events", "payments", "profiles", "tag_definitions"
];
const PAGE_SIZE = 1000;

function arg(name) {
  const at = process.argv.indexOf(name);
  return at === -1 ? "" : process.argv[at + 1] || "";
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function loadPrivateEnv(file) {
  if (!file) return;
  const text = await readFile(path.resolve(file), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const [, key, raw] = match;
    const value = raw.length >= 2 && ((raw[0] === '"' && raw.at(-1) === '"') || (raw[0] === "'" && raw.at(-1) === "'"))
      ? raw.slice(1, -1)
      : raw.replace(/\s+#.*$/, "");
    process.env[key] = value;
  }
}

function config() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Faltan URL o SUPABASE_SERVICE_ROLE_KEY de Supabase.");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("La URL de respaldo debe ser un proyecto HTTPS de Supabase.");
  }
  return { restUrl: `${parsed.origin}/rest/v1`, serviceRole, sourceHost: parsed.hostname };
}

function headers(serviceRole, range) {
  return {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    Accept: "application/json",
    "Accept-Profile": "public",
    Range: range,
    "Range-Unit": "items"
  };
}

function absentTable(response, body) {
  return response.status === 404 && (body.includes("PGRST205") || body.includes("Could not find the table"));
}

async function readTable(restUrl, serviceRole, table) {
  const rows = [];
  let from = 0;
  while (true) {
    const query = new URLSearchParams({ select: "*", order: "id.asc" });
    const response = await fetch(`${restUrl}/${encodeURIComponent(table)}?${query}`, {
      headers: headers(serviceRole, `${from}-${from + PAGE_SIZE - 1}`)
    });
    if (!response.ok) {
      const body = await response.text();
      if (absentTable(response, body)) return null;
      throw new Error(`No fue posible leer ${table} (HTTP ${response.status}).`);
    }
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`Respuesta invalida al leer ${table}.`);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    from += page.length;
  }
}

async function snapshot(restUrl, serviceRole) {
  const data = {};
  const absentTables = [];
  for (const table of TABLES) {
    const rows = await readTable(restUrl, serviceRole, table);
    if (rows === null) absentTables.push(table);
    else data[table] = rows;
  }
  const serialized = canonical(data);
  return {
    data,
    dataHash: sha256(serialized),
    rowCounts: Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length])),
    absentTables
  };
}

async function atomicWrite(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.partial`;
  await writeFile(temporary, content, { mode: 0o600 });
  await rename(temporary, file);
}

function seal(snapshotData, serviceRole, generatedAt) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(serviceRole, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const compressed = gzipSync(Buffer.from(canonical(snapshotData), "utf8"));
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return {
    format: "fullness-supabase-rest-backup-v1",
    generatedAt,
    cipher: "aes-256-gcm",
    keyDerivation: "scrypt-sha256-service-role-v1",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

function openEnvelope(envelope, serviceRole) {
  if (envelope?.format !== "fullness-supabase-rest-backup-v1") throw new Error("Formato de respaldo no reconocido.");
  const key = scryptSync(serviceRole, Buffer.from(envelope.salt, "base64"), 32);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const compressed = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
  return JSON.parse(gunzipSync(compressed).toString("utf8"));
}

function pathsFor(output) {
  const resolved = path.resolve(output);
  if (!resolved.endsWith(".local")) throw new Error("El archivo cifrado debe terminar en .local para no entrar a Git.");
  return {
    encrypted: resolved,
    manifest: `${resolved}.manifest.local`,
    restorePlan: `${resolved}.restore-plan.local`
  };
}

function restorePlan({ encrypted, manifest, sourceHost }) {
  return {
    format: "fullness-supabase-rest-restore-prep-v1",
    encryptedBackup: encrypted,
    manifest,
    sourceHost,
    verification: "El respaldo se descifra y se comprueba contra su hash SHA-256; esta verificacion no inserta filas en una base de datos.",
    requiredBeforeRestore: [
      "Crear una base aislada y aplicar primero las migraciones versionadas de Fullness.",
      "Usar la misma credencial de servicio que cifra este respaldo o una clave de recuperacion aprobada que la sustituya.",
      "Revisar FK, orden de carga, usuarios y datos personales antes de cualquier insercion manual o automatizada."
    ],
    covered: "Filas REST del esquema public listadas en el manifiesto.",
    excluded: [
      "DDL, migraciones, extensiones, funciones, triggers, roles, RLS y politicas.",
      "auth.users, contrasenas, sesiones y proveedores de autenticacion.",
      "Storage de Supabase, Cloudflare R2, Vault, secretos y configuracion Vercel.",
      "Estados o artefactos externos de Mercado Pago, Core360, correo y otros proveedores."
    ],
    automaticRestore: false
  };
}

async function verify(output, serviceRole) {
  const encrypted = await readFile(pathsFor(output).encrypted, "utf8");
  const data = openEnvelope(JSON.parse(encrypted), serviceRole);
  const calculated = sha256(canonical(data));
  const manifest = JSON.parse(await readFile(pathsFor(output).manifest, "utf8"));
  if (calculated !== manifest.dataHash) throw new Error("La verificacion de hash del respaldo fallo.");
  console.log(JSON.stringify({ verified: true, dataHash: calculated, rowCounts: manifest.rowCounts, absentTables: manifest.absentTables }, null, 2));
}

async function main() {
  const output = arg("--output");
  await loadPrivateEnv(arg("--env-file"));
  if (!output) throw new Error("Uso: node scripts/backup-supabase-data.mjs --env-file <privado.local> --output <respaldo.local> [--verify]");
  const { restUrl, serviceRole, sourceHost } = config();
  if (process.argv.includes("--verify")) return verify(output, serviceRole);

  const first = await snapshot(restUrl, serviceRole);
  const second = await snapshot(restUrl, serviceRole);
  if (first.dataHash !== second.dataHash) throw new Error("Las dos lecturas REST no fueron estables; no se genero respaldo.");

  const generatedAt = new Date().toISOString();
  const destinations = pathsFor(output);
  const manifest = {
    format: "fullness-supabase-rest-backup-manifest-v1",
    generatedAt,
    sourceHost,
    stableReadHashes: [first.dataHash, second.dataHash],
    dataHash: first.dataHash,
    rowCounts: first.rowCounts,
    absentTables: first.absentTables,
    excluded: ["auth.users", "Storage/R2", "Vault/secrets", "schema/DDL/RLS/policies/functions", "external provider state"]
  };
  await atomicWrite(destinations.encrypted, `${JSON.stringify(seal(first.data, serviceRole, generatedAt))}\n`);
  await atomicWrite(destinations.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  await atomicWrite(destinations.restorePlan, `${JSON.stringify(restorePlan({ ...destinations, sourceHost }), null, 2)}\n`);
  await verify(destinations.encrypted, serviceRole);
  console.log(JSON.stringify({ backedUp: true, encryptedBackup: destinations.encrypted, manifest: destinations.manifest, restorePlan: destinations.restorePlan, dataHash: first.dataHash, rowCounts: first.rowCounts, absentTables: first.absentTables }, null, 2));
}

await main();
