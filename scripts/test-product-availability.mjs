import assert from "node:assert/strict";
import {getProductAvailability, serializeAvailability, availabilityValidationError, santiagoDate} from "../src/lib/product-availability.js";
import {buildMenuItemPayload, mapMenuItem} from "../src/lib/menu-items.js";
import {createCheckoutPreference} from "../server/mercadopago-checkout.mjs";

const windows = [
  ["2026-10-26", "2026-11-02"], ["2026-11-02", "2026-11-09"],
  ["2026-11-09", "2026-11-16"], ["2026-11-16", "2026-11-23"]
];
const plans = windows.map(([startsOn, endsOn], index) => ({
  id: `plan-${index}`, name: `Semana ${index + 1}`, is_active: true, product_type: "plan", plan_frequency: "weekly",
  metadata: {untouched: "preserved", availability: serializeAvailability({mode: "scheduled", startsOn, endsOn})}
}));
assert.equal(santiagoDate(new Date("2026-10-26T02:59:59Z")), "2026-10-25");
assert.equal(plans.filter((p) => getProductAvailability(p, new Date("2026-10-26T02:59:59Z")).available).length, 0);
for (let index = 0; index < plans.length; index++) {
  const time = new Date(`${windows[index][0]}T03:00:00Z`);
  assert.deepEqual(plans.map((p) => getProductAvailability(p, time).available), plans.map((_, i) => i === index));
}
assert.equal(getProductAvailability(plans[3], new Date("2026-11-23T03:00:00Z")).available, false);
assert.equal(getProductAvailability({metadata: {}}, new Date()).available, true);
assert.equal(getProductAvailability({is_active: false}).status, "hidden");
assert.equal(getProductAvailability({availability: {mode: "paused"}}).available, false);
assert.equal(getProductAvailability({availability: {mode: "scheduled", startsOn: "2026-02-31"}}).available, false);
assert.ok(availabilityValidationError({mode: "scheduled", startsOn: "2026-11-02", endsOn: "2026-11-02"}));
assert.equal(getProductAvailability({availability: {mode: "scheduled", startsOn: "2026-10-26"}}, new Date("2027-01-01T12:00:00Z")).available, true);
const mapped = mapMenuItem(plans[0]);
assert.equal(mapped.availability.startsOn, "2026-10-26");
const payload = buildMenuItemPayload({...mapped, priceClp: 46260});
assert.equal(payload.metadata.untouched, "preserved");
assert.equal(payload.metadata.availability.starts_on, "2026-10-26");
// Fail before any order, Core HTTP, email or payment-provider operation.
for (const availability of [
  {mode: "paused"},
  {mode: "scheduled", startsOn: "2026-10-26", endsOn: "2026-11-02"},
  {mode: "scheduled", startsOn: "invalid"}
]) {
  let mutations = 0;
  let providerCalls = 0;
  const product = {...plans[0], slug: "semana-1", price_clp: 46260, metadata: {availability}};
  const table = {
    select() {return this;}, in() {return this;},
    eq() {return Promise.resolve({data: [product], error: null});}
  };
  await assert.rejects(createCheckoutPreference({
    cart: [{slug: product.slug, quantity: 1}],
    fulfillment: {mode: "pickup", name: "QA local", phone: "+56911111111", email: "qa@example.invalid"},
    dependencies: {
      now: new Date("2026-10-25T15:00:00Z"), env: {},
      supabase: {from(name) {if (name !== "menu_items") {mutations++; throw Error("No side effects allowed");} return table;}},
      mercadoPagoRequest: async () => {providerCalls++; throw Error("No provider allowed");},
      core360FetchImpl: async () => {mutations++; throw Error("No Core allowed");}
    }
  }), (error) => error.statusCode === 409);
  assert.equal(mutations, 0);
  assert.equal(providerCalls, 0);
}
console.log("Disponibilidad QA OK: límites Santiago, 4 semanas exclusivas, metadata preservada y checkout bloqueado sin efectos externos.");
