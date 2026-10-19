import assert from "node:assert/strict";
import {createHash, randomUUID} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {
  buildCore360PaymentApprovedEvent,
  createCore360OrderRequest,
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

const configPath = readConfigPath(process.argv.slice(2));
const config = await readQaConfig(configPath);
const qa = normalizeQaConfig(config);
const env = {
  CORE360_BASE_URL: qa.baseUrl,
  CORE360_COMMERCE_DELIVERY_ENABLED: "true",
  CORE360_COMMERCE_MEDIA_PROXY_ENABLED: "true",
  CORE360_COMMERCE_MEDIA_WRITE_ENABLED: "true",
  CORE360_COMMERCE_POLL_ENABLED: "true",
  CORE360_COMMERCE_PREVIEW_ENABLED: "true",
  CORE360_COMMERCE_READ_ENABLED: "true",
  CORE360_COMMERCE_SYNC_ENABLED: "true",
  CORE360_COMMERCE_SYNC_FROM: `${qa.issuedOn}T00:00:00.000Z`,
  CORE360_COMMERCE_TEST_MODE: "true",
  CORE360_COMMERCE_TOKEN: qa.bearerToken,
  CORE360_COMMERCE_CUSTOMER_MODE: "identified",
  CORE360_FISCAL_INTENT: "pending",
  CORE360_PRICE_LIST_ID: qa.priceListId
};

const sourceOrder = {
  currency: "CLP",
  customer_snapshot: {email: "core360-qa@fullnesslab.invalid", mode: "pickup", name: "Core360 QA"},
  delivery_fee_clp: 0,
  discount_clp: 0,
  client_id: qa.customerExternalId,
  id: qa.externalOrderId,
  paid_at: qa.observedAt,
  subtotal_clp: qa.grossUnitPriceMinor,
  total_clp: qa.grossUnitPriceMinor
};
const sourcePayment = {
  paid_at: qa.observedAt,
  provider: "mercado_pago",
  provider_payment_id: qa.paymentReference,
  status: "approved",
  transaction_amount_clp: qa.grossUnitPriceMinor
};
const sourceItems = [{
  id: qa.orderItemId,
  product_id: qa.sourceMenuItemId,
  product_snapshot: {
    core360PriceVersion: String(qa.commercialVersion),
    sku: qa.sku
  },
  quantity: 1,
  total_clp: qa.grossUnitPriceMinor,
  unit_price_clp: qa.grossUnitPriceMinor
}];
const mapping = {
  commercial_version: qa.commercialVersion,
  core_item_id: qa.coreItemId,
  core_sku: qa.sku,
  gross_unit_price_minor: qa.grossUnitPriceMinor,
  is_active: true,
  quantity_milli_per_unit: 1000,
  source_menu_item_id: qa.sourceMenuItemId,
  tax_bps: qa.taxBps,
  uom_code: qa.uom
};
const event = buildCore360PaymentApprovedEvent({items: sourceItems, order: sourceOrder, payment: sourcePayment});
const updates = [];
const supabase = mockSupabase({mapping, updates});

const catalog = await readCore360Catalog({
  env,
  query: {
    issuedOn: qa.issuedOn,
    quantities: {[qa.coreItemId]: "1000"},
    quantityMilli: 1000
  }
});
const catalogRow = rowsFrom(catalog).find((row) => String(row?.id || row?.itemId) === qa.coreItemId);
assert.ok(catalogRow, "Core360 no devolvió el artículo QA solicitado.");
const catalogCommercialVersion = requiredText(catalogRow?.commercialVersion, "commercialVersion de catálogo");
mapping.commercial_version = catalogCommercialVersion;
event.lines[0].commercial.priceVersion = catalogCommercialVersion;
sourceItems[0].product_snapshot.core360PriceVersion = catalogCommercialVersion;
assert.equal(String(catalogRow?.unit), qa.uom);
assert.equal(integer(catalogRow?.unitGrossMinor, "unitGrossMinor de catálogo"), qa.grossUnitPriceMinor);

const stock = await readCore360Stock({env, query: {issuedOn: qa.issuedOn, itemId: qa.coreItemId}});
assert.ok(rowsFrom(stock).some((row) => String(row?.itemId || row?.item_id) === qa.coreItemId), "Core360 no devolvió stock para el artículo QA.");

const metadata = await readCore360ProductImageMetadata({env, productId: qa.coreItemId});
const originalImageVersion = integer(metadata?.version, "version de metadata");
if (metadata?.image?.id) {
  const image = await readCore360ProductImageBytes({
    env,
    imageVersionId: metadata.image.id,
    productId: qa.coreItemId,
    variant: "image"
  });
  assert.match(image.contentType, /^image\/jpeg(?:;|$)/i, "Core360 QA debe devolver JPEG.");
  assert.ok(image.bytes.byteLength > 0, "Core360 devolvió una imagen QA vacía.");
}
const upload = await uploadCore360ProductImage({
  bytes: await qaImageBytes(),
  contentType: "image/png",
  env,
  expectedVersion: originalImageVersion,
  filename: "fullness-core360-qa.png",
  idempotencyKey: qa.uploadImageIdempotencyKey,
  productId: qa.coreItemId
});
const uploadedMetadata = await readCore360ProductImageMetadata({env, productId: qa.coreItemId});
const uploadedImageId = requiredText(uploadedMetadata?.image?.id, "image.id de metadata tras upload");
const uploadedImage = await readCore360ProductImageBytes({
  env,
  imageVersionId: uploadedImageId,
  productId: qa.coreItemId,
  variant: "image"
});
assert.match(uploadedImage.contentType, /^image\/jpeg(?:;|$)/i, "La imagen QA subida debe conservar MIME JPEG.");
assert.ok(uploadedImage.bytes.byteLength > 0, "Core360 devolvió una imagen QA subida vacía.");
const removal = await removeCore360ProductImage({
  env,
  expectedVersion: integer(uploadedMetadata?.version ?? upload?.result?.version, "version antes de remove"),
  idempotencyKey: qa.removeImageIdempotencyKey,
  productId: qa.coreItemId
});
assert.equal(removal.enabled, true);

const preview = await previewCore360Order({env, event, mappings: [mapping], supabase});
assert.equal(preview.enabled, true);
assert.equal(integer(preview.result?.totalMinor, "totalMinor del preview"), qa.grossUnitPriceMinor);

const firstDelivery = await deliverCore360OutboxEvent({
  env,
  event: {attempt_count: 0, id: qa.outboxId, payload: event},
  supabase
});
const replayDelivery = await deliverCore360OutboxEvent({
  env,
  event: {attempt_count: 1, id: qa.outboxId, payload: event},
  supabase
});
assert.ok(firstDelivery.coreOrderId, "Core360 no devolvió coreOrderId al crear la orden QA.");
assert.equal(replayDelivery.coreOrderId, firstDelivery.coreOrderId, "El replay creó una orden Core360 distinta.");
assert.equal(updates.filter((patch) => patch.status === "accepted").length, 2);

const initialState = await readCore360OrderStates({env, query: {externalOrderId: qa.externalOrderId}});
assert.equal(String(initialState?.externalOrderId), qa.externalOrderId);
assert.equal(integer(initialState?.version, "version de orden"), initialState.version);
assert.ok(requiredText(initialState?.sourceVersion, "sourceVersion de orden"));

const refund = await deliverCore360OrderEvent({
  amountMinor: qa.refundAmountMinor,
  confirmed: true,
  env,
  eventKind: "refund_observed",
  externalOrderId: qa.externalOrderId,
  expectedVersion: integer(initialState.version, "version antes del reembolso"),
  externalEventId: qa.refundEventId,
  externalReference: qa.refundReference,
  issuedOn: qa.issuedOn,
  observedAt: qa.refundObservedAt
});
assert.equal(refund.enabled, true);

const stateBeforeCancellation = await readCore360OrderStates({env, query: {externalOrderId: qa.externalOrderId}});
const documentVersion = readDocumentVersion(stateBeforeCancellation);
const cancellation = await deliverCore360OrderEvent({
  confirmed: true,
  env,
  eventKind: "cancellation_requested",
  externalOrderId: qa.externalOrderId,
  expectedDocumentVersion: documentVersion,
  expectedSourceVersion: requiredText(stateBeforeCancellation.sourceVersion, "sourceVersion antes de cancelar"),
  expectedVersion: integer(stateBeforeCancellation.version, "version antes de cancelar"),
  externalEventId: qa.cancellationEventId,
  issuedOn: qa.issuedOn,
  observedAt: qa.cancellationObservedAt,
  reason: "qa-isolated-core360"
});
assert.equal(cancellation.enabled, true);

await assertDuplicatePaymentIsRejected({
  env,
  mapping,
  qa,
  supabase,
  sourceItems,
  sourceOrder,
  sourcePayment
});
await assertForeignCoreCustomerIsRejected({env, event, mapping, qa});

const receipt = {
  adapterSha256: await sha256(path.resolve("server/core360-commerce-adapter.mjs")),
  assertions: [
    "catalog-quantities-milli-string",
    "stock",
    "private-image-upload-metadata-jpeg-and-remove",
    "preview",
    "create-and-replay",
    "order-source-version",
    "refund-observed",
    "cancellation-cas",
    "payment-reference-unique-across-orders"
    ,"foreign-customer-scope-rejected"
  ],
  coreOrderId: firstDelivery.coreOrderId,
  executedAt: new Date().toISOString(),
  externalOrderId: qa.externalOrderId,
  runnerSha256: await sha256(path.resolve("scripts/test-core360-commerce-core-qa.mjs")),
  status: "passed",
  target: qa.baseUrl
};
const receiptPath = path.resolve("runtime/fullness-core360-qa-receipt.local");
const serializedReceipt = `${JSON.stringify(receipt, null, 2)}\n`;
await mkdir(path.dirname(receiptPath), {recursive: true});
await writeFile(receiptPath, serializedReceipt, "utf8");
console.log(JSON.stringify({
  ...receipt,
  receiptPath,
  receiptSha256: createHash("sha256").update(serializedReceipt).digest("hex")
}, null, 2));

async function assertDuplicatePaymentIsRejected({env: qaEnv, mapping: qaMapping, qa: sourceQa, sourceItems: items, sourceOrder: order, sourcePayment: payment}) {
  const duplicateOrder = {...order, id: sourceQa.duplicatePaymentExternalOrderId};
  const duplicateItems = items.map((item) => ({...item, id: sourceQa.duplicateOrderItemId}));
  const duplicateEvent = buildCore360PaymentApprovedEvent({items: duplicateItems, order: duplicateOrder, payment});
  await assert.rejects(
    () => deliverCore360OutboxEvent({
      env: qaEnv,
      event: {attempt_count: 0, id: sourceQa.duplicateOutboxId, payload: duplicateEvent},
      supabase: mockSupabase({mapping: qaMapping, updates: []})
    }),
    (error) => Number(error?.statusCode) === 409
  );
}

async function assertForeignCoreCustomerIsRejected({env: qaEnv, event: qaEvent, mapping: qaMapping, qa: sourceQa}) {
  const base = createCore360OrderRequest({
    config: {fiscalIntent: "pending", partnerIdCore: sourceQa.foreignPartnerId, priceListId: qaEnv.CORE360_PRICE_LIST_ID},
    event: {...qaEvent, order: {...qaEvent.order, id: sourceQa.foreignOrderExternalId, externalOrderId: sourceQa.foreignOrderExternalId}},
    mappings: [qaMapping]
  }).order;
  base.payment.reference = "mercado_pago:fullness-core360-qa-foreign-customer";
  const response = await fetch(`${qaEnv.CORE360_BASE_URL}/api/commerce/v1/orders`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${qaEnv.CORE360_COMMERCE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(base)
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(payload?.code || payload?.error?.code, "API_CUSTOMER_SCOPE");
}

function mockSupabase({mapping: qaMapping, updates: outboxUpdates}) {
  const customerMappings = new Map();
  let persistedCoreRequest = null;
  let persistedCoreRequestHash = null;
  return {
    from(table) {
      if (table === "core360_product_mappings") {
        return {
          select() {
            return {
              in() {
                return {eq: async () => ({data: [qaMapping], error: null})};
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
                data: {
                  core_request: persistedCoreRequest,
                  core_request_hash: persistedCoreRequestHash,
                  id: qa.outboxId,
                  payload: event
                },
                error: null
              })
            };
            return query;
          },
          update(patch) {
            if (patch.core_request) persistedCoreRequest = patch.core_request;
            if (patch.core_request_hash) persistedCoreRequestHash = patch.core_request_hash;
            return mockOutboxUpdate(patch, outboxUpdates);
          }
        };
      }
      if (table === "core360_customer_mappings") {
        return {
          insert(row) {
            return (async () => {
              if (customerMappings.has(row.external_customer_id)) {
                return {error: {code: "23505", message: "duplicate key"}};
              }
              customerMappings.set(row.external_customer_id, row);
              return {error: null};
            })();
          },
          select() {
            return {
              eq(_field, value) {
                return {maybeSingle: async () => ({data: customerMappings.get(value) || null, error: null})};
              }
            };
          }
        };
      }
      throw new Error(`La QA no permite consultar la tabla ${table}.`);
    }
  };
}

function rowsFrom(result) {
  return Array.isArray(result?.rows) ? result.rows : [];
}

function readDocumentVersion(state) {
  const candidates = [
    state?.documentVersion,
    state?.document?.version,
    state?.order?.version,
    state?.fiscal?.documentVersion,
    state?.fiscal?.document?.version,
    state?.order?.version,
    state?.order?.documentVersion,
    state?.order?.document?.version
  ];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return integer(candidate, "documentVersion de orden");
    }
  }
  throw new Error("GET /orders/{externalOrderId} no devolvió documentVersion entero para la cancelación CAS.");
}

