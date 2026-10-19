import assert from "node:assert/strict";
import {
  buildCore360PaymentApprovedEvent,
  createCore360CheckoutPreviewRequest,
  createCore360OrderEventRequest,
  createCore360OrderRequest,
  deliverCore360OrderEvent,
  deliverCore360OutboxEvent,
  enqueueCore360PaymentApproved,
  isCore360CommerceReadEnabled,
  isCore360CommerceCheckoutPreflightEnabled,
  isCore360CommercePollingEnabled,
  isCore360CommercePreviewEnabled,
  isCore360CommerceMediaProxyEnabled,
  isCore360CommerceMediaWriteEnabled,
  isCore360CommerceDeliveryEnabled,
  previewCore360Order,
  previewCore360Checkout,
  projectCore360CommerceRead,
  projectCore360ProductImageMetadata,
  readCore360Catalog,
  readCore360OrderStates,
  readCore360ProductImageBytes,
  readCore360ProductImageMetadata,
  readCore360Stock,
  recoverCore360CommerceDelivery,
  removeCore360ProductImage,
  isCore360CommerceSyncEnabled,
  reconcileMissingCore360ApprovedOrders,
  selectReconciledMercadoPagoPayment,
  uploadCore360ProductImage,
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
  commercial_version: "commercial-v1",
  core_item_id: "core-plan-semanal",
  gross_unit_price_minor: 44900,
  is_active: true,
  quantity_milli_per_unit: 1000,
  source_menu_item_id: approvedItems[0].product_id,
  tax_bps: 1900,
  uom_code: "un"
};

assert.equal(isCore360CommerceSyncEnabled({}), false);
assert.equal(isCore360CommerceReadEnabled({}), false);
assert.equal(isCore360CommercePollingEnabled({CORE360_COMMERCE_READ_ENABLED: "true"}), false);
assert.equal(isCore360CommercePreviewEnabled({CORE360_COMMERCE_READ_ENABLED: "true"}), false);
assert.equal(isCore360CommerceCheckoutPreflightEnabled({CORE360_COMMERCE_READ_ENABLED: "true", CORE360_COMMERCE_PREVIEW_ENABLED: "true"}), false);
assert.equal(isCore360CommerceMediaProxyEnabled({CORE360_COMMERCE_READ_ENABLED: "true"}), false);
assert.equal(isCore360CommerceMediaWriteEnabled({CORE360_COMMERCE_MEDIA_WRITE_ENABLED: "true"}), false);
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
assert.deepEqual(
  await readCore360ProductImageBytes({fetchImpl: () => { throw new Error("The disabled media proxy must not call Core360."); }}),
  {enabled: false, skipped: true, reason: "media-proxy-disabled"}
);
assert.deepEqual(
  await uploadCore360ProductImage({fetchImpl: () => { throw new Error("The disabled media writer must not call Core360."); }}),
  {enabled: false, skipped: true, reason: "media-write-disabled"}
);

