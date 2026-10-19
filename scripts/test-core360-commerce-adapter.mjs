import assert from "node:assert/strict";
import {
  buildCore360PaymentApprovedEvent,
  createCore360OrderRequest,
  deliverCore360OutboxEvent,
  enqueueCore360PaymentApproved,
  isCore360CommerceReadEnabled,
  isCore360CommercePollingEnabled,
  isCore360CommerceDeliveryEnabled,
  readCore360Catalog,
  readCore360OrderStates,
  readCore360Stock,
  isCore360CommerceSyncEnabled,
  reconcileMissingCore360ApprovedOrders,
  selectReconciledMercadoPagoPayment,
  verifyCore360ProductMappings
} from "../server/core360-commerce-adapter.mjs";

const approvedOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  currency: "CLP",
  customer_snapshot: {
    address: "Av. La Dehesa 1844",
    comuna: "Lo Barnechea",
    email: "cliente@example.test",
    mode: "delivery",
    name: "Cliente QA",
    phone: "+56911111111"
  },
  delivery_fee_clp: 0,
  discount_clp: 0,
  mercadopago_external_reference: "11111111-1111-4111-8111-111111111111",
  paid_at: "2026-10-16T15:00:00.000Z",
  subtotal_clp: 44900,
  total_clp: 44900
};

const approvedPayment = {
  provider: "mercado_pago",
  provider_payment_id: "123456789",
  status: "approved",
  transaction_amount_clp: 44900,
  paid_at: "2026-10-16T15:00:00.000Z"
};

const approvedItems = [{
  id: "22222222-2222-4222-8222-222222222222",
  product_id: "33333333-3333-4333-8333-333333333333",
  product_name: "Plan semanal",
  product_snapshot: {
    planFrequency: "weekly",
    planStructure: "weekly_mealpreps_v1",
    productType: "plan",
    sku: "PLAN-SEM-001",
    slug: "plan-semanal"
  },
  quantity: 1,
  total_clp: 44900,
  unit_price_clp: 44900
}];

const approvedCoreMapping = {
  commercial_version: "price-v1",
  core_item_id: "core-plan-semanal",
  gross_unit_price_minor: 44900,
  is_active: true,
  quantity_milli_per_unit: 1000,
  source_menu_item_id: approvedItems[0].product_id,
  tax_bps: 1900,
  uom_code: "unit"
};

assert.equal(isCore360CommerceSyncEnabled({}), false);
assert.equal(isCore360CommerceReadEnabled({}), false);
assert.equal(isCore360CommercePollingEnabled({CORE360_COMMERCE_READ_ENABLED: "true"}), false);
assert.equal(isCore360CommerceDeliveryEnabled({CORE360_COMMERCE_SYNC_ENABLED: "true"}), false);

assert.deepEqual(
  await readCore360Catalog({fetchImpl: () => { throw new Error("The disabled reader must not call Core360."); }}),
  {enabled: false, skipped: true, reason: "read-disabled"}
);
assert.deepEqual(
  await readCore360Stock({fetchImpl: () => { throw new Error("The disabled reader must not call Core360."); }}),
  {enabled: false, skipped: true, reason: "read-disabled"}
);
assert.deepEqual(
  await readCore360OrderStates({fetchImpl: () => { throw new Error("The disabled poller must not call Core360."); }}),
  {enabled: false, skipped: true, reason: "polling-disabled"}
);

