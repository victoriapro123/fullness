import assert from "node:assert/strict";
import {createCheckoutPreference} from "../server/mercadopago-checkout.mjs";

const product = {
  id: "33333333-3333-4333-8333-333333333333",
  is_active: true,
  name: "Plan semanal QA",
  plan_frequency: "weekly",
  price_clp: 44900,
  product_type: "plan",
  slug: "plan.semanal-qa legado",
  sku: "FULLNESS-PLAN-SEM-001"
};
const projection = {
  core_item_available: true,
  core_item_id: "44444444-4444-4444-8444-444444444444",
  core_sku: "PLAN-SEM-001",
  currency: "CLP",
  factor_compatible: true,
  gross_minor: "44900",
  price_available: true,
  product_version: "commercial-v1",
  quantity_milli_per_unit: 1000,
  source_menu_item_id: product.id,
  tax_bps: 1900,
  unit: "un",
  uom_compatible: true
};
const imageMapping = {
  core_item_id: projection.core_item_id,
  image_reference: "core-image-v7",
  image_version: "7",
  source_menu_item_id: product.id
};
const env = {
  CORE360_BASE_URL: "https://core360.example.test",
  CORE360_COMMERCE_POLL_ENABLED: "true",
  CORE360_COMMERCE_PREVIEW_ENABLED: "true",
  CORE360_COMMERCE_READ_ENABLED: "true",
  CORE360_COMMERCE_TOKEN: "test-only"
};
const checkout = {
  cart: [{quantity: 1, slug: product.slug}],
  fulfillment: {
    address: "Av. Fullness 123",
    comuna: "Santiago",
    email: "checkout-qa@fullnesslab.invalid",
    mode: "pickup",
    name: "Checkout QA",
    phone: "+56911111111"
  },
  request: {headers: {host: "fullnesslab.test", "x-forwarded-proto": "https"}}
};

const incompletePreflight = {mercadoPagoCalls: 0, orderInserts: 0, orderItems: []};
for (const slug of ["plan..qa", "plan/qa", "Plan.qa", "-plan", "plan.", "plan_qa", "plan  qa"]) {
  await assert.rejects(createCheckoutPreference({
    ...checkout,
    cart: [{slug, quantity: 1}],
    dependencies: {env: {}, supabase: {from() { throw new Error("Invalid slug must not query the database"); }}}
  }), error => error.statusCode === 422 && /identificador/.test(error.message));
}
await assert.rejects(
  createCheckoutPreference({
    ...checkout,
    dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      core360FetchImpl: () => { throw new Error("No puede cotizar sin el flag PREVIEW."); },
      env: {...env, CORE360_COMMERCE_PREVIEW_ENABLED: "false"},
      mercadoPagoRequest: async () => {
        incompletePreflight.mercadoPagoCalls += 1;
        return {id: "must-not-exist", init_point: "https://mp.invalid/must-not-exist"};
      },
      supabase: checkoutSupabase(incompletePreflight)
    }
  }),
  (error) => error.statusCode === 503
);
assert.equal(incompletePreflight.orderInserts, 0, "Sin PREVIEW no se crea una orden Fullness.");
assert.equal(incompletePreflight.mercadoPagoCalls, 0, "Sin PREVIEW no se crea una preferencia Mercado Pago.");

for (const code of ["CATALOG_VERSION_CONFLICT", "ITEM_NOT_SELLABLE"]) {
  const state = {mercadoPagoCalls: 0, orderInserts: 0, orderItems: []};
  await assert.rejects(
    createCheckoutPreference({
      ...checkout,
      dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
        core360FetchImpl: async () => ({
          ok: false,
          json: async () => ({code, message: "Core360 cambió la condición comercial."}),
          status: 409
        }),
        env,
        mercadoPagoRequest: async () => {
          state.mercadoPagoCalls += 1;
          return {id: "must-not-exist", init_point: "https://mp.invalid/must-not-exist"};
        },
        supabase: checkoutSupabase(state)
      }
    }),
    (error) => error.code === code
  );
  assert.equal(state.orderInserts, 0, `${code}: no se crea una orden Fullness antes del preview.`);
  assert.equal(state.mercadoPagoCalls, 0, `${code}: no se crea preferencia ni cobro Mercado Pago.`);
}

const success = {mercadoPagoCalls: 0, orderInserts: 0, orderItems: []};
const result = await createCheckoutPreference({
  ...checkout,
  dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
    core360FetchImpl: async (url, request) => {
      assert.match(url, /\/api\/commerce\/v1\/orders\/preview$/);
      const body = JSON.parse(request.body);
      assert.equal(body.payment.status, "unpaid");
      assert.equal(body.payment.reference, "");
      return {
        ok: true,
        json: async () => ({
          currency: "CLP",
          lines: body.lines.map((line) => ({...line, priceAvailable: true})),
          sourceVersion: "preview-source-v1",
          totalMinor: body.expectedTotalMinor,
          version: "preview-v1"
        }),
        status: 200
      };
    },
    env,
    mercadoPagoRequest: async (path, {body}) => {
      success.mercadoPagoCalls += 1;
      assert.equal(path, "/checkout/preferences");
      assert.equal(body.items[0].unit_price, 44900);
      return {id: "mp-preference-qa", init_point: "https://mp.invalid/preference-qa"};
    },
    supabase: checkoutSupabase(success)
  }
});