const coreReads = [];
const readEnv = {
  CORE360_BASE_URL: "https://core360.example.test/",
  CORE360_COMMERCE_MEDIA_PROXY_ENABLED: "true",
  CORE360_COMMERCE_POLL_ENABLED: "true",
  CORE360_COMMERCE_PREVIEW_ENABLED: "true",
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
    query: {
      issuedOn: "2026-10-19",
      limit: 10,
      priceListId: "retail",
      quantities: {"core-plan-semanal": "1000"},
      quantityMilli: 1000,
      ignored: "must-not-pass"
    }
  }),
  {enabled: true, rows: [{id: "core-plan-semanal"}]}
);
const catalogReadUrl = new URL(coreReads[0].url);
assert.equal(catalogReadUrl.pathname, "/api/commerce/v1/products");
assert.equal(catalogReadUrl.searchParams.get("issuedOn"), "2026-10-19");
assert.equal(catalogReadUrl.searchParams.get("limit"), "10");
assert.equal(catalogReadUrl.searchParams.get("priceListId"), "retail");
assert.equal(catalogReadUrl.searchParams.get("quantityMilli"), "1000");
assert.equal(catalogReadUrl.searchParams.get("quantities"), '{"core-plan-semanal":"1000"}');
assert.equal(coreReads[0].request.method, "GET");
assert.equal(coreReads[0].request.headers.Authorization, "Bearer test-only");
assert.deepEqual(
  await readCore360Stock({
    env: readEnv,
    fetchImpl: async (url) => {
      coreReads.push({url});
      return {ok: true, json: async () => ({rows: [{available_milli: "5000", itemId: "core-plan-semanal"}]}), status: 200};
    },
    query: {issuedOn: "2026-10-19", itemId: "core-plan-semanal", limit: 1}
  }),
  {enabled: true, rows: [{available_milli: "5000", itemId: "core-plan-semanal"}]}
);
assert.match(coreReads[1].url, /\/api\/commerce\/v1\/stock\?itemId=core-plan-semanal&issuedOn=2026-10-19&limit=1$/);
assert.deepEqual(
  await readCore360OrderStates({
    env: readEnv,
    fetchImpl: async (url, request) => {
      coreReads.push({request, url});
      return {
        ok: true,
        json: async () => ({
          coreOrderId: "core-order-1",
          externalOrderId: approvedOrder.id,
          fiscal: {status: "pending"},
          fulfillment: {status: "preparing"},
          sourceVersion: "source-v2",
          version: 3
        }),
        status: 200
      };
    },
    query: {externalOrderId: approvedOrder.id}
  }),
  {
    coreOrderId: "core-order-1",
    enabled: true,
    externalOrderId: approvedOrder.id,
    fiscal: {status: "pending"},
    fulfillment: {status: "preparing"},
    sourceVersion: "source-v2",
    version: 3
  }
);
assert.match(coreReads[2].url, /\/api\/commerce\/v1\/orders\/11111111-1111-4111-8111-111111111111$/);
assert.deepEqual(
  await readCore360ProductImageMetadata({
    env: readEnv,
    fetchImpl: async (url) => {
      coreReads.push({url});
      return {ok: true, json: async () => ({image: {id: "image-v1", visibility: "private"}}), status: 200};
    },
    productId: "core-plan-semanal"
  }),
  {enabled: true, image: {id: "image-v1", visibility: "private"}}
);
assert.match(coreReads[3].url, /\/api\/commerce\/v1\/products\/core-plan-semanal\/image$/);
const imageBytes = await readCore360ProductImageBytes({
  env: readEnv,
  fetchImpl: async (url) => {
    coreReads.push({url});
    return {
      arrayBuffer: async () => new TextEncoder().encode("image").buffer,
      headers: new Headers({"content-type": "image/webp"}),
      ok: true
    };
  },
  imageVersionId: "image-v1",
  productId: "core-plan-semanal",
  variant: "thumbnail"
});
assert.equal(imageBytes.contentType, "image/webp");
assert.equal(new TextDecoder().decode(imageBytes.bytes), "image");
assert.match(coreReads[4].url, /\/api\/commerce\/v1\/products\/core-plan-semanal\/image\?imageVersionId=image-v1&variant=thumbnail$/);
const mediaWriteEnv = {
  ...readEnv,
  CORE360_COMMERCE_DELIVERY_ENABLED: "true",
  CORE360_COMMERCE_MEDIA_WRITE_ENABLED: "true",
  CORE360_COMMERCE_SYNC_ENABLED: "true"
};
const mediaWrites = [];
const upload = await uploadCore360ProductImage({
  bytes: new TextEncoder().encode("jpeg-bytes"),
  contentType: "image/jpeg",
  env: mediaWriteEnv,
  expectedVersion: 1,
  fetchImpl: async (url, request) => {
    mediaWrites.push({request, url});
    return {ok: true, json: async () => ({image: {id: "image-v2", version: 2}}), status: 200};
  },
  filename: "producto qa.jpg",
  idempotencyKey: "a0000001-0000-4000-8000-000000000001",
  productId: "core-plan-semanal"
});
assert.deepEqual(upload, {enabled: true, result: {image: {id: "image-v2", version: 2}}});
assert.equal(mediaWrites[0].request.method, "POST");
assert.equal(mediaWrites[0].request.headers.Authorization, "Bearer test-only");
assert.equal(mediaWrites[0].request.headers["x-core360-expected-version"], "1");
assert.equal(mediaWrites[0].request.headers["x-core360-request-id"], "a0000001-0000-4000-8000-000000000001");
assert.equal(mediaWrites[0].request.headers["Content-Type"], "image/jpeg");
assert.equal(mediaWrites[0].request.headers["Content-Length"], "10");
assert.equal(mediaWrites[0].request.headers["x-core360-filename"], "producto%20qa.jpg");
assert.equal(new TextDecoder().decode(mediaWrites[0].request.body), "jpeg-bytes");
assert.match(mediaWrites[0].url, /\/api\/commerce\/v1\/products\/core-plan-semanal\/image$/);
const removal = await removeCore360ProductImage({
  env: mediaWriteEnv,
  expectedVersion: 2,
  fetchImpl: async (url, request) => {
    mediaWrites.push({request, url});
    return {ok: true, json: async () => ({removed: true, version: 3}), status: 200};
  },
  idempotencyKey: "a0000002-0000-4000-8000-000000000002",
  productId: "core-plan-semanal"
});
assert.deepEqual(removal, {enabled: true, result: {removed: true, version: 3}});
assert.equal(mediaWrites[1].request.method, "DELETE");
assert.equal(mediaWrites[1].request.headers["Content-Type"], "application/json");
assert.equal(mediaWrites[1].request.body, '{"expectedVersion":2,"idempotencyKey":"a0000002-0000-4000-8000-000000000002"}');
const projectionWrites = {catalog: [], stock: []};
const projection = await projectCore360CommerceRead({
  env: readEnv,
  fetchImpl: async (url) => {
    if (url.includes("/products")) {
      return {
        ok: true,
        json: async () => ({rows: [{
          commercialVersion: "commercial-v1",
          currency: "CLP",
          id: "core-plan-semanal",
          inventory_enabled: false,
          lineGrossMinor: "44900",
          price_available: true,
          quantityMilli: "1000",
          sku: "PLAN-SEM-001",
          tax_bps: 1900,
          unit: "un",
          version: "commercial-v1"
        }]}),
        status: 200
      };
    }
    return {ok: true, json: async () => ({rows: []}), status: 200};
  },
  supabase: {
    from(table) {
      if (table === "core360_product_mappings") {
        const query = {
          eq() { return query; },
          then(resolve) { return Promise.resolve({error: null}).then(resolve); }
        };
        return {
          select: () => ({eq: async () => ({data: [approvedCoreMapping], error: null})}),
          update: () => query
        };
      }
      if (table === "core360_catalog_projection") {
        return {upsert: async (rows) => { projectionWrites.catalog.push(...rows); return {error: null}; }};
      }
      if (table === "core360_stock_projection") {
        return {upsert: async (rows) => { projectionWrites.stock.push(...rows); return {error: null}; }};
      }
      throw new Error(`Unexpected projection table ${table}`);
    }
  }
});
assert.deepEqual(projection, {catalogRows: 1, enabled: true, mappingFacts: 1, stockDetailsRead: 0, stockRows: 1, unavailable: 0});
assert.equal(projectionWrites.catalog[0]?.gross_minor, "44900");
assert.equal(projectionWrites.stock[0]?.inventory_managed, false);
assert.equal(projectionWrites.stock[0]?.available_milli, null);

