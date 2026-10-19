import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {
  buildCore360PaymentApprovedEvent,
  deliverCore360OrderEvent,
  deliverCore360OutboxEvent,
  previewCore360Order,
  readCore360Catalog,
  readCore360OrderStates,
  readCore360ProductImageBytes,
  readCore360ProductImageMetadata,
  readCore360Stock,
  removeCore360ProductImage,
  uploadCore360ProductImage
} from "../server/core360-commerce-adapter.mjs";

const orderId = "11111111-1111-4111-8111-111111111111";
const sourceMenuItemId = "22222222-2222-4222-8222-222222222222";
const state = {
  events: [],
  image: {bytes: Buffer.from("loopback-image"), contentType: "image/webp", id: "image-v1", version: 1},
  orderRequests: [],
  previewRequests: []
};
const server = createServer((request, response) => {
  void handle(request, response).catch((error) => {
    response.writeHead(500, {"content-type": "application/json"});
    response.end(JSON.stringify({code: "LOOPBACK_ASSERTION_FAILED", message: error.message}));
  });
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
if (!address || typeof address === "string") throw new Error("No pudimos abrir el Core360 loopback QA.");

const env = {
  CORE360_BASE_URL: `http://127.0.0.1:${address.port}`,
  CORE360_COMMERCE_DELIVERY_ENABLED: "true",
  CORE360_COMMERCE_MEDIA_PROXY_ENABLED: "true",
  CORE360_COMMERCE_MEDIA_WRITE_ENABLED: "true",
  CORE360_COMMERCE_POLL_ENABLED: "true",
  CORE360_COMMERCE_PREVIEW_ENABLED: "true",
  CORE360_COMMERCE_READ_ENABLED: "true",
  CORE360_COMMERCE_SYNC_ENABLED: "true",
  CORE360_COMMERCE_SYNC_FROM: "2026-10-19T00:00:00.000Z",
  CORE360_COMMERCE_TEST_MODE: "true",
  CORE360_COMMERCE_TOKEN: "loopback-test-token",
  CORE360_FISCAL_INTENT: "pending"
};

const sourceOrder = {
  currency: "CLP",
  customer_snapshot: {email: "qa@example.test", mode: "pickup", name: "QA"},
  delivery_fee_clp: 0,
  discount_clp: 0,
  id: orderId,
  paid_at: "2026-10-19T16:00:00.000Z",
  subtotal_clp: 18800,
  total_clp: 18800
};
const payment = {
  paid_at: "2026-10-19T16:00:00.000Z",
  provider: "mercado_pago",
  provider_payment_id: "mp-loopback-1",
  status: "approved",
  transaction_amount_clp: 18800
};
const sourceItems = [{
  id: "33333333-3333-4333-8333-333333333333",
  product_id: sourceMenuItemId,
  product_snapshot: {sku: "FULLNESS-QA-1"},
  quantity: 1,
  total_clp: 18800,
  unit_price_clp: 18800
}];
const mapping = {
  commercial_version: "commercial-v1",
  core_item_id: "core-item-qa",
  core_sku: "FULLNESS-QA-1",
  gross_unit_price_minor: 18800,
  is_active: true,
  quantity_milli_per_unit: 1000,
  source_menu_item_id: sourceMenuItemId,
  tax_bps: 1900,
  uom_code: "un"
};
const event = buildCore360PaymentApprovedEvent({items: sourceItems, order: sourceOrder, payment});

try {
  const catalog = await readCore360Catalog({
    env,
    query: {issuedOn: "2026-10-19", quantities: {"core-item-qa": "1000"}, quantityMilli: 1000}
  });
  assert.equal(catalog.rows[0]?.commercialVersion, "commercial-v1");
  assert.equal(catalog.rows[0]?.unit, "un");

  const stock = await readCore360Stock({env, query: {issuedOn: "2026-10-19", itemId: "core-item-qa"}});
  assert.equal(stock.rows[0]?.availabilityVersion, 1);

  const metadata = await readCore360ProductImageMetadata({env, productId: "core-item-qa"});
  assert.equal(metadata.image?.id, "image-v1");
  assert.equal(metadata.image?.visibility, "private");
  const image = await readCore360ProductImageBytes({
    env,
    imageVersionId: "image-v1",
    productId: "core-item-qa",
    variant: "thumbnail"
  });
  assert.equal(image.contentType, "image/webp");
  assert.equal(new TextDecoder().decode(image.bytes), "loopback-image");
  const uploaded = await uploadCore360ProductImage({
    bytes: new TextEncoder().encode("replacement-jpeg"),
    contentType: "image/jpeg",
    env,
    expectedVersion: 1,
    filename: "reemplazo-qa.jpg",
    idempotencyKey: "a0000001-0000-4000-8000-000000000001",
    productId: "core-item-qa"
  });
  assert.equal(uploaded.result.image?.id, "image-v2");
  const replacementMetadata = await readCore360ProductImageMetadata({env, productId: "core-item-qa"});
  assert.equal(replacementMetadata.image?.id, "image-v2");
  const replacement = await readCore360ProductImageBytes({
    env,
    imageVersionId: "image-v2",
    productId: "core-item-qa"
  });
  assert.equal(replacement.contentType, "image/jpeg");
  assert.equal(new TextDecoder().decode(replacement.bytes), "replacement-jpeg");
  const removed = await removeCore360ProductImage({
    env,
    expectedVersion: 2,
    idempotencyKey: "a0000002-0000-4000-8000-000000000002",
    productId: "core-item-qa"
  });
  assert.equal(removed.result.removed, true);

  const preview = await previewCore360Order({env, event, mappings: [mapping]});
  assert.equal(preview.result.totalMinor, "18800");
  assert.equal(state.previewRequests.length, 1);

  const outboxUpdates = [];
  const supabase = mockSupabase({mappings: [mapping], outboxUpdates});
  const delivery = await deliverCore360OutboxEvent({
    env,
    event: {attempt_count: 0, id: "outbox-loopback-1", payload: event},
    supabase
  });
  assert.equal(delivery.accepted, true);
  assert.equal(delivery.coreOrderId, "core-order-qa");
  assert.equal(state.orderRequests.length, 1);
  assert.equal(outboxUpdates.at(-1)?.core_order_version, 1);

  const orderState = await readCore360OrderStates({env, query: {externalOrderId: orderId}});
  assert.equal(orderState.coreOrderId, "core-order-qa");
  assert.equal(orderState.sourceVersion, "source-v1");

  const cancellation = await deliverCore360OrderEvent({
    confirmed: true,
    env,
    eventKind: "cancellation_requested",
    externalOrderId: orderId,
    expectedDocumentVersion: 1,
    expectedSourceVersion: orderState.sourceVersion,
    expectedVersion: orderState.version,
    externalEventId: "fullness-cancel-loopback-1",
    issuedOn: "2026-10-19",
    observedAt: "2026-10-19T16:10:00.000Z",
    reason: "qa-only"
  });
  assert.equal(cancellation.result.accepted, true);
  assert.equal(state.events[0]?.expectedSourceVersion, "source-v1");

  console.log("Core360 loopback acceptance: catalog, stock, media, preview, outbox, states and cancellation passed.");
} finally {
  server.close();
  await once(server, "close");
}

async function handle(request, response) {
  assert.equal(request.headers.authorization, "Bearer loopback-test-token");
  const url = new URL(request.url, env.CORE360_BASE_URL);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/commerce/v1/products") {
    assert.equal(url.searchParams.get("issuedOn"), "2026-10-19");
    assert.equal(url.searchParams.get("quantityMilli"), "1000");
    assert.equal(url.searchParams.get("quantities"), '{"core-item-qa":"1000"}');
    return json(response, 200, {rows: [{commercialVersion: "commercial-v1", id: "core-item-qa", unit: "un"}]});
  }
  if (request.method === "GET" && path === "/api/commerce/v1/stock") {
    assert.equal(url.searchParams.get("issuedOn"), "2026-10-19");
    return json(response, 200, {rows: [{availabilityVersion: 1, itemId: "core-item-qa"}]});
  }
  if (request.method === "GET" && path === "/api/commerce/v1/products/core-item-qa/image" && !url.searchParams.has("variant")) {
    return json(response, 200, {image: {id: state.image?.id, visibility: "private", version: state.image?.version}});
  }
  if (request.method === "GET" && path === "/api/commerce/v1/products/core-item-qa/image") {
    assert.equal(url.searchParams.get("imageVersionId"), state.image?.id);
    response.writeHead(200, {"content-type": state.image?.contentType});
    response.end(state.image?.bytes);
    return;
  }
  if (request.method === "POST" && path === "/api/commerce/v1/products/core-item-qa/image") {
    assert.equal(request.headers["x-core360-expected-version"], "1");
    assert.equal(request.headers["x-core360-request-id"], "a0000001-0000-4000-8000-000000000001");
    assert.equal(request.headers["content-type"], "image/jpeg");
    assert.equal(request.headers["content-length"], "16");
    assert.equal(request.headers["x-core360-filename"], "reemplazo-qa.jpg");
    assert.equal((await readBuffer(request)).toString("utf8"), "replacement-jpeg");
    state.image = {bytes: Buffer.from("replacement-jpeg"), contentType: "image/jpeg", id: "image-v2", version: 2};
    return json(response, 200, {image: {id: state.image.id, version: state.image.version}});
  }
  if (request.method === "DELETE" && path === "/api/commerce/v1/products/core-item-qa/image") {
    assert.equal(request.headers["content-type"], "application/json");
    assert.deepEqual(await readBody(request), {expectedVersion: 2, idempotencyKey: "a0000002-0000-4000-8000-000000000002"});
    state.image = null;
    return json(response, 200, {removed: true, version: 3});
  }
  if (request.method === "POST" && path === "/api/commerce/v1/orders/preview") {
    const body = await readBody(request);
    assertFlatOrder(body);
    state.previewRequests.push(body);
    return json(response, 200, {currency: "CLP", totalMinor: "18800", version: "preview-v1"});
  }
  if (request.method === "POST" && path === "/api/commerce/v1/orders") {
    const body = await readBody(request);
    assertFlatOrder(body);
    state.orderRequests.push(body);
    return json(response, 200, {coreOrderId: "core-order-qa", version: 1});
  }
  if (request.method === "GET" && path === `/api/commerce/v1/orders/${orderId}`) {
    return json(response, 200, {
      coreOrderId: "core-order-qa",
      externalOrderId: orderId,
      fiscal: {status: "pending"},
      fulfillment: {status: "preparing"},
      sourceVersion: "source-v1",
      version: 1
    });
  }
  if (request.method === "POST" && path === `/api/commerce/v1/orders/${orderId}/events`) {
    const body = await readBody(request);
    assert.equal(body.eventKind, "cancellation_requested");
    assert.equal(body.confirmed, true);
    assert.equal(body.expectedVersion, 1);
    assert.equal(body.expectedDocumentVersion, 1);
    assert.equal(body.expectedSourceVersion, "source-v1");
    assert.equal(body.issuedOn, "2026-10-19");
    state.events.push(body);
    return json(response, 200, {accepted: true, sourceVersion: 2});
  }

  return json(response, 404, {code: "NOT_FOUND", message: `${request.method} ${path}`});
}

function assertFlatOrder(body) {
  assert.deepEqual(Object.keys(body).sort(), [
    "currency", "expectedTotalMinor", "externalOrderId", "fiscalIntent", "issuedOn", "lines", "payment", "title"
  ]);
  assert.equal(body.externalOrderId, orderId);
  assert.equal(body.expectedTotalMinor, "18800");
  assert.equal(body.fiscalIntent, "pending");
  assert.deepEqual(body.lines, [{
      commercialVersion: "commercial-v1",
    itemId: "core-item-qa",
    lineGrossMinor: "18800",
    quantityMilli: "1000",
    sku: "FULLNESS-QA-1",
    taxBps: 1900,
    unit: "un",
    unitGrossMinor: "18800"
  }]);
  assert.deepEqual(body.payment, {method: "other", reference: "mercado_pago:mp-loopback-1", status: "observed"});
}

function mockSupabase({mappings, outboxUpdates}) {
  return {
    from(table) {
      if (table === "core360_product_mappings") {
        return {
          select() {
            return {
              in() {
                return {eq: async () => ({data: mappings, error: null})};
              }
            };
          }
        };
      }
      if (table === "core360_commerce_outbox") {
        return {
          select() {
            const query = {
              eq() { return query; },
              maybeSingle: async () => ({
                data: {core_request: null, core_request_hash: null, id: "outbox-loopback-1", payload: event},
                error: null
              })
            };
            return query;
          },
          update(patch) {
            return mockOutboxUpdate(patch, outboxUpdates);
          }
        };
      }
      throw new Error(`Unexpected loopback table ${table}`);
    }
  };
}

async function readBody(request) {
  return JSON.parse((await readBuffer(request)).toString("utf8"));
}

async function readBuffer(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function json(response, status, payload) {
  response.writeHead(status, {"content-type": "application/json"});
  response.end(JSON.stringify(payload));
}

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
