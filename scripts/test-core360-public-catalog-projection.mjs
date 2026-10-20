import assert from "node:assert/strict";
import {createPublicCore360MenuImageUrl} from "../api/commerce/catalog-projection.js";
import {createMenuImageHandler} from "../api/commerce/menu-image.js";
import {applyPublicCore360Prices} from "../src/lib/menu-items.js";

const editorialImage = "https://images.fullnesslab.com/editorial-vigente.webp";
const validItem = {
  id: "11111111-1111-4111-8111-111111111111",
  image: editorialImage,
  name: "Vigente",
  photoUrl: editorialImage,
  price: 18800
};
const withdrawnItem = {id: "22222222-2222-4222-8222-222222222222", name: "Retirado", price: 18900};
const catalogItems = [validItem, withdrawnItem];
const coreImageVersion = "image-version-2";
const coreImageUrl = `/api/commerce/menu-image?id=${validItem.id}&v=${coreImageVersion}`;

assert.equal(
  createPublicCore360MenuImageUrl({
    enabled: true,
    mapping: {image_reference: "image-reference-private", image_version: coreImageVersion},
    menuItemId: validItem.id
  }),
  coreImageUrl
);
assert.equal(
  createPublicCore360MenuImageUrl({
    enabled: false,
    mapping: {image_reference: "image-reference-private", image_version: coreImageVersion},
    menuItemId: validItem.id
  }),
  null
);
assert.equal(
  createPublicCore360MenuImageUrl({
    enabled: true,
    mapping: {image_reference: null, image_version: coreImageVersion},
    menuItemId: validItem.id
  }),
  null
);

const partial = await applyPublicCore360Prices(catalogItems, {
  fetchImpl: async () => jsonResponse({
    data: {
      enabled: true,
      products: [{
        commercialVersion: "commercial-v1",
        id: validItem.id,
        imageUrl: coreImageUrl,
        imageVersion: coreImageVersion,
        priceClp: 19000
      }]
    }
  })
});
assert.equal(partial.error, null);
assert.equal(partial.data.length, 1);
assert.equal(partial.data[0].id, validItem.id);
assert.equal(partial.data[0].price, 19000);
assert.equal(partial.data[0].core360CommercialVersion, "commercial-v1");
assert.equal(partial.data[0].image, coreImageUrl);
assert.equal(partial.data[0].photoUrl, coreImageUrl);
assert.equal(partial.data[0].editorialImage, editorialImage);
assert.equal(partial.data[0].editorialPhotoUrl, editorialImage);
assert.equal(partial.data[0].core360ImageVersion, coreImageVersion);
assert.equal(partial.data[0].image.includes("core.prof3sional.com"), false);

const proxyDisabled = await applyPublicCore360Prices(catalogItems, {
  fetchImpl: async () => jsonResponse({data: {enabled: false, products: []}})
});
assert.equal(proxyDisabled.error, null);
assert.equal(proxyDisabled.data[0].image, editorialImage);
assert.equal(proxyDisabled.data[0].core360ImageUrl, undefined);

const preferredImageRemoved = await applyPublicCore360Prices(partial.data, {
  fetchImpl: async () => jsonResponse({
    data: {
      enabled: true,
      products: [{commercialVersion: "commercial-v2", id: validItem.id, priceClp: 19100}]
    }
  })
});
assert.equal(preferredImageRemoved.data.length, 1);
assert.equal(preferredImageRemoved.data[0].image, editorialImage);
assert.equal(preferredImageRemoved.data[0].photoUrl, editorialImage);
assert.equal(preferredImageRemoved.data[0].core360ImageUrl, undefined);
assert.equal(preferredImageRemoved.data[0].core360ImageVersion, undefined);

const proxySuccess = createMenuImageHandler({
  createSupabaseClient: () => imageProxySupabase({
    mapping: {core_item_id: "core-item-1", image_reference: "image-reference-private", image_version: coreImageVersion},
    menuItem: {id: validItem.id, photo_url: editorialImage}
  }),
  env: {SUPABASE_SERVICE_ROLE_KEY: "test-only", SUPABASE_URL: "https://supabase.example.test"},
  isMediaProxyEnabled: () => true,
  readImage: async () => ({bytes: new Uint8Array([1, 2, 3]), contentType: "image/webp"})
});
const proxySuccessResponse = responseCapture();
await proxySuccess({method: "GET", query: {id: validItem.id}}, proxySuccessResponse);
assert.equal(proxySuccessResponse.statusCode, 200);
assert.equal(proxySuccessResponse.headers["Content-Type"], "image/webp");
assert.match(proxySuccessResponse.headers.ETag, new RegExp(validItem.id));
assert.equal(proxySuccessResponse.headers.ETag.includes("image-reference-private"), false);