const checkoutPreviewItem = {
  product: {
    core360_commercial_version: "commercial-v1",
    core360_item_id: "44444444-4444-4444-8444-444444444444",
    core360_quantity_milli_per_unit: 1000,
    core360_sku: "PLAN-SEM-001",
    core360_tax_bps: 1900,
    core360_uom_code: "un",
    price_clp: 44900
  },
  quantity: 1
};
assert.deepEqual(
  await previewCore360Checkout({
    fetchImpl: () => { throw new Error("El preflight apagado no debe llamar Core360."); },
    items: [checkoutPreviewItem]
  }),
  {enabled: false, skipped: true, reason: "checkout-preflight-disabled"}
);
const checkoutPreviewRequest = createCore360CheckoutPreviewRequest({
  config: {priceListId: "retail"},
  items: [checkoutPreviewItem],
  previewId: "preview-11111111-1111-4111-8111-111111111111"
});
assert.equal(checkoutPreviewRequest.order.payment.status, "unpaid");
assert.equal(checkoutPreviewRequest.order.payment.reference, "");
assert.equal(checkoutPreviewRequest.order.lines[0].itemId, checkoutPreviewItem.product.core360_item_id);
assert.equal(checkoutPreviewRequest.order.lines[0].lineGrossMinor, "44900");
let checkoutPreviewHttpCalls = 0;
const checkoutPreview = await previewCore360Checkout({
  env: readEnv,
  fetchImpl: async (url, request) => {
    checkoutPreviewHttpCalls += 1;
    const body = JSON.parse(request.body);
    assert.equal(body.payment.status, "unpaid");
    assert.equal(body.payment.reference, "");
    assert.match(url, /\/api\/commerce\/v1\/orders\/preview$/);
    return {ok: true, json: async () => ({
      currency: "CLP",
      lines: [{...body.lines[0], priceAvailable: true}],
      totalMinor: "44900",
      version: "preview-v1"
    }), status: 200};
  },
  items: [checkoutPreviewItem],
  previewId: "preview-22222222-2222-4222-8222-222222222222"
});
assert.equal(checkoutPreview.enabled, true);
assert.equal(checkoutPreviewHttpCalls, 1);
const pendingPreparationPreview = await previewCore360Checkout({
  env: readEnv,
  fetchImpl: async (url, request) => {
    const body = JSON.parse(request.body);
    assert.match(url, /\/api\/commerce\/v1\/orders\/preview$/);
    assert.equal(body.expectedTotalMinor, "37600");
    assert.equal(body.lines[0]?.lineGrossMinor, "37600");
    assert.equal(body.lines[0]?.quantityMilli, "2000");
    assert.equal(body.partnerId, undefined);
    assert.deepEqual(body.payment, {method: "other", reference: "", status: "unpaid"});
    return {ok: true, json: async () => ({
      currency: "CLP",
      fulfillmentStatus: "pending_preparation",
      lines: [{...body.lines[0], availableMilli: "0", priceAvailable: true}],
      totalMinor: "37600",
      version: "preview-pending-preparation-v1"
    }), status: 200};
  },
  items: [{
    product: {
      ...checkoutPreviewItem.product,
      price_clp: 18800
    },
    quantity: 2
  }],
  previewId: "preview-33333333-3333-4333-8333-333333333333"
});
assert.equal(pendingPreparationPreview.enabled, true);
assert.equal(pendingPreparationPreview.result.fulfillmentStatus, "pending_preparation");
await assert.rejects(
  previewCore360Checkout({
    env: readEnv,
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({code: "CATALOG_VERSION_CONFLICT", message: "Precio o disponibilidad cambió."}),
      status: 409
    }),
    items: [checkoutPreviewItem]
  }),
  (error) => error.code === "CATALOG_VERSION_CONFLICT"
);

