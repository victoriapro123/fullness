import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {DELIVERY_RATES_VERSION, getDeliveryQuote, normalizeDeliveryCommune} from "../src/lib/delivery-rates.js";
import {createCheckoutPreference, quoteCheckout, syncMercadoPagoPayment} from "../server/mercadopago-checkout.mjs";
import {DELIVERY_SERVICE_BINDINGS} from "../server/delivery-service.mjs";

const uiSource = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
const preferenceBody = uiSource.slice(uiSource.indexOf('fetch("/api/mercadopago/preferences"'), uiSource.indexOf('const payload = await response.json()', uiSource.indexOf('fetch("/api/mercadopago/preferences"')));
assert.match(preferenceBody, /expectedAmount:\s*checkoutTotal/, "El importe aceptado en pantalla debe enviarse con la solicitud de pago");

function mockService(fee) {
  if (fee === 0) return null;
  const binding = DELIVERY_SERVICE_BINDINGS.find((row) => row.feeClp === fee);
  return {bindingVersion: "2026-10-25", coreItemId: binding.coreItemId, coreSku: binding.coreSku, commercialVersion: "qa-service-v1", unit: "UN", quantityMilli: "1000", unitGrossMinor: String(fee), lineGrossMinor: String(fee), taxBps: 1900, currency: "CLP", inventoryManaged: false};
}

const product = {id: "33333333-3333-4333-8333-333333333333", slug: "plan-semanal-qa", name: "Plan QA", is_active: true, product_type: "plan", plan_frequency: "weekly", price_clp: 64260};
const checkout = {
  cart: [{slug: product.slug, quantity: 2}],
  fulfillment: {mode: "delivery", name: "QA envío", email: "qa@example.invalid", phone: "+56911111111", address: "Dirección ficticia QA 123", comuna: "Lo Barnechea"},
  request: {headers: {host: "fullness.example.test", "x-forwarded-proto": "https"}}
};
for (const [comuna, expected] of [["Lo Barnechea", 3990], [" LAS   CONDES ", 5990], ["vitacura", 5990], ["Lás Condes", 5990]]) {
  assert.equal(getDeliveryQuote({mode: "delivery", comuna}).feeClp, expected);
}
assert.equal(normalizeDeliveryCommune(" lo BARNECHEA "), "Lo Barnechea");
assert.equal(getDeliveryQuote({mode: "pickup", comuna: "Lo Barnechea"}).feeClp, 0);
for (const comuna of ["", "Santiago", "Lo Barnechea Norte", {}, null]) {
  const quote = getDeliveryQuote({mode: "delivery", comuna});
  assert.equal(quote.feeClp, null, "Una tarifa ausente jamás equivale a envío gratis");
  assert.equal(quote.canPayOnline, false);
}

function mockDatabase(state) {
  return {from(table) {
    if (table === "menu_items") return {select: () => ({in: () => ({eq: async () => ({data: [product], error: null})})})};
    if (table === "orders") return {
      insert(row) {state.orders.push(row); return {select: () => ({single: async () => ({data: {id: "55555555-5555-4555-8555-555555555555", ...row}, error: null})})};},
      update: () => ({eq: async () => ({error: null})})
    };
    if (table === "order_items") return {insert: async (rows) => {state.items.push(...rows); return {error: null};}};
    throw Error(`Tabla inesperada: ${table}`);
  }};
}
for (const [mode, comuna, fee] of [["delivery", "Lo Barnechea", 3990], ["delivery", "Las Condes", 5990], ["delivery", "Vitacura", 5990], ["pickup", "Vitacura", 0]]) {
  const state = {orders: [], items: [], preferences: []};
  const result = await createCheckoutPreference({
    ...checkout,
    // Forged client quotes/totals must never be trusted.
    fulfillment: {...checkout.fulfillment, mode, comuna, deliveryFee: 1, delivery_fee_clp: 1, total: 1, deliveryQuote: {feeClp: 1}},
    dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      env: {}, supabase: mockDatabase(state),
      resolveDeliveryService: async ({feeClp}) => mockService(feeClp),
      mercadoPagoRequest: async (path, {body}) => {state.preferences.push(body); return {id: "mock-preference", init_point: "https://mp.example.invalid/qa"};},
      core360FetchImpl: async () => {throw Error("No HTTP Core permitido en prueba local");}
    }
  });
  const subtotal = product.price_clp * 2;
  assert.equal(result.amount, subtotal + fee);
  assert.equal(result.subtotal, subtotal);
  assert.equal(result.deliveryFee, fee);
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].subtotal_clp, subtotal);
  assert.equal(state.orders[0].total_clp, subtotal + fee);
  assert.equal(state.orders[0].delivery_fee_clp, fee);
  assert.equal(state.orders[0].customer_snapshot.deliveryQuote.ratesVersion, DELIVERY_RATES_VERSION);
  assert.equal(state.orders[0].customer_snapshot.deliveryQuote.feeClp, fee);
  if (fee > 0) assert.deepEqual(state.orders[0].customer_snapshot.deliveryService, mockService(fee));
  assert.deepEqual(state.orders[0].customer_snapshot.weeklyDispatchWeekdays, [2, 5]);
  assert.equal(state.items.reduce((sum, row) => sum + row.total_clp, 0), subtotal);
  assert.equal(state.preferences.length, 1);
  assert.deepEqual(state.preferences[0].shipments, fee ? {mode: "not_specified", cost: fee} : undefined);
  assert.equal(state.preferences[0].items.reduce((sum, row) => sum + row.unit_price * row.quantity, 0) + (state.preferences[0].shipments?.cost || 0), subtotal + fee);

  let quoteWrites = 0;
  const quote = await quoteCheckout({cart: checkout.cart, fulfillment: {mode, comuna}, dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
    env: {}, resolveDeliveryService: async ({feeClp}) => mockService(feeClp),
    supabase: {from(table) {if (table !== "menu_items") {quoteWrites++; throw Error("Una cotización no debe crear filas");} return mockDatabase(state).from(table);}},
    mercadoPagoRequest: async () => {quoteWrites++; throw Error("Una cotización no debe crear un pago");}
  }});
  assert.equal(quote.amount, subtotal + fee);
  assert.equal(quote.deliveryVerified, true);
  assert.equal(quoteWrites, 0);
  await assert.rejects(createCheckoutPreference({...checkout, expectedAmount: 1, fulfillment: {...checkout.fulfillment, mode, comuna}, dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
    env: {}, supabase: mockDatabase(state), resolveDeliveryService: async ({feeClp}) => mockService(feeClp),
    mercadoPagoRequest: async () => {throw Error("Un total distinto no debe crear preferencia");}
  }}), error => error.statusCode === 409);
  assert.equal(state.orders.length, 1, "Un cambio de total se detecta antes de crear otra orden");
}