assert.equal(result.preferenceId, "mp-preference-qa");
assert.equal(success.orderInserts, 1);
assert.equal(success.mercadoPagoCalls, 1);
assert.equal(success.orderItems.length, 1);

const unpaidRuntime = {deliveries: 0, mercadoPagoCalls: 0, orderInserts: 0, orderItems: [], queued: 0};
const runtimeResult = await createCheckoutPreference({
  ...checkout,
  dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
    core360FetchImpl: async (url, request) => {
      assert.match(url, /\/api\/commerce\/v1\/orders\/preview$/);
      const body = JSON.parse(request.body);
      return {ok: true, json: async () => ({
        currency: "CLP",
        lines: body.lines.map((line) => ({...line, priceAvailable: true})),
        sourceVersion: "preview-source-v1",
        totalMinor: body.expectedTotalMinor,
        version: "preview-v1"
      }), status: 200};
    },
    deliverCore360OutboxEvent: async ({event}) => {
      unpaidRuntime.deliveries += 1;
      assert.equal(event.id, "core-created-outbox");
      return {accepted: true};
    },
    enqueueCore360UnpaidOrder: async ({items, order}) => {
      unpaidRuntime.queued += 1;
      assert.equal(order.total_clp, 44900);
      assert.equal(items[0].product_snapshot.core360ItemId, projection.core_item_id);
      return {enabled: true, eventId: "core-created-outbox", status: "pending"};
    },
    env: {...env, CORE360_COMMERCE_DELIVERY_ENABLED: "true", CORE360_COMMERCE_ORDER_SYNC_ENABLED: "true", CORE360_COMMERCE_SYNC_ENABLED: "true"},
    mercadoPagoRequest: async () => {
      unpaidRuntime.mercadoPagoCalls += 1;
      assert.equal(unpaidRuntime.deliveries, 1, "Core must accept the unpaid order before Mercado Pago receives a preference.");
      return {id: "mp-preference-runtime", init_point: "https://mp.invalid/runtime"};
    },
    supabase: checkoutSupabase(unpaidRuntime)
  }
});
assert.equal(runtimeResult.preferenceId, "mp-preference-runtime");
assert.equal(unpaidRuntime.queued, 1);
assert.equal(unpaidRuntime.deliveries, 1);
assert.equal(unpaidRuntime.mercadoPagoCalls, 1);