const coreReads = [];
const readEnv = {
  CORE360_BASE_URL: "https://core360.example.test/",
  CORE360_COMMERCE_POLL_ENABLED: "true",
  CORE360_COMMERCE_READ_ENABLED: "true",
  CORE360_COMMERCE_TOKEN: "test-only"
};
assert.deepEqual(
  await readCore360Catalog({
    env: readEnv,
    fetchImpl: async (url, request) => {
      coreReads.push({request, url});
      return {ok: true, json: async () => ({rows: [{id: "core-plan-semanal"}]}), status: 200};
    },
    query: {limit: 10, priceListId: "retail", ignored: "must-not-pass"}
  }),
  {enabled: true, rows: [{id: "core-plan-semanal"}]}
);
assert.match(coreReads[0].url, /\/api\/commerce\/v1\/products\?limit=10&priceListId=retail$/);
assert.equal(coreReads[0].request.method, "GET");
assert.equal(coreReads[0].request.headers.Authorization, "Bearer test-only");
assert.deepEqual(
  await readCore360Stock({
    env: readEnv,
    fetchImpl: async (url) => {
      coreReads.push({url});
      return {ok: true, json: async () => ({rows: [{available_milli: "5000", itemId: "core-plan-semanal"}]}), status: 200};
    },
    query: {itemId: "core-plan-semanal", limit: 1}
  }),
  {enabled: true, rows: [{available_milli: "5000", itemId: "core-plan-semanal"}]}
);
assert.match(coreReads[1].url, /\/api\/commerce\/v1\/stock\?itemId=core-plan-semanal&limit=1$/);
assert.deepEqual(
  await readCore360OrderStates({
    env: readEnv,
    fetchImpl: async (url, request) => {
      coreReads.push({request, url});
      return {ok: true, json: async () => ({page: {nextCursor: "orders-next", sourceVersion: "orders-v2"}, rows: []}), status: 200};
    },
    query: {externalOrderId: approvedOrder.id, sinceVersion: "orders-v1"}
  }),
  {enabled: true, page: {nextCursor: "orders-next", sourceVersion: "orders-v2"}, rows: []}
);
assert.match(coreReads[2].url, /\/api\/commerce\/v1\/orders\?externalOrderId=11111111-1111-4111-8111-111111111111&sinceVersion=orders-v1$/);
assert.deepEqual(
  verifyCore360ProductMappings({
    fullnessProducts: [{id: approvedItems[0].product_id}, {id: "unmapped-fullness-product"}],
    coreProducts: [{id: "core-plan-semanal"}],
    mappings: [{
      core_item_id: "core-plan-semanal",
      is_active: true,
      source_menu_item_id: approvedItems[0].product_id
    }]
  }).summary,
  {
    "core-item-not-found": 0,
    "duplicate-source-mapping": 0,
    "inactive-mapping": 0,
    "invalid-fullness-product": 0,
    "missing-mapping": 1,
    verified: 1
  }
);

const disabledEnqueue = await enqueueCore360PaymentApproved({
  items: approvedItems,
  order: approvedOrder,
  payment: approvedPayment,
  supabase: {from: () => { throw new Error("The disabled adapter must not query Supabase."); }}
});
assert.deepEqual(disabledEnqueue, {enabled: false, skipped: true, reason: "sync-disabled"});