const missingProjectionWrites = {catalog: [], stock: []};
const missingProjection = await projectCore360CommerceRead({
  env: readEnv,
  fetchImpl: async () => ({ok: true, json: async () => ({rows: []}), status: 200}),
  supabase: projectionSupabase({mapping: approvedCoreMapping, writes: missingProjectionWrites})
});
assert.equal(missingProjection.unavailable, 1);
assert.equal(missingProjectionWrites.catalog[0]?.core_item_available, false);
assert.equal(missingProjectionWrites.catalog[0]?.reconciliation_reason, "missing_core_item");
assert.equal(missingProjectionWrites.catalog[0]?.price_available, false);

const unavailableProjectionWrites = {catalog: [], stock: []};
const unavailableProjection = await projectCore360CommerceRead({
  env: readEnv,
  fetchImpl: async (url) => ({ok: true, json: async () => ({rows: url.includes("/products") ? [{
    commercialVersion: "commercial-v1",
    currency: "CLP",
    id: "core-plan-semanal",
    lineGrossMinor: "44900",
    quantityMilli: "1000",
    sale_enabled: false,
    sku: "PLAN-SEM-001",
    tax_bps: 1900,
    unit: "un"
  }] : []}), status: 200}),
  supabase: projectionSupabase({mapping: approvedCoreMapping, writes: unavailableProjectionWrites})
});
assert.equal(unavailableProjection.mappingFacts, 0);
assert.equal(unavailableProjectionWrites.catalog[0]?.core_item_available, false);
assert.equal(unavailableProjectionWrites.catalog[0]?.reconciliation_reason, "core_item_unavailable");
assert.equal(unavailableProjectionWrites.catalog[0]?.price_available, false);

