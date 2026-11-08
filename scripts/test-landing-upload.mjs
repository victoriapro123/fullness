import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLocalPhotos } from '../src/lib/landing-local.js';

// Exercise the existing upload handler; every external boundary is intercepted.
// No real credentials, user sessions, storage objects or network calls are used.
assert.ok(globalThis.WebSocket, 'Run this test with Node.js 22+ (native WebSocket required by the installed Supabase client).');
Object.assign(process.env, {
  VITE_SUPABASE_URL: 'https://landing-upload.invalid',
  NEXT_PUBLIC_SUPABASE_URL: 'https://landing-upload.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'local-fixture-not-a-secret',
  R2_ACCESS_KEY_ID: 'fixture', R2_SECRET_ACCESS_KEY: 'fixture',
  R2_ENDPOINT_URL: 'https://landing-storage.invalid', R2_BUCKET_NAME: 'fixture',
});
let role = 'admin';
let writes = 0;
const original = await readFile('public/images/landing-local/interior.jpeg');
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url || String(input));
  if (url.hostname === 'landing-upload.invalid' && url.pathname === '/auth/v1/user') {
    return Response.json({ id: '00000000-0000-4000-8000-000000000001' });
  }
  if (url.hostname === 'landing-upload.invalid' && url.pathname === '/rest/v1/profiles') {
    return Response.json({ is_admin: role === 'admin' });
  }
  if (url.hostname === 'landing-storage.invalid') {
    assert.equal(options.method, 'PUT');
    assert.match(url.pathname, /^\/fixture\/images\/landing-local\/\d{4}-\d{2}\/[^/]+\.jpg$/);
    assert.ok(Buffer.from(options.body).equals(original), 'Original bytes remain unchanged');
    writes += 1;
    return new Response(null, { status: 200 });
  }
  throw new Error('Unexpected external request in isolated upload test');
};
const { default: handler } = await import('../api/upload-media.js');
async function request(authenticated) {
  let text;
  const res = { statusCode: 0, setHeader() {}, end(value) { text = value; } };
  await handler({ method: 'POST', headers: authenticated ? { authorization: 'Bearer fixture-session' } : {},
    body: { folder: 'images/landing-local', fileName: 'interior.jpeg', contentType: 'image/jpeg', dataBase64: original.toString('base64') } }, res);
  return { status: res.statusCode, body: JSON.parse(text) };
}
assert.equal((await request(false)).status, 401);
role = 'member'; const denied = await request(true); assert.equal(denied.status, 403, JSON.stringify(denied.body)); assert.equal(writes, 0);
role = 'admin'; const success = await request(true); assert.equal(success.status, 200); assert.equal(writes, 1);
assert.equal(validateLocalPhotos([{ id: 'uploaded', label: 'Interior', url: success.body.publicUrl, storagePath: success.body.key }]).length, 1);
const second = await request(true); assert.notEqual(second.body.key, success.body.key, 'Replacement gets a new key; no destructive overwrite');
console.log('PASS upload boundary: anonymous 401; member 403; admin upload; original bytes; valid gallery URL; independent replacement key. All external services mocked; no remote writes.');