for (const [comuna, env, status] of [["Santiago", {}, 422], ["Lo Barnechea", {CORE360_COMMERCE_SYNC_ENABLED: "true"}, 503]]) {
  let effects = 0;
  await assert.rejects(createCheckoutPreference({
    ...checkout, fulfillment: {...checkout.fulfillment, comuna},
    dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      env,
      supabase: {from() {effects++; throw Error("No se debe consultar ni mutar la base");}},
      mercadoPagoRequest: async () => {effects++; throw Error("No se debe cobrar");},
      core360FetchImpl: async () => {effects++; throw Error("No se debe inventar un servicio Core");}
    }
  }), (error) => error.statusCode === status);
  assert.equal(effects, 0);
}
// The payment reconciler must require the shipping-inclusive amount, not just
// the item subtotal. Providers, persistence, mail and Core are all emulated.
for (const withShipping of [false, true]) {
  const order = {id: "55555555-5555-4555-8555-555555555555", checkout_mode: "live", subtotal_clp: 64260, discount_clp: 0, delivery_fee_clp: 3990, total_clp: 68250, currency: "CLP", status: "pending_payment", customer_snapshot: {name: "QA", email: "qa@example.invalid"}};
  const changes = [];
  const supabase = {from(table) {
    if (table === "orders") return {
      select: () => ({eq: () => ({maybeSingle: async () => ({data: order, error: null})})}),
      update: (row) => ({eq: async () => {changes.push(row); return {error: null};}})
    };
    if (table === "payments") {
      const query = {eq() {return this;}, maybeSingle: async () => ({data: null, error: null})};
      return {select: () => query, insert: async (row) => {changes.push(row); return {error: null};}};
    }
    if (table === "order_items") return {select: () => ({eq: async () => ({data: [], error: null})})};
    throw Error(`Consulta inesperada: ${table}`);
  }};
  const result = syncMercadoPagoPayment("123456789", order.id, {
    env: {}, supabase,
    mercadoPagoRequest: async () => ({id: 123456789, status: "approved", live_mode: true, transaction_amount: withShipping ? 68250 : 64260, currency_id: "CLP", external_reference: order.id}),
    enqueueCore360PaymentApproved: async () => ({enabled: false}),
    sendApprovedOrderEmails: async () => ({customer: {sent: true}, operations: {sent: true}})
  });
  if (withShipping) {
    assert.equal((await result).status, "approved");
    assert.equal(changes.length, 2);
    assert.equal(changes[0].transaction_amount_clp, 68250);
  } else {
    await assert.rejects(result, (error) => error.statusCode === 409);
    assert.equal(changes.length, 0, "Un pago sin el envío no debe persistirse como aprobado");
  }
}
console.log("Tarifas QA OK: 3 comunas, retiro, otras comunas a WhatsApp, total/MP/snapshot exactos, conciliación exige envío, cliente manipulado ignorado y Core bloqueado antes de cobrar. Todo simulado, sin tráfico externo.");