const imageUpdates = [];
const imageMetadataRefresh = await projectCore360ProductImageMetadata({
  env: readEnv,
  fetchImpl: async () => ({ok: true, json: async () => ({image: {id: "image-current"}, version: 7}), status: 200}),
  supabase: imageProjectionSupabase({mapping: approvedCoreMapping, updates: imageUpdates})
});
assert.equal(imageMetadataRefresh.refreshed, 1);
assert.deepEqual(imageUpdates[0], {image_reference: "image-current", image_version: "7"});
const imageRefresh = await projectCore360ProductImageMetadata({
  env: readEnv,
  fetchImpl: async () => ({ok: false, json: async () => ({code: "NOT_FOUND"}), status: 404}),
  supabase: imageProjectionSupabase({mapping: approvedCoreMapping, updates: imageUpdates})
});
assert.equal(imageRefresh.refreshed, 1);
assert.deepEqual(imageUpdates[1], {image_reference: null, image_version: null});

const wakeup = {catalog: [], images: [], stock: []};
const wakeupResult = await recoverCore360CommerceDelivery({
  env: readEnv,
  fetchImpl: async (url) => {
    if (url.includes("/products/core-plan-semanal/image")) {
      wakeup.images.push(url);
      return {ok: true, json: async () => ({image: {id: "image-wakeup"}, version: 8}), status: 200};
    }
    if (url.includes("/products")) {
      wakeup.catalog.push(url);
      return {ok: true, json: async () => ({rows: [{
        commercialVersion: "commercial-v1",
        currency: "CLP",
        id: "core-plan-semanal",
        inventory_enabled: false,
        lineGrossMinor: "44900",
        quantityMilli: "1000",
        sku: "PLAN-SEM-001",
        tax_bps: 1900,
        unit: "un"
      }]}), status: 200};
    }
    wakeup.stock.push(url);
    return {ok: true, json: async () => ({rows: []}), status: 200};
  },
  supabase: wakeupSupabase({mapping: approvedCoreMapping})
});
assert.equal(wakeupResult.enabled, false);
assert.equal(wakeupResult.catalog.enabled, true);
assert.equal(wakeupResult.images.refreshed, 1);
assert.equal(wakeup.catalog.length, 1);
assert.equal(wakeup.images.length, 1);
assert.equal(wakeup.stock.length, 1);
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
assert.equal(event.customer.externalCustomerId, approvedOrder.id);
assert.equal(event.channel, "fullness-web");
assert.equal(event.schemaVersion, 2);
assert.equal(event.idempotencyKey, `web_order.payment_approved:${approvedOrder.id}:v2`);
assert.match(event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

const request = createCore360OrderRequest({
  config: {fiscalIntent: "pending", priceListId: ""},
  event,
  mappings: [approvedCoreMapping]
});
assert.equal(request.order.externalOrderId, approvedOrder.id);
assert.equal(request.order.expectedTotalMinor, "44900");
assert.deepEqual(request.order.lines, [{
  commercialVersion: "commercial-v1",
  itemId: "core-plan-semanal",
  lineGrossMinor: "44900",
  quantityMilli: "1000",
  taxBps: 1900,
  unitGrossMinor: "44900",
  unit: "un"
}]);
assert.equal(request.order.payment.status, "observed");
assert.deepEqual(Object.keys(request.order).sort(), [
  "currency", "expectedTotalMinor", "externalOrderId", "fiscalIntent", "issuedOn", "lines", "payment", "title"
]);

assert.throws(
  () => createCore360OrderRequest({
    config: {fiscalIntent: "pending", priceListId: ""},
    event: buildCore360PaymentApprovedEvent({
      items: approvedItems,
      order: {...approvedOrder, delivery_fee_clp: 2500, subtotal_clp: 44900, total_clp: 47400},
      payment: {...approvedPayment, transaction_amount_clp: 47400}
    }),
    mappings: [approvedCoreMapping]
  }),
  (error) => error.code === "ORDER_ADJUSTMENT_RECONCILIATION_REQUIRED"
);
assert.deepEqual(
  await previewCore360Order({
    event,
    fetchImpl: () => { throw new Error("The disabled preview must not call Core360."); },
    mappings: [approvedCoreMapping]
  }),
  {enabled: false, skipped: true, reason: "preview-disabled"}
);
let previewRequest;
const preview = await previewCore360Order({
  env: readEnv,
  event,
  fetchImpl: async (url, request) => {
    previewRequest = {request, url};
    return {ok: true, json: async () => ({currency: "CLP", totalMinor: "44900", version: "preview-v1"}), status: 200};
  },
  mappings: [approvedCoreMapping]
});
assert.equal(preview.enabled, true);
assert.match(previewRequest.url, /\/api\/commerce\/v1\/orders\/preview$/);
assert.equal(previewRequest.request.method, "POST");
assert.equal(JSON.parse(previewRequest.request.body).externalOrderId, approvedOrder.id);
const orderEvent = createCore360OrderEventRequest({
  amountMinor: 44900,
  confirmed: true,
  eventKind: "refund_observed",
  externalOrderId: approvedOrder.id,
  expectedVersion: 1,
  externalEventId: "fullness-refund-1",
  externalReference: "mercado_pago:123456789",
  issuedOn: "2026-10-19",
  observedAt: "2026-10-19T16:00:00.000Z"
});
assert.deepEqual(orderEvent, {
  externalOrderId: approvedOrder.id,
  request: {
    amountMinor: "44900",
    confirmed: true,
    currency: "CLP",
    eventKind: "refund_observed",
    expectedVersion: 1,
    externalEventId: "fullness-refund-1",
    externalReference: "mercado_pago:123456789",
    issuedOn: "2026-10-19",
    observedAt: "2026-10-19T16:00:00.000Z"
  }
});
assert.throws(
  () => createCore360OrderEventRequest({
    amountMinor: 44900,
    eventKind: "payment_observed",
    externalOrderId: approvedOrder.id,
    externalEventId: "fullness-payment-1",
    observedAt: "2026-10-19T16:00:00.000Z"
  }),
  (error) => error.code === "INVALID_CORE_ORDER_EVENT"
);
assert.throws(
  () => createCore360OrderEventRequest({
    eventKind: "cancellation_requested",
    externalOrderId: approvedOrder.id,
    externalEventId: "fullness-cancel-1",
    observedAt: "2026-10-19T16:00:00.000Z"
  }),
  (error) => error.code === "INVALID_CORE_ORDER_EVENT"
);
assert.deepEqual(
  await deliverCore360OrderEvent({
    externalOrderId: approvedOrder.id,
    eventKind: "refund_observed",
    externalEventId: "fullness-refund-1",
    fetchImpl: () => { throw new Error("The disabled event delivery must not call Core360."); },
    observedAt: "2026-10-19T16:00:00.000Z"
  }),
  {enabled: false, skipped: true, reason: "delivery-disabled"}
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
  gte() { return this; },
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
    if (table === "core360_commerce_sync_cursors") {
      return {
        select: () => ({eq: () => ({maybeSingle: async () => ({data: null, error: null})})}),
        upsert: async () => ({error: null})
      };
    }
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
  env: {CORE360_COMMERCE_SYNC_ENABLED: "true", CORE360_COMMERCE_SYNC_FROM: "2026-01-01T00:00:00.000Z"},
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
        select() { return mockOutboxSelect(event); },
        update(patch) {
          return mockOutboxUpdate(patch, outboxUpdates);
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
      CORE360_COMMERCE_SYNC_FROM: "2026-01-01T00:00:00.000Z",
      CORE360_COMMERCE_TOKEN: "test-only"
    },
    event: {attempt_count: 0, id: "event-2", payload: event},
    fetchImpl: async () => {
      callCount += 1;
      return {ok: false, json: async () => ({code: "PRICE_RECONCILIATION_REQUIRED", message: "Catalog price differs."}), status: 409};
    },
    supabase: deliverySupabase
  }),
  (error) => error.code === "PRICE_RECONCILIATION_REQUIRED"
);
assert.equal(callCount, 1);
assert.equal(outboxUpdates.at(-1)?.status, "price_reconciliation_required");