const event = buildCore360PaymentApprovedEvent({items: approvedItems, order: approvedOrder, payment: approvedPayment});
assert.equal(event.event, "web_order.payment_approved");
assert.equal(event.order.totalClp, 44900);
assert.equal(event.order.subtotalClp, 44900);
assert.equal(event.order.deliveryFeeClp, 0);
assert.equal(event.payment.reference, "mercado_pago:123456789");
assert.equal(event.lines[0].source.menuItemId, approvedItems[0].product_id);
assert.match(event.customer.externalCustomerId, /^fullness-web:email:/);
assert.equal(event.channel, "fullness-web");
assert.equal(event.schemaVersion, 2);
assert.equal(event.idempotencyKey, `web_order.payment_approved:${approvedOrder.id}:v2`);
assert.match(event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

const request = createCore360OrderRequest({
  config: {fiscalIntent: "pending", partnerIdCore: "partner-fullness", priceListId: ""},
  event,
  mappings: [approvedCoreMapping]
});
assert.equal(request.order.externalOrderId, approvedOrder.id);
assert.equal(request.order.expectedTotalMinor, "44900");
assert.equal(request.order.schemaVersion, 2);
assert.deepEqual(request.order.expectedTotals, {
  currency: "CLP",
  deliveryGrossMinor: "0",
  discountGrossMinor: "0",
  subtotalGrossMinor: "44900",
  totalGrossMinor: "44900"
});
assert.deepEqual(request.order.lines, [{
  commercialVersion: "price-v1",
  itemIdCore: "core-plan-semanal",
  lineGrossMinor: "44900",
  quantityMilli: "1000",
  sku: undefined,
  taxBps: 1900,
  unitGrossMinor: "44900",
  uomCode: "unit"
}]);
assert.equal(request.order.payment.status, "observed");

assert.throws(
  () => createCore360OrderRequest({
    config: {fiscalIntent: "pending", partnerIdCore: "partner-fullness", priceListId: ""},
    event: buildCore360PaymentApprovedEvent({
      items: approvedItems,
      order: {...approvedOrder, delivery_fee_clp: 2500, subtotal_clp: 44900, total_clp: 47400},
      payment: {...approvedPayment, transaction_amount_clp: 47400}
    }),
    mappings: [approvedCoreMapping]
  }),
  (error) => error.code === "ADJUSTMENT_MAPPING_REQUIRED"
);
assert.equal(selectReconciledMercadoPagoPayment({
  currency: "CLP",
  externalReference: approvedOrder.mercadopago_external_reference,
  orderId: approvedOrder.id,
  payments: [approvedPayment],
  totalClp: 44900
})?.provider_payment_id, "123456789");
assert.equal(selectReconciledMercadoPagoPayment({
  currency: "CLP",
  externalReference: approvedOrder.mercadopago_external_reference,
  orderId: approvedOrder.id,
  payments: [{...approvedPayment, transaction_amount_clp: 44901}],
  totalClp: 44900
}), null);
assert.equal(selectReconciledMercadoPagoPayment({
  currency: "CLP",
  externalReference: "foreign-order-reference",
  orderId: approvedOrder.id,
  payments: [approvedPayment],
  totalClp: 44900
}), null);
assert.deepEqual(
  await reconcileMissingCore360ApprovedOrders({
    supabase: {from: () => { throw new Error("The disabled reconciler must not query Supabase."); }}
  }),
  {enabled: false, skipped: true, reason: "sync-disabled"}
);

const recoveryOutboxRows = [];
const recoveryOrdersQuery = {
  eq() { return this; },
  order() { return this; },
  async limit() {
    return {
      data: [{
        ...approvedOrder,
        order_items: approvedItems,
        payment_status: "approved",
        payments: [approvedPayment],
        status: "paid"
      }],
      error: null
    };
  }
};
const recoveryExistingOutboxQuery = {
  eq() { return this; },
  async in() { return {data: [], error: null}; }
};
const recoverySupabase = {
  from(table) {
    if (table === "orders") return {select: () => recoveryOrdersQuery};
    if (table === "core360_commerce_outbox") {
      return {
        insert(row) {
          recoveryOutboxRows.push(row);
          return {select: () => ({maybeSingle: async () => ({data: {id: "recovered-event", status: "pending"}, error: null})})};
        },
        select: () => recoveryExistingOutboxQuery
      };
    }
    throw new Error(`Unexpected recovery table ${table}`);
  }
};
const recovered = await reconcileMissingCore360ApprovedOrders({
  env: {CORE360_COMMERCE_SYNC_ENABLED: "true"},
  supabase: recoverySupabase
});
assert.equal(recovered.scanned, 1);
assert.equal(recovered.failed.length, 0);
assert.equal(recovered.queued[0]?.eventId, "recovered-event");
assert.equal(recoveryOutboxRows.length, 1);
assert.equal(recoveryOutboxRows[0]?.schema_version, 2);
assert.equal(recoveryOutboxRows[0]?.idempotency_key, event.idempotencyKey);

const disabledDelivery = await deliverCore360OutboxEvent({
  event: {id: "event-1", payload: event},
  fetchImpl: () => { throw new Error("The disabled adapter must not call Core360."); },
  supabase: {from: () => { throw new Error("The disabled adapter must not query Supabase."); }}
});
assert.deepEqual(disabledDelivery, {enabled: false, skipped: true, reason: "delivery-disabled"});

const outboxUpdates = [];
const deliverySupabase = {
  from(table) {
    if (table === "core360_product_mappings") {
      return {
        select() {
          return {
            in() {
              return {
                eq: async () => ({
                  data: [approvedCoreMapping],
                  error: null
                })
              };
            }
          };
        }
      };
    }
    if (table === "core360_commerce_outbox") {
      return {
        update(patch) {
          return {
            eq: async () => {
              outboxUpdates.push(patch);
              return {error: null};
            }
          };
        }
      };
    }
    throw new Error(`Unexpected table ${table}`);
  }
};
let callCount = 0;
await assert.rejects(
  () => deliverCore360OutboxEvent({
    env: {
      CORE360_BASE_URL: "https://core360.example.test",
      CORE360_COMMERCE_DELIVERY_ENABLED: "true",
      CORE360_COMMERCE_SYNC_ENABLED: "true",
      CORE360_COMMERCE_TOKEN: "test-only",
      CORE360_PARTNER_ID: "partner-fullness"
    },
    event: {attempt_count: 0, id: "event-2", payload: event},
    fetchImpl: async () => {
      callCount += 1;
      return callCount === 1
        ? {ok: true, json: async () => ({externalCustomerId: event.customer.externalCustomerId}), status: 200}
        : {ok: false, json: async () => ({code: "PRICE_RECONCILIATION_REQUIRED", message: "Catalog price differs."}), status: 409};
    },
    supabase: deliverySupabase
  }),
  (error) => error.code === "PRICE_RECONCILIATION_REQUIRED"
);
assert.equal(callCount, 2);
assert.equal(outboxUpdates.at(-1)?.status, "price_reconciliation_required");

console.log("Core360 commerce adapter: disabled-by-default and payload contract verified.");