function integer(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} debe ser un entero no negativo.`);
  return parsed;
}

function readConfigPath(args) {
  if (args.length !== 2 || args[0] !== "--config") {
    throw new Error("Uso: node scripts/test-core360-commerce-core-qa.mjs --config <core360-commerce-qa.local.json>");
  }
  const candidate = path.resolve(args[1]);
  if (!candidate.endsWith(".local.json") && !candidate.includes(`${path.sep}.local${path.sep}`)) {
    throw new Error("La configuración QA debe estar en un archivo .local.json o dentro de una carpeta .local privada.");
  }
  return candidate;
}

async function readQaConfig(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    throw new Error("No pudimos abrir la configuración QA privada indicada.");
  }
}

function normalizeQaConfig(value) {
  const source = value && typeof value === "object" ? value : {};
  const raw = source.qa === true && Array.isArray(source.products) ? configFromSeedFixture(source) : source;
  const suppliedUrl = String(raw.baseUrl || "").replace(/\/+$/, "");
  const sourceUrl = new URL(suppliedUrl);
  const baseUrl = sourceUrl.origin;
  const url = new URL(baseUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "::1", "localhost"].includes(url.hostname) || url.port !== "3083") {
    throw new Error("La QA bilateral sólo permite http://localhost:3083 (o loopback equivalente).");
  }

  const qa = {
    baseUrl,
    bearerToken: requiredText(raw.bearerToken, "bearerToken"),
    cancellationEventId: requiredUuid(raw.cancellationEventId, "cancellationEventId"),
    cancellationObservedAt: requiredIso(raw.cancellationObservedAt, "cancellationObservedAt"),
    commercialVersion: requiredText(raw.commercialVersion, "commercialVersion"),
    coreItemId: requiredUuid(raw.coreItemId, "coreItemId"),
    duplicateOutboxId: requiredUuid(raw.duplicateOutboxId, "duplicateOutboxId"),
    duplicateOrderItemId: requiredUuid(raw.duplicateOrderItemId, "duplicateOrderItemId"),
    customerExternalId: requiredUuid(raw.customerExternalId, "customerExternalId"),
    duplicatePaymentExternalOrderId: requiredExternalOrderId(raw.duplicatePaymentExternalOrderId, "duplicatePaymentExternalOrderId"),
    externalOrderId: requiredExternalOrderId(raw.externalOrderId, "externalOrderId"),
    foreignOrderExternalId: requiredExternalOrderId(raw.foreignOrderExternalId, "foreignOrderExternalId"),
    foreignPartnerId: requiredUuid(raw.foreignPartnerId, "foreignPartnerId"),
    grossUnitPriceMinor: positiveInteger(raw.grossUnitPriceMinor, "grossUnitPriceMinor"),
    issuedOn: requiredDate(raw.issuedOn, "issuedOn"),
    orderItemId: requiredUuid(raw.orderItemId, "orderItemId"),
    outboxId: requiredUuid(raw.outboxId, "outboxId"),
    paymentReference: requiredText(raw.paymentReference, "paymentReference"),
    priceListId: optionalText(raw.priceListId),
    refundAmountMinor: positiveInteger(raw.refundAmountMinor, "refundAmountMinor"),
    refundEventId: requiredUuid(raw.refundEventId, "refundEventId"),
    refundObservedAt: requiredIso(raw.refundObservedAt, "refundObservedAt"),
    refundReference: requiredText(raw.refundReference, "refundReference"),
    removeImageIdempotencyKey: requiredText(raw.removeImageIdempotencyKey, "removeImageIdempotencyKey"),
    sku: requiredText(raw.sku, "sku"),
    sourceMenuItemId: requiredUuid(raw.sourceMenuItemId, "sourceMenuItemId"),
    taxBps: integer(raw.taxBps, "taxBps"),
    uom: requiredText(raw.uom, "uom"),
    uploadImageIdempotencyKey: requiredText(raw.uploadImageIdempotencyKey, "uploadImageIdempotencyKey")
  };
  if (qa.grossUnitPriceMinor !== 18800) throw new Error("La QA aislada actual exige grossUnitPriceMinor=18800.");
  if (qa.taxBps < 0 || qa.taxBps > 10000) throw new Error("taxBps está fuera de rango.");
  if (qa.uom !== "un") throw new Error("La QA aislada actual exige UOM canónica un.");
  return qa;
}

function configFromSeedFixture(seed) {
  const product = seed.products.find((item) => item?.itemType === "product" && Number(item?.unitPriceMinor) === 18800);
  if (!product) throw new Error("El fixture QA no contiene el producto ficticio bruto CLP 18.800.");
  // The isolated Core QA validates its own temporal origin. Keep the product
  // fixture, but generate a fresh order/event timeline so a yesterday fixture
  // cannot fail before exercising the contract.
  const observedAt = new Date(Date.now() - 3 * 60_000);
  const refundObservedAt = new Date(observedAt.getTime() + 60_000);
  const cancellationObservedAt = new Date(observedAt.getTime() + 120_000);
  const issuedOn = observedAt.toISOString().slice(0, 10);
  const runId = randomUUID();
  return {
    baseUrl: seed.baseUrl,
    bearerToken: seed.token,
    cancellationEventId: randomUUID(),
    cancellationObservedAt: cancellationObservedAt.toISOString(),
    commercialVersion: String(product.commercialVersion ?? "1"),
    coreItemId: product.coreItemId,
    duplicateOutboxId: "a0000002-0000-4000-8000-000000000002",
    duplicateOrderItemId: "a0000003-0000-4000-8000-000000000003",
    customerExternalId: randomUUID(),
    duplicatePaymentExternalOrderId: `fullness-adapter-duplicate-${runId}`,
    externalOrderId: `fullness-adapter-order-${runId}`,
    foreignOrderExternalId: `fullness-adapter-foreign-${runId}`,
    foreignPartnerId: randomUUID(),
    grossUnitPriceMinor: product.unitPriceMinor,
    issuedOn,
    orderItemId: randomUUID(),
    outboxId: randomUUID(),
    paymentReference: `fullness-core360-qa-payment-${runId}`,
    priceListId: seed.priceListId || "",
    refundAmountMinor: product.unitPriceMinor,
    refundEventId: randomUUID(),
    observedAt: observedAt.toISOString(),
    refundObservedAt: refundObservedAt.toISOString(),
    refundReference: `fullness-core360-qa-refund-${runId}`,
    removeImageIdempotencyKey: randomUUID(),
    sku: product.sku,
    sourceMenuItemId: product.externalItemId,
    taxBps: product.taxBps,
    uom: product.unit || "un",
    uploadImageIdempotencyKey: randomUUID()
  };
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} es obligatorio en la configuración QA.`);
  return text;
}