const unpaidBlocked = {mercadoPagoCalls: 0, orderInserts: 0, orderItems: []};
await assert.rejects(createCheckoutPreference({
  ...checkout,
  dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
    core360FetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      return {ok: true, json: async () => ({
        currency: "CLP",
        lines: body.lines.map((line) => ({...line, priceAvailable: true})),
        totalMinor: body.expectedTotalMinor
      }), status: 200};
    },
    deliverCore360OutboxEvent: async () => { throw new Error("Core360 unavailable"); },
    enqueueCore360UnpaidOrder: async () => ({enabled: true, eventId: "core-created-outbox", status: "pending"}),
    env: {...env, CORE360_COMMERCE_DELIVERY_ENABLED: "true", CORE360_COMMERCE_ORDER_SYNC_ENABLED: "true", CORE360_COMMERCE_SYNC_ENABLED: "true"},
    mercadoPagoRequest: async () => {
      unpaidBlocked.mercadoPagoCalls += 1;
      return {id: "must-not-exist", init_point: "https://mp.invalid/must-not-exist"};
    },
    supabase: checkoutSupabase(unpaidBlocked)
  }
}), (error) => error.statusCode === 503 && /Core360/.test(error.message));
assert.equal(unpaidBlocked.mercadoPagoCalls, 0, "A failed Core order delivery must not create a Mercado Pago preference.");
for (const delivery of [
  {accepted: false, reason: "outbox-claimed", skipped: true},
  {accepted: false, reason: "order-sync-disabled", skipped: true}
]) {
  const pendingDelivery = {mercadoPagoCalls: 0, orderInserts: 0, orderItems: []};
  await assert.rejects(createCheckoutPreference({
    ...checkout,
    dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      core360FetchImpl: async (_url, request) => {
        const body = JSON.parse(request.body);
        return {ok: true, json: async () => ({
          currency: "CLP",
          lines: body.lines.map((line) => ({...line, priceAvailable: true})),
          totalMinor: body.expectedTotalMinor
        }), status: 200};
      },
      deliverCore360OutboxEvent: async () => delivery,
      enqueueCore360UnpaidOrder: async () => ({enabled: true, eventId: "core-created-outbox", status: "pending"}),
      env: {...env, CORE360_COMMERCE_DELIVERY_ENABLED: "true", CORE360_COMMERCE_ORDER_SYNC_ENABLED: "true", CORE360_COMMERCE_SYNC_ENABLED: "true"},
      mercadoPagoRequest: async () => {
        pendingDelivery.mercadoPagoCalls += 1;
        return {id: "must-not-exist", init_point: "https://mp.invalid/must-not-exist"};
      },
      supabase: checkoutSupabase(pendingDelivery)
    }
  }), (error) => error.statusCode === 503 && /Core360/.test(error.message));
  assert.equal(pendingDelivery.mercadoPagoCalls, 0, `${delivery.reason}: an unaccepted Core order must not create a Mercado Pago preference.`);
}
for (const slug of [
  "posta negra-zanahoria-vegetales", "p-4",
  "pollo-a-la-king-fullness-lab-con-papas-nativas-doradas", "p",
  "curry-de-lentejas-y-camote-con-salmon-sous-vide", "p-2", "p-3",
  "plan-semanal-antinflamatorio", "pollo-curry.manzana-verde.guiso"
]) {
  const legacy = {mercadoPagoCalls: 0, orderInserts: 0, orderItems: []};
  await createCheckoutPreference({
    ...checkout,
    cart: [{slug, quantity: 1}],
    dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
      env: {},
      supabase: checkoutSupabase(legacy, {...product, slug, product_type: "family", plan_frequency: null}),
      mercadoPagoRequest: async () => ({id: "mock-only", init_point: "https://mp.invalid/no-network"})
    }
  });
  assert.equal(legacy.orderInserts, 1, `Published identifier must be looked up verbatim: ${slug}`);
}
for (const origin of ["https://fullness-qa.example.test", "http://localhost:3101", "https://127.0.0.1:3101"]) {
  const oldSiteUrl = process.env.CHECKOUT_SITE_URL;
  process.env.CHECKOUT_SITE_URL = origin;
  try {
    const qaState = {mercadoPagoCalls: 0, orderInserts: 0, orderItems: []};
    const preference = await createCheckoutPreference({
      ...checkout,
      dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
        env: {},
        supabase: checkoutSupabase(qaState),
        mercadoPagoRequest: async (_path, {body}) => {
          assert.equal(body.auto_return, origin === "https://fullness-qa.example.test" ? "approved" : undefined);
          assert.equal(body.payer.email, checkout.fulfillment.email, "El checkout siempre usa el correo ingresado, sin un prellenado QA global.");
          assert.equal(body.back_urls.success.startsWith(origin), true);
          return {id: "qa-preference", init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=qa", sandbox_init_point: "https://sandbox.mercadopago.cl/obsolete"};
        }
      }
    });
    assert.equal(preference.initPoint, "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=qa");
  } finally {
    if (oldSiteUrl === undefined) delete process.env.CHECKOUT_SITE_URL;
    else process.env.CHECKOUT_SITE_URL = oldSiteUrl;
  }
}
assert.deepEqual(
  pickCommercialSnapshot(success.orderItems[0].product_snapshot),
  {
    core360CatalogVersion: "preview-v1",
    core360ImageReference: "core-image-v7",
    core360ImageVersion: "7",
    core360ItemId: projection.core_item_id,
    core360PriceVersion: projection.product_version,
    core360QuantityMilliPerUnit: 1000,
    core360Sku: projection.core_sku,
    core360TaxBps: 1900,
    core360UnitGrossMinor: 44900,
    core360UomCode: "un"
  }
);

console.log("Core360 checkout preflight: precio/inactivo bloquean preferencia; cotización canónica se congela antes de Mercado Pago.");

function checkoutSupabase(state, selectedProduct = product) {
  return {
    from(table) {
      if (table === "menu_items") {
        return {
          select: () => ({
            in: () => ({eq: async () => ({data: [selectedProduct], error: null})})
          })
        };
      }
      if (table === "core360_catalog_projection") {
        return {select: () => ({in: async () => ({data: [projection], error: null})})};
      }
      if (table === "core360_product_mappings") {
        const query = {
          eq: async () => ({data: [imageMapping], error: null}),
          in() { return query; }
        };
        return {select: () => query};
      }
      if (table === "orders") {
        return {
          insert(row) {
            state.orderInserts += 1;
            state.order = row;
            return {select: () => ({single: async () => ({data: {id: "55555555-5555-4555-8555-555555555555", ...row}, error: null})})};
          },
          update: () => ({eq: async () => ({error: null})})
        };
      }
      if (table === "order_items") {
        return {
          insert: async (rows) => {
            state.orderItems.push(...rows);
            return {error: null};
          }
        };
      }
      throw new Error(`Tabla inesperada en QA checkout: ${table}`);
    }
  };
}

function pickCommercialSnapshot(snapshot) {
  return Object.fromEntries([
    "core360CatalogVersion",
    "core360ImageReference",
    "core360ImageVersion",
    "core360ItemId",
    "core360PriceVersion",
    "core360QuantityMilliPerUnit",
    "core360Sku",
    "core360TaxBps",
    "core360UnitGrossMinor",
    "core360UomCode"
  ].map((key) => [key, snapshot[key]]));
}