const acceptedOutboxUpdates = [];
const acceptedDeliverySupabase = {
  from(table) {
    if (table === "core360_product_mappings") {
      return {
        select() {
          return {
            in() {
              return {eq: async () => ({data: [approvedCoreMapping], error: null})};
            }
          };
        }
      };
    }
    if (table === "core360_commerce_outbox") {
      return {
        select() { return mockOutboxSelect(event); },
        update(patch) {
          return mockOutboxUpdate(patch, acceptedOutboxUpdates);
        }
      };
    }
    throw new Error(`Unexpected accepted-delivery table ${table}`);
  }
};
let acceptedDeliveryRequest;
const acceptedDelivery = await deliverCore360OutboxEvent({
  env: {
    CORE360_BASE_URL: "https://core360.example.test",
    CORE360_COMMERCE_DELIVERY_ENABLED: "true",
    CORE360_COMMERCE_SYNC_ENABLED: "true",
    CORE360_COMMERCE_SYNC_FROM: "2026-01-01T00:00:00.000Z",
    CORE360_COMMERCE_TOKEN: "test-only"
  },
  event: {attempt_count: 0, id: "event-3", payload: event},
  fetchImpl: async (url, request) => {
    acceptedDeliveryRequest = {request, url};
    return {ok: true, json: async () => ({id: "core-order-1", version: 1}), status: 200};
  },
  supabase: acceptedDeliverySupabase
});
assert.equal(acceptedDelivery.accepted, true);
assert.match(acceptedDeliveryRequest.url, /\/api\/commerce\/v1\/orders$/);
assert.deepEqual(JSON.parse(acceptedDeliveryRequest.request.body), request.order);
assert.equal(acceptedOutboxUpdates.at(-1)?.core_order_id, "core-order-1");
assert.equal(acceptedOutboxUpdates.at(-1)?.core_order_version, 1);
assert.equal(acceptedOutboxUpdates.at(-1)?.status, "accepted");

