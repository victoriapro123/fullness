import assert from "node:assert/strict";
import {access, mkdir, writeFile} from "node:fs/promises";
import {constants} from "node:fs";
import path from "node:path";
import {loadEnvFile} from "../server/r2-media.mjs";
import {serializeAvailability} from "../src/lib/product-availability.js";

const apply = process.argv.includes("--apply");
const schedule = [
  {id: "dbf5a951-68dd-44f9-8771-27535eb8cad9", startsOn: "2026-10-26", endsOn: "2026-11-02"},
  {id: "c023b6c0-dd93-4010-ad65-6bb8e09607fc", startsOn: "2026-11-02", endsOn: "2026-11-09"},
  {id: "a5c68954-a355-4176-8df3-9609b9c81fd5", startsOn: "2026-11-09", endsOn: "2026-11-16"},
  {id: "99987c53-3cec-4f73-ab8c-1913f10c0a3b", startsOn: "2026-11-16", endsOn: "2026-11-23"}
];
await loadEnvFile(new URL("../runtime/fullness-production.private.env.local", import.meta.url));
const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
assert.equal(new URL(base).hostname, "allyjctrrtvibwchjouu.supabase.co", "Wrong Supabase project");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(key, "Private server credentials required");
const ids = schedule.map((entry) => entry.id).join(",");
const before = await request(`menu_items?select=*&id=in.(${ids})`);
assert.equal(before.length, 4);
for (const [index, entry] of schedule.entries()) {
  const row = before.find((row) => row.id === entry.id);
  assert.equal(row.product_type, "plan");
  assert.equal(row.plan_frequency, "weekly");
  assert.equal(row.is_active, true, "Do not change visibility");
  assert.ok(row.name.startsWith(`Semana ${index + 1} `), "Unexpected product identity");
}
if (!apply) {
  console.log(JSON.stringify({dryRun: true, rows: schedule.map((entry) => ({...entry, name: before.find((row) => row.id === entry.id).name}))}));
} else {
  const deliveryRoot = "R:/Entregables-Codex";
  await access(deliveryRoot, constants.W_OK);
  const output = path.join(deliveryRoot, "Fullness", `Disponibilidad-Semanal-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  await mkdir(output, {recursive: true});
  await writeFile(path.join(output, "respaldo-planes-antes.json"), JSON.stringify({project: "allyjctrrtvibwchjouu", capturedAt: new Date().toISOString(), rows: before}, null, 2), {flag: "wx"});
  const receipt = {startedAt: new Date().toISOString(), updated: [], databaseOnly: true};
  try {
    for (const entry of schedule) {
      const original = before.find((row) => row.id === entry.id);
      const availability = serializeAvailability({mode: "scheduled", ...entry});
      const metadata = {...original.metadata, availability};
      const rows = await request(`menu_items?id=eq.${entry.id}&updated_at=eq.${encodeURIComponent(original.updated_at)}`, {
        method: "PATCH", body: JSON.stringify({metadata})
      });
      assert.equal(rows.length, 1, "Concurrent edit detected; stop without overwriting");
      assert.deepEqual(withoutAvailability(rows[0]), withoutAvailability(original), "Unexpected catalogue mutation");
      receipt.updated.push({id: entry.id, name: original.name, availability});
      await writeFile(path.join(output, "resultado-programacion.json"), JSON.stringify(receipt, null, 2));
    }
    const after = await request(`menu_items?select=id,name,metadata&id=in.(${ids})`);
    for (const entry of schedule) {
      assert.deepEqual(after.find((row) => row.id === entry.id).metadata.availability, serializeAvailability({mode: "scheduled", ...entry}));
    }
    receipt.verifiedAt = new Date().toISOString();
    receipt.verified = true;
  } finally {
    await writeFile(path.join(output, "resultado-programacion.json"), JSON.stringify(receipt, null, 2));
  }
  console.log(JSON.stringify({savedTo: output, ...receipt}));
}

function withoutAvailability(row) {
  const {updated_at, metadata, ...fields} = row;
  const {availability, ...otherMetadata} = metadata || {};
  return {...fields, metadata: otherMetadata};
}

async function request(resource, options = {}) {
  const response = await fetch(`${base}/rest/v1/${resource}`, {
    ...options, redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: {apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation"}
  });
  if (!response.ok) throw Error(`FULLNESS_REST_HTTP_${response.status}`);
  return response.json();
}