const commerciallyEmpty = await applyPublicCore360Prices(catalogItems, {
  fetchImpl: async () => jsonResponse({data: {enabled: true, products: []}})
});
assert.equal(commerciallyEmpty.error, null);
assert.deepEqual(commerciallyEmpty.data, []);

const trulyEmpty = await applyPublicCore360Prices([], {
  fetchImpl: async () => jsonResponse({data: {enabled: true, products: []}})
});
assert.equal(trulyEmpty.error, null);
assert.deepEqual(trulyEmpty.data, []);

const projectionFailure = await applyPublicCore360Prices(catalogItems, {
  fetchImpl: async () => ({ok: false, status: 503, json: async () => ({error: "catalog_projection_unavailable"})})
});
assert.equal(projectionFailure.data.length, 0);
assert.match(projectionFailure.error?.message || "", /precios canónicos/i);

const proxyFallback = createMenuImageHandler({
  createSupabaseClient: () => imageProxySupabase({
    mapping: {core_item_id: "core-item-1", image_reference: null, image_version: null},
    menuItem: {id: validItem.id, photo_url: editorialImage}
  }),
  env: {SUPABASE_SERVICE_ROLE_KEY: "test-only", SUPABASE_URL: "https://supabase.example.test"},
  isMediaProxyEnabled: () => true,
  readImage: () => { throw new Error("No debe leer Core cuando no hay imagen preferida."); }
});
const missingPreferredResponse = responseCapture();
await proxyFallback({method: "GET", query: {id: validItem.id}}, missingPreferredResponse);
assert.equal(missingPreferredResponse.statusCode, 302);
assert.equal(missingPreferredResponse.headers.Location, editorialImage);
assert.equal(missingPreferredResponse.headers["Cache-Control"], "no-store");

const notFoundError = Object.assign(new Error("Imagen Core eliminada."), {statusCode: 404});
const staleCoreFallback = createMenuImageHandler({
  createSupabaseClient: () => imageProxySupabase({
    mapping: {core_item_id: "core-item-1", image_reference: "image-1", image_version: coreImageVersion},
    menuItem: {id: validItem.id, photo_url: editorialImage}
  }),
  env: {SUPABASE_SERVICE_ROLE_KEY: "test-only", SUPABASE_URL: "https://supabase.example.test"},
  isMediaProxyEnabled: () => true,
  readImage: async () => { throw notFoundError; }
});
const staleCoreResponse = responseCapture();
await staleCoreFallback({method: "GET", query: {id: validItem.id}}, staleCoreResponse);
assert.equal(staleCoreResponse.statusCode, 302);
assert.equal(staleCoreResponse.headers.Location, editorialImage);

let disabledProxySupabaseCalls = 0;
const disabledProxy = createMenuImageHandler({
  createSupabaseClient: () => { disabledProxySupabaseCalls += 1; return imageProxySupabase({}); },
  env: {SUPABASE_SERVICE_ROLE_KEY: "test-only", SUPABASE_URL: "https://supabase.example.test"},
  isMediaProxyEnabled: () => false
});
const disabledProxyResponse = responseCapture();
await disabledProxy({method: "GET", query: {id: validItem.id}}, disabledProxyResponse);
assert.equal(disabledProxyResponse.statusCode, 404);
assert.equal(disabledProxySupabaseCalls, 0);

console.log("Core360 public catalog projection: precios e imágenes canónicos conservan fallback editorial sin exponer Core.");

function jsonResponse(payload) {
  return {ok: true, status: 200, json: async () => payload};
}

function imageProxySupabase({mapping = null, menuItem = null}) {
  return {
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        maybeSingle: async () => ({
          data: table === "menu_items" ? menuItem : mapping,
          error: null
        })
      };
      return query;
    }
  };
}

function responseCapture() {
  return {
    body: null,
    headers: {},
    statusCode: null,
    end(body = null) { this.body = body; },
    setHeader(name, value) { this.headers[name] = value; },
    status(statusCode) { this.statusCode = statusCode; return this; }
  };
}
