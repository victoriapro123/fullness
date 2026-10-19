import assert from "node:assert/strict";
import {applyPublicCore360Prices} from "../src/lib/menu-items.js";

const validItem = {id: "11111111-1111-4111-8111-111111111111", name: "Vigente", price: 18800};
const withdrawnItem = {id: "22222222-2222-4222-8222-222222222222", name: "Retirado", price: 18900};
const catalogItems = [validItem, withdrawnItem];

const partial = await applyPublicCore360Prices(catalogItems, {
  fetchImpl: async () => jsonResponse({
    data: {
      enabled: true,
      products: [{
        commercialVersion: "commercial-v1",
        id: validItem.id,
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

console.log("Core360 public catalog projection: baja individual conserva productos válidos; vacío y error global no exponen precios legacy.");

function jsonResponse(payload) {
  return {ok: true, status: 200, json: async () => payload};
}