let staleDeliveryCalls = 0;
const staleOutboxUpdates = [];
const staleRecovery = await recoverCore360CommerceDelivery({
  env: {
    CORE360_BASE_URL: "https://core360.example.test",
    CORE360_COMMERCE_DELIVERY_ENABLED: "true",
    CORE360_COMMERCE_SYNC_ENABLED: "true",
    CORE360_COMMERCE_SYNC_FROM: "2026-01-01T00:00:00.000Z",
    CORE360_COMMERCE_TOKEN: "test-only"
  },
  fetchImpl: async () => {
    staleDeliveryCalls += 1;
    return {ok: true, json: async () => ({coreOrderId: "core-order-recovered", version: 2}), status: 200};
  },
  now: new Date("2026-10-19T17:00:00.000Z"),
  supabase: staleRecoverySupabase({event, mappings: [approvedCoreMapping], updates: staleOutboxUpdates})
});
assert.equal(staleRecovery.enabled, true);
assert.equal(staleRecovery.delivered.length, 1);
assert.equal(staleDeliveryCalls, 1);
assert.equal(staleOutboxUpdates.some((patch) => patch.status === "sending"), true);
assert.equal(staleOutboxUpdates.at(-1)?.status, "accepted");

console.log("Core360 commerce adapter: disabled-by-default and payload contract verified.");

function mockOutboxUpdate(patch, updates) {
  let recorded = false;
  const record = () => {
    if (!recorded) updates.push(patch);
    recorded = true;
  };
  const query = {
    eq() { record(); return query; },
    in() { return query; },
    lt() { return query; },
    select() { return {maybeSingle: async () => ({data: {id: "claimed-outbox"}, error: null})}; }
  };
  return query;
}