function optionalText(value) {
  return String(value ?? "").trim();
}

function positiveInteger(value, label) {
  const parsed = integer(value, label);
  if (parsed <= 0) throw new Error(`${label} debe ser mayor que cero.`);
  return parsed;
}

function requiredUuid(value, label) {
  const text = requiredText(value, label);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error(`${label} debe ser UUID.`);
  }
  return text;
}

function requiredExternalOrderId(value, label) {
  const text = requiredText(value, label);
  if (!/^[a-z0-9][a-z0-9-]{2,127}$/i.test(text)) {
    throw new Error(`${label} debe ser un identificador externo seguro.`);
  }
  return text;
}

function requiredDate(value, label) {
  const text = requiredText(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} debe usar YYYY-MM-DD.`);
  return text;
}

function requiredIso(value, label) {
  const text = requiredText(value, label);
  if (Number.isNaN(new Date(text).getTime())) throw new Error(`${label} debe ser ISO válida.`);
  return text;
}

async function qaImageBytes() {
  const source = path.join(path.dirname(configPath), "qa-image.png");
  const bytes = await readFile(source);
  if (bytes.byteLength === 0 || bytes.byteLength > 4 * 1024 * 1024) {
    throw new Error("La imagen local ficticia de QA debe existir y medir hasta 4 MB.");
  }
  return new Uint8Array(bytes);
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
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
