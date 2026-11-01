import assert from "node:assert/strict";
import {createServer} from "vite";

const keys = ["CORE360_COMMERCE_READ_ENABLED", "CORE360_COMMERCE_POLL_ENABLED", "CORE360_COMMERCE_MEDIA_PROXY_ENABLED", "CRON_SECRET"];
const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
Object.assign(process.env, {CORE360_COMMERCE_READ_ENABLED: "false", CORE360_COMMERCE_POLL_ENABLED: "false", CORE360_COMMERCE_MEDIA_PROXY_ENABLED: "false", CRON_SECRET: "local-route-test-not-a-credential"});
let server;
try {
  server = await createServer({cacheDir: "runtime/vite-core-routes-test.local", optimizeDeps: {noDiscovery: true, include: [], entries: []}, server: {host: "127.0.0.1", port: 0, strictPort: false, hmr: false}});
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const projection = await fetch(`${origin}/api/commerce/catalog-projection`);
  assert.equal(projection.status, 200);
  assert.match(projection.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await projection.json(), {data: {enabled: false, products: []}});
  assert.equal((await fetch(`${origin}/api/commerce/menu-image?id=invalid`)).status, 404);
  const denied = await fetch(`${origin}/api/internal/core360/recover`);
  assert.equal(denied.status, 401);
  assert.deepEqual(await denied.json(), {error: "unauthorized"});
  const wrongMethod = await fetch(`${origin}/api/commerce/catalog-projection`, {method: "POST"});
  assert.equal(wrongMethod.status, 405);
  assert.deepEqual(await wrongMethod.json(), {error: "method_not_allowed"});
  console.log("Vite Core routes: real HTTP handlers return JSON/404/401/405 rather than SPA fallback; no database or provider calls.");
} finally {
  if (server) await server.close();
  for (const [key,value] of Object.entries(old)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
