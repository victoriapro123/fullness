import assert from "node:assert/strict";
import {DISPATCH_RULE_TEXT, MEALPREP_DISPATCH_RULE_TEXT, getDispatchOptions, getDispatchSchedule, getProductAvailability, getProductDispatchRule, serializeAvailability, availabilityValidationError, santiagoDate} from "../src/lib/product-availability.js";
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
assert.equal(plans.filter((p) => getProductAvailability(p, new Date("2026-10-26T02:59:59Z")).available).length, 4);
for (let index = 0; index < plans.length; index++) {
  const time = new Date(`${windows[index][0]}T03:00:00Z`);
  assert.deepEqual(plans.map((p) => getProductAvailability(p, time).available), [true, true, true, true]);
  assert.match(getProductAvailability(plans[index], time).message, /Despacho el martes/);
  const dispatch = getDispatchOptions(windows[index][0]);
  assert.equal(dispatch.tuesday, ["2026-10-27", "2026-11-03", "2026-11-10", "2026-11-17"][index]);
  assert.equal(dispatch.friday, ["2026-10-30", "2026-11-06", "2026-11-13", "2026-11-20"][index]);
  assert.equal(dispatch.rule, DISPATCH_RULE_TEXT);
  assert.doesNotMatch(getProductAvailability(plans[index], time).message, /activa|desactiva|Próximamente/);
}
assert.equal(getProductAvailability(plans[3], new Date("2026-11-23T03:00:00Z")).available, true);
for (const [now, expected] of [
  ["2026-10-25T15:00:00Z", "2026-10-27"],
  ["2026-10-26T19:59:59Z", "2026-10-27"],
  ["2026-10-26T20:00:00Z", "2026-10-27"],
  ["2026-10-26T20:00:01Z", "2026-10-30"],
  ["2026-10-27T15:00:00Z", "2026-10-30"],
  ["2026-10-29T19:59:59Z", "2026-10-30"],
  ["2026-10-29T20:00:00Z", "2026-10-30"],
  ["2026-10-29T20:00:00.001Z", "2026-11-03"],
  ["2026-10-29T20:00:01Z", "2026-11-03"],
  ["2026-10-30T02:59:59Z", "2026-11-03"],
  ["2026-10-30T03:00:00Z", "2026-11-03"],
  ["2026-10-31T15:00:00Z", "2026-11-03"]
]) assert.equal(getDispatchSchedule("2026-10-26", new Date(now)).dispatchOn, expected, now);
assert.equal(getDispatchSchedule("2026-11-16", new Date("2026-10-25T15:00:00Z")).dispatchOn, "2026-11-17", "Una preventa respeta su semana futura");
assert.equal(getDispatchSchedule("2026-06-01", new Date("2026-06-01T21:00:00Z")).dispatchOn, "2026-06-02", "Corte de invierno en UTC-4");
assert.equal(getDispatchSchedule("2026-06-01", new Date("2026-06-01T21:00:01Z")).dispatchOn, "2026-06-05");
assert.equal(getDispatchSchedule("2026-06-01", new Date("2026-06-04T21:00:00Z")).dispatchOn, "2026-06-05", "Jueves de invierno 17:00 incluido");
assert.equal(getDispatchSchedule("2026-06-01", new Date("2026-06-04T21:00:01Z")).dispatchOn, "2026-06-09", "Jueves de invierno después de 17:00 pasa al martes");
for (const type of ["mealprep", "family"]) {
  const product = {...plans[0], product_type: type, plan_frequency: null};
  for (const now of ["2026-10-26T20:00:01Z", "2026-10-29T20:00:01Z", "2026-10-30T15:00:00Z"]) {
    const state = getProductAvailability(product, new Date(now));
    assert.equal(state.available, true);
    assert.equal(state.dispatch, null, "Los sueltos no heredan fechas automáticas de martes/viernes");
    assert.match(state.message, /a pedido.*coordinar/);
    assert.equal(getProductDispatchRule(product), MEALPREP_DISPATCH_RULE_TEXT);
  }
}
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
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      now: new Date("2026-10-25T15:00:00Z"), env: {},
      supabase: {from(name) {if (name !== "menu_items") {mutations++; throw Error("No side effects allowed");} return table;}},
      mercadoPagoRequest: async () => {providerCalls++; throw Error("No provider allowed");},
      core360FetchImpl: async () => {mutations++; throw Error("No Core allowed");}
    }
  }), (error) => error.statusCode === 409);
  assert.equal(mutations, 0);
  assert.equal(providerCalls, 0);
}
// A future (or historical) dispatch date must not fail the server-side guard.
for (const [index, product] of plans.entries()) {
  const rows = [];
  let providerCalls = 0;
  const selectedProduct = {...product, slug: `semana-${index + 1}`, price_clp: 64260};
  const checkoutNow = new Date(index % 2 ? "2027-01-01T12:00:00Z" : "2026-10-25T15:00:00Z");
  const result = await createCheckoutPreference({
    cart: [{slug: selectedProduct.slug, quantity: 1}],
    fulfillment: {mode: "pickup", name: "QA local", phone: "+56911111111", email: "qa@example.invalid"},
    request: {headers: {host: "fullness.example.test", "x-forwarded-proto": "https"}},
    dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      now: checkoutNow, env: {},
      supabase: {from(name) {
        if (name === "menu_items") return {select: () => ({in: () => ({eq: async () => ({data: [selectedProduct], error: null})})})};
        if (name === "orders") return {
          insert(row) {rows.push(row); return {select: () => ({single: async () => ({data: {id: "55555555-5555-4555-8555-555555555555", ...row}, error: null})})};},
          update: () => ({eq: async () => ({error: null})})
        };
        if (name === "order_items") return {insert: async (items) => {
          assert.equal(items[0].product_snapshot.availability.starts_on, windows[index][0]);
          assert.deepEqual(items[0].product_snapshot.dispatch, getDispatchSchedule(windows[index][0], checkoutNow));
          assert.deepEqual(items[0].product_snapshot.weeklyDispatchWeekdays, [2, 5]);
          return {error: null};
        }};
        throw Error(`Unexpected QA table: ${name}`);
      }},
      mercadoPagoRequest: async () => {providerCalls++; return {id: "mock-preference", init_point: "https://mp.example.invalid/qa"};},
      core360FetchImpl: async () => {throw Error("No Core HTTP allowed");}
    }
  });
  assert.equal(result.amount, 64260);
  assert.equal(rows.length, 1);
  assert.equal(providerCalls, 1);
}
// Loose meals persist coordination, never the fixed-menu dispatch promise.
for (const type of ["mealprep", "family"]) {
  const product = {...plans[0], product_type: type, plan_frequency: null, slug: `suelto-${type}`, price_clp: 18000};
  const persisted = {orders: [], items: []};
  await createCheckoutPreference({
    cart: [{slug: product.slug, quantity: 1}],
    fulfillment: {mode: "pickup", name: "QA local", phone: "+56911111111", email: "qa@example.invalid"},
    request: {headers: {host: "fullness.example.test", "x-forwarded-proto": "https"}},
    dependencies: {now: new Date("2026-10-29T20:00:01Z"), env: {},
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      supabase: {from(table) {
        if (table === "menu_items") return {select: () => ({in: () => ({eq: async () => ({data: [product], error: null})})})};
        if (table === "orders") return {insert(row) {persisted.orders.push(row); return {select: () => ({single: async () => ({data: {id: "55555555-5555-4555-8555-555555555555"}, error: null})})};}, update: () => ({eq: async () => ({error: null})})};
        if (table === "order_items") return {insert: async (rows) => {persisted.items.push(...rows); return {error: null};}};
        throw Error(`Unexpected QA table: ${table}`);
      }},
      mercadoPagoRequest: async () => ({id: "mock-preference", init_point: "https://mp.example.invalid/qa"}),
      core360FetchImpl: async () => {throw Error("No Core HTTP allowed");}
    }
  });
  assert.equal(persisted.orders[0].customer_snapshot.weeklyDispatchWeekdays, null);
  assert.deepEqual(persisted.orders[0].customer_snapshot.dispatchPolicies, ["fullness_coordination"]);
  assert.equal(persisted.items[0].product_snapshot.dispatch, null);
  assert.equal(persisted.items[0].product_snapshot.dispatchPolicy, "fullness_coordination");
  assert.equal(persisted.items[0].product_snapshot.dispatchRule, MEALPREP_DISPATCH_RULE_TEXT);
  assert.equal(persisted.items[0].product_snapshot.weeklyDispatchWeekdays, null);
}
console.log("Disponibilidad QA OK: cortes lunes/jueves17h exactos en verano/invierno; mealpreps y familiares a coordinar, sin promesa fija; snapshots persistidos y guards protegidos. Todo simulado, sin efectos externos.");