function mockOutboxSelect(payload) {
  const query = {
    eq() { return query; },
    maybeSingle: async () => ({
      data: {core_request: null, core_request_hash: null, id: "claimed-outbox", payload},
      error: null
    })
  };
  return query;
}

function staleRecoverySupabase({event, mappings, updates}) {
  const staleEvent = {
    attempt_count: 1,
    id: "stale-outbox-1",
    lease_expires_at: "2026-10-19T16:50:00.000Z",
    payload: event,
    status: "sending"
  };
  return {
    from(table) {
      if (table === "core360_commerce_sync_cursors") {
        return {
          select: () => ({eq: () => ({maybeSingle: async () => ({data: null, error: null})})}),
          upsert: async () => ({error: null})
        };
      }
      if (table === "orders") {
        return {select: () => ({eq() { return this; }, gte() { return this; }, order() { return this; }, limit: async () => ({data: [], error: null})})};
      }
      if (table === "core360_product_mappings") {
        return {
          select() {
            return {
              in() { return {eq: async () => ({data: mappings, error: null})}; }
            };
          }
        };
      }
      if (table === "core360_commerce_outbox") {
        return {
          select(columns = "") {
            const waiting = {
              in() { return waiting; },
              or() { return waiting; },
              order() { return waiting; },
              limit: async () => ({data: [], error: null})
            };
            const stale = {
              eq() { return stale; },
              lt() { return stale; },
              order() { return stale; },
              limit: async () => ({data: [staleEvent], error: null})
            };
            if (String(columns).includes("core_request")) {
              const dispatch = mockOutboxSelect(staleEvent.payload);
              dispatch.in = () => waiting;
              dispatch.eq = (field) => field === "status" ? stale : dispatch;
              return dispatch;
            }
            return {
              eq() { return stale; },
              in() { return waiting; }
            };
          },
          update(patch) { return mockOutboxUpdate(patch, updates); }
        };
      }
      throw new Error(`Unexpected stale recovery table ${table}`);
    }
  };
}

function projectionSupabase({mapping, writes}) {
  return {
    from(table) {
      if (table === "core360_product_mappings") {
        const updateQuery = {
          eq() { return updateQuery; },
          then(resolve) { return Promise.resolve({error: null}).then(resolve); }
        };
        return {
          select: () => ({eq: async () => ({data: [mapping], error: null})}),
          update: () => updateQuery
        };
      }
      if (table === "core360_catalog_projection") {
        return {upsert: async (rows) => { writes.catalog.push(...rows); return {error: null}; }};
      }
      if (table === "core360_stock_projection") {
        return {upsert: async (rows) => { writes.stock.push(...rows); return {error: null}; }};
      }
      throw new Error(`Unexpected projection table ${table}`);
    }
  };
}

function imageProjectionSupabase({mapping, updates}) {
  return {
    from(table) {
      if (table !== "core360_product_mappings") throw new Error(`Unexpected image table ${table}`);
      return {
        select: () => ({eq: async () => ({data: [mapping], error: null})}),
        update(patch) {
          updates.push(patch);
          const query = {
            eq() { return query; },
            then(resolve) { return Promise.resolve({error: null}).then(resolve); }
          };
          return query;
        }
      };
    }
  };
}

function wakeupSupabase({mapping}) {
  return {
    from(table) {
      if (table === "core360_product_mappings") {
        const updateQuery = {
          eq() { return updateQuery; },
          then(resolve) { return Promise.resolve({error: null}).then(resolve); }
        };
        return {
          select: () => ({eq: async () => ({data: [mapping], error: null})}),
          update: () => updateQuery
        };
      }
      if (table === "core360_catalog_projection" || table === "core360_stock_projection") {
        return {upsert: async () => ({error: null})};
      }
      if (table === "core360_commerce_sync_cursors") {
        return {
          select: () => ({eq: () => ({maybeSingle: async () => ({data: null, error: null})})}),
          upsert: async () => ({error: null})
        };
      }
      if (table === "core360_commerce_outbox") {
        const query = {
          eq() { return query; },
          not() { return query; },
          order() { return query; },
          limit: async () => ({data: [], error: null})
        };
        return {select: () => query};
      }
      throw new Error(`Unexpected wakeup table ${table}`);
    }
  };
}
