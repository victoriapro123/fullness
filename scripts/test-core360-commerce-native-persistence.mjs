import assert from "node:assert/strict";
import {createHash, createHmac, randomBytes, randomUUID} from "node:crypto";
import {spawn} from "node:child_process";
import {access, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {createServer, request as httpRequest} from "node:http";
import net from "node:net";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createClient} from "@supabase/supabase-js";
import {
  buildCore360PaymentApprovedEvent,
  deliverCore360OutboxEvent,
  enqueueCore360PaymentApproved,
  previewCore360Order,
  projectCore360CommerceRead,
  projectCore360OrderStates,
  readCore360Catalog,
  readCore360OrderStates,
  readCore360ProductImageBytes,
  readCore360ProductImageMetadata,
  reconcileMissingCore360ApprovedOrders,
  recoverCore360CommerceDelivery,
  removeCore360ProductImage,
  uploadCore360ProductImage
} from "../server/core360-commerce-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parseOptions(process.argv.slice(2));
const runId = randomUUID();
const baseDir = path.resolve(root, "runtime", "fullness-core360-native-qa.local");
const runDir = path.resolve(baseDir, runId);
const dataDir = path.resolve(runDir, "postgres-data");
const postgresBin = path.resolve(options.postgresBin);
const postgrestBin = path.resolve(options.postgrestBin);
const qaConfigPath = path.resolve(options.coreQaConfig);
const receiptPath = path.resolve(root, "runtime", "fullness-core360-native-qa-receipt.local");
const result = {
  candidateSha256: null,
  coreQa: "loopback:3083",
  finishedAt: null,
  postgres: null,
  postgrest: null,
  runId,
  startedAt: new Date().toISOString(),
  tests: []
};

let postgresStarted = false;
let postgrestProcess = null;
let postgresPort = null;
let postgrestPort = null;
let supabasePort = null;
let supabaseProxy = null;

try {
  await ensurePrivateQaPaths();
  const qa = await readQaFixture(qaConfigPath);
  const candidateBytes = await readFile(path.resolve(root, "supabase", "candidates", "core360-commerce-outbox.sql"));
  result.candidateSha256 = sha256(candidateBytes);
  await mkdir(runDir, {recursive: true});

  postgresPort = await availablePort();
  postgrestPort = await availablePort();
  supabasePort = await availablePort();
  await startPostgres();
  await applySchema(candidateBytes);
  const supabase = await startPostgrest();
  const env = coreQaEnvironment(qa);

  const catalog = await readCore360Catalog({
    env,
    query: {issuedOn: qa.issuedOn, quantities: {[qa.coreItemId]: "1000"}, quantityMilli: 1000}
  });
  const catalogRow = rowsFrom(catalog).find((row) => String(row?.id || row?.itemId) === qa.coreItemId);
  assert.ok(catalogRow, "Core360 QA no devolvió el artículo canónico solicitado.");
  assert.equal(String(catalogRow?.unit), "un");
  assert.equal(integer(catalogRow?.unitGrossMinor), qa.grossUnitPriceMinor);
  const commercialVersion = requiredText(catalogRow?.commercialVersion, "commercialVersion Core360");
  qa.commercialVersion = commercialVersion;

  await seedEditorialAndMapping({commercialVersion, qa, supabase});
  await check("SDK oficial consulta PostgREST y persiste el mapeo UUID opaco", async () => {
    const {data, error} = await supabase
      .from("core360_product_mappings")
      .select("source_menu_item_id,core_item_id,uom_code,quantity_milli_per_unit,commercial_version")
      .eq("source_menu_item_id", qa.sourceMenuItemId)
      .maybeSingle();
    assert.ifError(error);
    assert.deepEqual(data, {
      commercial_version: commercialVersion,
      core_item_id: qa.coreItemId,
      quantity_milli_per_unit: 1000,
      source_menu_item_id: qa.sourceMenuItemId,
      uom_code: "un"
    });
  });

  const first = await createPaidOrder({qa, suffix: "first", supabase});
  const firstEvent = buildCore360PaymentApprovedEvent(first);
  const queued = await enqueueCore360PaymentApproved({...first, env, supabase});
  assert.equal(queued.status, "pending");
  const duplicateQueue = await enqueueCore360PaymentApproved({...first, env, supabase});
  assert.equal(duplicateQueue.reused, true);
  const queuedRow = await outboxRow({id: queued.eventId, supabase});
  await check("outbox real conserva una sola orden aprobada y la vista previa canónica", async () => {
    assert.equal(queuedRow.status, "pending");
    const preview = await previewCore360Order({env, event: firstEvent, mappings: [mappingFor({commercialVersion, qa})], supabase});
    assert.equal(integer(preview.result?.totalMinor), qa.grossUnitPriceMinor);
  });

  const delivered = await deliverCore360OutboxEvent({env, event: queuedRow, supabase});
  const acceptedRow = await outboxRow({id: queued.eventId, supabase});
  await check("worker real crea pedido una vez y persiste solicitud Core inmutable antes del POST", async () => {
    assert.equal(delivered.accepted, true);
    assert.ok(delivered.coreOrderId);
    assert.equal(acceptedRow.status, "accepted");
    assert.equal(acceptedRow.core_order_id, delivered.coreOrderId);
    assert.ok(acceptedRow.core_request_hash);
    assert.equal(acceptedRow.core_request?.externalOrderId, first.order.id);
    assert.equal(acceptedRow.core_request?.lines?.[0]?.quantityMilli, "1000");
    const {data: customerMapping, error} = await supabase
      .from("core360_customer_mappings")
      .select("external_customer_id,core_partner_id")
      .eq("external_customer_id", first.order.client_id)
      .maybeSingle();
    assert.ifError(error);
    assert.equal(customerMapping?.external_customer_id, first.order.client_id);
    assert.ok(customerMapping?.core_partner_id);
  });
  const firstState = await readCore360OrderStates({env, query: {externalOrderId: first.order.id}});
  await check("estado Core360 se obtiene por externalOrderId y conserva la misma orden", async () => {
    assert.equal(firstState?.coreOrderId, delivered.coreOrderId);
    assert.ok(requiredText(firstState?.sourceVersion, "sourceVersion"));
  });
  await testOrderStateProjection({delivered, env, first, firstState, supabase});

  await testLostAcknowledgementReplay({commercialVersion, env, qa, supabase});
  await testConcurrentClaim({env, qa, supabase});
  await testExpiredLeaseAndStaleFinish({env, qa, supabase});
  await testRecoveryFromApprovedOrder({env, qa, supabase});
  await testCursorPaginationBeyondFifty({env, qa, supabase});
  await testReadProjection({env, qa, supabase});
  await testPrivateMediaRoundTrip({env, qa});
} catch (error) {
  result.error = {
    code: String(error?.code || error?.name || "NATIVE_QA_FAILED"),
    message: String(error?.message || "Native persistence QA failed.")
  };
} finally {
  result.finishedAt = new Date().toISOString();
  result.passed = !result.error && result.tests.every((entry) => entry.passed);
  await stopProcesses();
  await rm(dataDir, {force: true, recursive: true}).catch(() => {});
  await mkdir(path.dirname(receiptPath), {recursive: true});
  await writeFile(receiptPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({passed: result.passed, receiptPath, tests: result.tests, error: result.error || null}, null, 2));
if (!result.passed) process.exitCode = 1;

async function testLostAcknowledgementReplay({commercialVersion, env, qa, supabase}) {
  const source = await createPaidOrder({qa, suffix: "ack-lost", supabase});
  const queued = await enqueueCore360PaymentApproved({...source, env, supabase});
  const before = await outboxRow({id: queued.eventId, supabase});
  let createdCoreOrderId = "";
  const lostAcknowledgementFetch = async (url, request) => {
    const response = await fetch(url, request);
    if (request?.method === "POST" && String(url).endsWith("/api/commerce/v1/orders")) {
      createdCoreOrderId = String((await response.clone().json())?.coreOrderId || "");
      return {ok: false, status: 503, json: async () => ({code: "ACK_LOST", message: "QA simula pérdida de confirmación después del POST Core360."})};
    }
    return response;
  };
  await assert.rejects(
    () => deliverCore360OutboxEvent({env, event: before, fetchImpl: lostAcknowledgementFetch, supabase}),
    (error) => error?.code === "ACK_LOST"
  );
  const afterLostAck = await outboxRow({id: queued.eventId, supabase});
  assert.equal(afterLostAck.status, "retry");
  assert.ok(createdCoreOrderId);
  const frozenVersion = afterLostAck.core_request?.lines?.[0]?.commercialVersion;
  assert.equal(frozenVersion, commercialVersion);

  const {error: mappingMutationError} = await supabase
    .from("core360_product_mappings")
    .update({commercial_version: "changed-after-core-ack"})
    .eq("source_menu_item_id", qa.sourceMenuItemId);
  assert.ifError(mappingMutationError);
  const retryAt = new Date(new Date(afterLostAck.next_attempt_at).getTime() + 1_000);
  const recovered = await recoverCore360CommerceDelivery({env, now: retryAt, supabase});
  const finalRow = await outboxRow({id: queued.eventId, supabase});
  const state = await readCore360OrderStates({env, query: {externalOrderId: source.order.id}});
  await check("crash/replay reutiliza la solicitud persistida aunque cambie el mapeo vivo", async () => {
    assert.equal(recovered.failed.length, 0);
    assert.equal(finalRow.status, "accepted");
    assert.equal(finalRow.core_order_id, createdCoreOrderId);
    assert.equal(finalRow.core_request?.lines?.[0]?.commercialVersion, frozenVersion);
    assert.equal(state.coreOrderId, createdCoreOrderId);
  });
  await restoreMapping({commercialVersion, qa, supabase});
}

async function testConcurrentClaim({env, qa, supabase}) {
  const source = await createPaidOrder({qa, suffix: "concurrent", supabase});
  const queued = await enqueueCore360PaymentApproved({...source, env, supabase});
  const event = await outboxRow({id: queued.eventId, supabase});
  const outcomes = await Promise.all([
    deliverCore360OutboxEvent({env, event, supabase}),
    deliverCore360OutboxEvent({env, event, supabase})
  ]);
  const row = await outboxRow({id: queued.eventId, supabase});
  await check("dos workers reales compiten por un lease y sólo uno entrega", async () => {
    assert.equal(outcomes.filter((outcome) => outcome.accepted).length, 1);
    assert.equal(outcomes.filter((outcome) => outcome.reason === "outbox-claimed").length, 1);
    assert.equal(row.status, "accepted");
    assert.equal(row.attempt_count, 1);
  });
}

async function testExpiredLeaseAndStaleFinish({env, qa, supabase}) {
  const source = await createPaidOrder({qa, suffix: "stale", supabase});
  const queued = await enqueueCore360PaymentApproved({...source, env, supabase});
  const staleToken = randomUUID();
  const past = new Date(Date.now() - 60_000).toISOString();
  const {error: staleSeedError} = await supabase
    .from("core360_commerce_outbox")
    .update({attempt_count: 1, lease_expires_at: past, lease_token: staleToken, status: "sending"})
    .eq("id", queued.eventId);
  assert.ifError(staleSeedError);

  let releaseCorePost;
  const delayedPost = new Promise((resolve) => { releaseCorePost = resolve; });
  const delayedFetch = async (url, request) => {
    if (request?.method === "POST" && String(url).endsWith("/api/commerce/v1/orders")) await delayedPost;
    return fetch(url, request);
  };
  const promise = deliverCore360OutboxEvent({env, event: await outboxRow({id: queued.eventId, supabase}), fetchImpl: delayedFetch, supabase});
  await waitFor(async () => {
    const row = await outboxRow({id: queued.eventId, supabase});
    return row.status === "sending" && row.lease_token !== staleToken;
  });
  const {data: staleFinish, error: staleFinishError} = await supabase
    .from("core360_commerce_outbox")
    .update({status: "accepted"})
    .eq("id", queued.eventId)
    .eq("lease_token", staleToken)
    .select("id");
  assert.ifError(staleFinishError);
  releaseCorePost();
  const delivered = await promise;
  const row = await outboxRow({id: queued.eventId, supabase});
  await check("lease vencido se reclama y el dueño antiguo no puede finalizar", async () => {
    assert.equal(staleFinish.length, 0);
    assert.equal(delivered.accepted, true);
    assert.equal(row.status, "accepted");
    assert.equal(row.attempt_count, 2);
  });
}

async function testRecoveryFromApprovedOrder({env, qa, supabase}) {
  const source = await createPaidOrder({qa, suffix: "recovery", supabase});
  const recovered = await recoverCore360CommerceDelivery({env, now: new Date(Date.now() + 1_000), supabase});
  const {data: events, error} = await supabase
    .from("core360_commerce_outbox")
    .select("id,status")
    .eq("order_id", source.order.id)
    .eq("event_type", "web_order.payment_approved");
  assert.ifError(error);
  await check("recovery encuentra sólo pagos posteriores al corte y crea el outbox faltante", async () => {
    assert.equal(recovered.reconciled.queued.length, 1);
    assert.equal(events.length, 1);
    assert.equal(events[0].status, "accepted");
  });
}

async function testReadProjection({env, qa, supabase}) {
  const projection = await projectCore360CommerceRead({env, supabase});
  const {data: catalog, error: catalogError} = await supabase
    .from("core360_catalog_projection")
    .select("source_menu_item_id,gross_minor,currency,unit")
    .eq("source_menu_item_id", qa.sourceMenuItemId)
    .maybeSingle();
  assert.ifError(catalogError);
  const {data: stock, error: stockError} = await supabase
    .from("core360_stock_projection")
    .select("source_menu_item_id,inventory_managed,stock_known,available_milli")
    .eq("source_menu_item_id", qa.sourceMenuItemId)
    .maybeSingle();
  assert.ifError(stockError);
  await check("proyección usa el saldo consolidado del catálogo sin modificar la ficha editorial", async () => {
    assert.equal(projection.catalogRows, 1);
    assert.equal(catalog?.source_menu_item_id, qa.sourceMenuItemId);
    assert.equal(integer(catalog?.gross_minor), qa.grossUnitPriceMinor);
    assert.equal(catalog?.unit, "un");
    assert.equal(stock?.source_menu_item_id, qa.sourceMenuItemId);
    assert.ok(typeof stock?.stock_known === "boolean");
  });
}

async function testOrderStateProjection({delivered, env, first, firstState, supabase}) {
  const initial = await projectCore360OrderStates({env, supabase});
  const sameVersionFresh = {
    ...firstState,
    commercial: {status: "cancelled"},
    fulfillment: {status: "partially_delivered"},
    sourceVersion: `${firstState.sourceVersion}-same-version-new`,
    version: Number(firstState.version)
  };
  const sameVersionStale = {
    ...firstState,
    commercial: {status: "paid"},
    fulfillment: {status: "delivered"},
    sourceVersion: `${firstState.sourceVersion}-same-version-stale`,
    version: Number(firstState.version)
  };
  let releaseStaleResponse;
  let markStaleRequestStarted;
  const staleRequestStarted = new Promise((resolve) => { markStaleRequestStarted = resolve; });
  const stale = projectCore360OrderStates({
    env,
    fetchImpl: async () => {
      markStaleRequestStarted();
      return new Promise((resolve) => { releaseStaleResponse = resolve; });
    },
    supabase
  });
  await staleRequestStarted;
  const sameVersionProjected = await projectCore360OrderStates({
    env,
    fetchImpl: async () => ({ok: true, json: async () => sameVersionFresh, status: 200}),
    supabase
  });
  releaseStaleResponse({ok: true, json: async () => sameVersionStale, status: 200});
  const staleResult = await stale;
  const nextState = {
    ...sameVersionFresh,
    sourceVersion: `${firstState.sourceVersion}-after-partial-cancel`,
    version: Number(firstState.version) + 1
  };
  const projected = await projectCore360OrderStates({
    env,
    fetchImpl: async () => ({ok: true, json: async () => nextState, status: 200}),
    supabase
  });
  const {data: state, error} = await supabase
    .from("core360_commerce_order_states")
    .select("order_id,core_order_id,core_order_version,source_version,commercial_status,fulfillment_status,fiscal_status")
    .eq("order_id", first.order.id)
    .maybeSingle();
  assert.ifError(error);
  const anonymous = await fetch(`http://127.0.0.1:${supabasePort}/rest/v1/core360_commerce_order_states?select=order_id`);
  await check("estado Core acepta cambio de sourceVersion con misma versión y rechaza una respuesta tardía", async () => {
    assert.equal(initial.persisted, 1);
    assert.equal(sameVersionProjected.persisted, 1);
    assert.equal(staleResult.skipped, 1);
    assert.equal(projected.persisted, 1);
    assert.equal(state?.order_id, first.order.id);
    assert.equal(state?.core_order_id, delivered.coreOrderId);
    assert.equal(state?.core_order_version, Number(firstState.version) + 1);
    assert.equal(state?.source_version, nextState.sourceVersion);
    assert.equal(state?.commercial_status, "cancelled");
    assert.equal(state?.fulfillment_status, "partially_delivered");
    assert.equal(anonymous.ok, false);
  });
}

async function testCursorPaginationBeyondFifty({env, qa, supabase}) {
  const cutoff = new Date(Date.now() + 55_000).toISOString();
  const cursorEnv = {...env, CORE360_COMMERCE_SYNC_FROM: cutoff};
  const cursorOrders = [];
  for (let index = 0; index < 51; index += 1) {
    const source = await createPaidOrder({qa, suffix: `cursor-${index}`, supabase});
    const coreOrderId = `core-order-cursor-${index}`;
    const {error} = await supabase.from("core360_commerce_outbox").insert({
      core_order_id: coreOrderId,
      event_type: "web_order.payment_approved",
      id: randomUUID(),
      idempotency_key: `cursor-${runId}-${index}`,
      order_id: source.order.id,
      payload: {order: {id: source.order.id}},
      schema_version: 2,
      status: "accepted"
    });
    assert.ifError(error);
    cursorOrders.push({coreOrderId, orderId: source.order.id});
  }
  const {error: resetCursorError} = await supabase
    .from("core360_commerce_sync_cursors")
    .delete()
    .in("stream", ["approved_orders", "order_status"]);
  assert.ifError(resetCursorError);

  const {data: acceptedRows, error: acceptedError} = await supabase
    .from("core360_commerce_outbox")
    .select("order_id,core_order_id")
    .eq("status", "accepted")
    .not("core_order_id", "is", null);
  assert.ifError(acceptedError);
  const coreOrderIds = new Map((acceptedRows || []).map((row) => [row.order_id, row.core_order_id]));
  const fetchStates = async (url) => {
    const externalOrderId = decodeURIComponent(String(url).split("/orders/").at(-1).split("?")[0]);
    return {
      ok: true,
      json: async () => ({
        commercial: {status: "accepted"},
        coreOrderId: coreOrderIds.get(externalOrderId),
        externalOrderId,
        fiscal: {status: "pending"},
        fulfillment: {status: "preparing"},
        sourceVersion: `round-robin-${externalOrderId}`,
        version: 1
      }),
      status: 200
    };
  };
  const statePages = [];
  const statePageCount = Math.ceil((acceptedRows || []).length / 50);
  for (let page = 0; page < statePageCount; page += 1) {
    statePages.push(await projectCore360OrderStates({env: cursorEnv, fetchImpl: fetchStates, limit: 50, supabase}));
  }
  const recoveryFirst = await reconcileMissingCore360ApprovedOrders({env: cursorEnv, limit: 50, supabase});
  const recoverySecond = await reconcileMissingCore360ApprovedOrders({env: cursorEnv, limit: 50, supabase});
  const {data: storedStates, error: storedStatesError} = await supabase
    .from("core360_commerce_order_states")
    .select("order_id")
    .in("order_id", cursorOrders.map(({orderId}) => orderId));
  assert.ifError(storedStatesError);
  const storedOrderIds = new Set((storedStates || []).map((row) => row.order_id));
  const recoveredOrderIds = new Set([
    ...(recoveryFirst.skipped || []).map((row) => row.orderId),
    ...(recoverySecond.skipped || []).map((row) => row.orderId)
  ]);
  await check("cursores persistentes recorren más de 50 estados y recuperaciones sin quedar en la primera página", async () => {
    assert.ok((acceptedRows || []).length > 50);
    assert.equal(statePages.reduce((total, page) => total + page.scanned, 0), (acceptedRows || []).length);
    assert.equal(storedOrderIds.size, cursorOrders.length);
    assert.equal(recoveryFirst.scanned, 50);
    assert.ok(recoverySecond.scanned > 0);
    assert.equal(recoveryFirst.nextCursor?.orderId !== recoverySecond.nextCursor?.orderId, true);
    assert.ok(cursorOrders.every(({orderId}) => recoveredOrderIds.has(orderId)));
  });
}

async function testPrivateMediaRoundTrip({env, qa}) {
  const metadata = await readCore360ProductImageMetadata({env, productId: qa.coreItemId});
  const version = integer(metadata?.version);
  const bytes = new Uint8Array(await readFile(path.resolve(path.dirname(qaConfigPath), "qa-image.png")));
  const uploadKey = randomUUID();
  const removeKey = randomUUID();
  const uploaded = await uploadCore360ProductImage({
    bytes,
    contentType: "image/png",
    env,
    expectedVersion: version,
    filename: "fullness-native-postgrest-qa.png",
    idempotencyKey: uploadKey,
    productId: qa.coreItemId
  });
  try {
    const afterUpload = await readCore360ProductImageMetadata({env, productId: qa.coreItemId});
    const image = await readCore360ProductImageBytes({
      env,
      imageVersionId: afterUpload?.image?.id,
      productId: qa.coreItemId,
      variant: "image"
    });
    await check("media privada Core360 se carga, lee y elimina sin exponer una URL pública", async () => {
      assert.equal(uploaded.enabled, true);
      assert.ok(image.bytes.byteLength > 0);
      assert.match(image.contentType, /^image\//i);
    });
    await removeCore360ProductImage({
      env,
      expectedVersion: integer(afterUpload?.version),
      idempotencyKey: removeKey,
      productId: qa.coreItemId
    });
  } catch (error) {
    try {
      const current = await readCore360ProductImageMetadata({env, productId: qa.coreItemId});
      if (current?.image?.id) {
        await removeCore360ProductImage({env, expectedVersion: integer(current.version), idempotencyKey: removeKey, productId: qa.coreItemId});
      }
    } catch {}
    throw error;
  }
}

async function seedEditorialAndMapping({commercialVersion, qa, supabase}) {
  const {error: menuError} = await supabase.from("menu_items").insert({
    id: qa.sourceMenuItemId,
    name: "Producto sintético Fullness Core360",
    price_clp: qa.grossUnitPriceMinor,
    slug: `native-${runId.slice(0, 8)}`
  });
  assert.ifError(menuError);
  await restoreMapping({commercialVersion, qa, supabase});
}

async function restoreMapping({commercialVersion, qa, supabase}) {
  const {error} = await supabase.from("core360_product_mappings").upsert(mappingFor({commercialVersion, qa}), {onConflict: "source_menu_item_id"});
  assert.ifError(error);
}

function mappingFor({commercialVersion, qa}) {
  return {
    commercial_version: commercialVersion,
    core_item_id: qa.coreItemId,
    core_sku: qa.sku,
    gross_unit_price_minor: qa.grossUnitPriceMinor,
    is_active: true,
    quantity_milli_per_unit: 1000,
    source_menu_item_id: qa.sourceMenuItemId,
    tax_bps: qa.taxBps,
    uom_code: "un"
  };
}

async function createPaidOrder({qa, suffix, supabase}) {
  const orderId = randomUUID();
  const clientId = randomUUID();
  const paymentId = `native-payment-${suffix}-${runId}`;
  const paidAt = new Date(Date.now() + 60_000).toISOString();
  const order = {
    client_id: clientId,
    currency: "CLP",
    customer_snapshot: {email: `native-${suffix}@fullness.invalid`, mode: "pickup", name: "Native QA"},
    delivery_fee_clp: 0,
    discount_clp: 0,
    id: orderId,
    mercadopago_external_reference: orderId,
    note: null,
    paid_at: paidAt,
    payment_status: "approved",
    status: "paid",
    subtotal_clp: qa.grossUnitPriceMinor,
    total_clp: qa.grossUnitPriceMinor
  };
  const item = {
    id: randomUUID(),
    order_id: orderId,
    product_id: qa.sourceMenuItemId,
    product_snapshot: {core360PriceVersion: qa.commercialVersion || "1", sku: qa.sku},
    quantity: 1,
    total_clp: qa.grossUnitPriceMinor,
    unit_price_clp: qa.grossUnitPriceMinor
  };
  const payment = {
    currency: "CLP",
    order_id: orderId,
    paid_at: paidAt,
    provider: "mercado_pago",
    provider_payment_id: paymentId,
    status: "approved",
    transaction_amount_clp: qa.grossUnitPriceMinor
  };
  for (const [table, row] of [["orders", order], ["order_items", item], ["payments", payment]]) {
    const {error} = await supabase.from(table).insert(row);
    assert.ifError(error);
  }
  return {items: [item], order, payment};
}

async function outboxRow({id, supabase}) {
  const {data, error} = await supabase
    .from("core360_commerce_outbox")
    .select("id,attempt_count,status,payload,core_request,core_request_hash,core_order_id,core_order_version,lease_token,lease_expires_at,next_attempt_at")
    .eq("id", id)
    .maybeSingle();
  assert.ifError(error);
  assert.ok(data, `Falta outbox ${id}`);
  return data;
}

async function startPostgres() {
  await command("initdb.exe", ["-D", dataDir, "-U", "postgres", "--encoding=UTF8", "--locale=C", "-A", "trust"]);
  await command("pg_ctl.exe", ["start", "-D", dataDir, "-l", path.resolve(runDir, "postgres.log"), "-o", `-h 127.0.0.1 -p ${postgresPort}`, "-w", "-t", "25"]);
  postgresStarted = true;
  result.postgres = {host: "127.0.0.1", port: postgresPort, version: (await psql("select version() as version;", {json: true}))[0]?.version || "unknown"};
}

async function applySchema(candidateBytes) {
  const bootstrap = `
create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant service_role to postgres;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function public.is_admin() returns boolean language sql stable as $$ select true $$;
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create table public.menu_items (id uuid primary key, slug text not null unique, name text not null, price_clp numeric(12,0) not null);
create table public.orders (
  id uuid primary key, client_id uuid, status text not null, payment_status text not null,
  subtotal_clp numeric(12,0) not null, discount_clp numeric(12,0) not null default 0,
  delivery_fee_clp numeric(12,0) not null default 0, total_clp numeric(12,0) not null,
  currency text not null, mercadopago_external_reference text, note text, customer_snapshot jsonb not null default '{}'::jsonb, paid_at timestamptz
);
create table public.order_items (
  id uuid primary key, order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.menu_items(id), quantity integer not null,
  unit_price_clp numeric(12,0) not null, total_clp numeric(12,0) not null, product_snapshot jsonb not null default '{}'::jsonb
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null, provider_payment_id text not null, status text not null, transaction_amount_clp numeric(12,0) not null,
  currency text not null, paid_at timestamptz, unique(provider, provider_payment_id)
);
grant usage on schema public, auth to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
`;
  const bootstrapPath = path.resolve(runDir, "bootstrap.sql");
  const candidatePath = path.resolve(runDir, "core360-commerce-outbox.sql");
  await writeFile(bootstrapPath, bootstrap);
  await writeFile(candidatePath, candidateBytes);
  await psqlFile(bootstrapPath);
  await psqlFile(candidatePath);
  await psql("grant all privileges on all tables in schema public to service_role;");
  await psql("grant usage, select on all sequences in schema public to service_role;");
}

async function startPostgrest() {
  const jwtSecret = randomBytes(32).toString("hex");
  const configPath = path.resolve(runDir, "postgrest.conf");
  const config = [
    `db-uri = "postgres://postgres@127.0.0.1:${postgresPort}/postgres"`,
    'db-schemas = "public"',
    'db-anon-role = "anon"',
    `jwt-secret = "${jwtSecret}"`,
    'server-host = "127.0.0.1"',
    `server-port = ${postgrestPort}`
  ].join("\n");
  await writeFile(configPath, `${config}\n`);
  postgrestProcess = spawn(postgrestBin, [configPath], {
    cwd: runDir,
    env: {...process.env, Path: `${postgresBin};${process.env.Path || ""}`},
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true
  });
  const token = signedJwt({role: "service_role"}, jwtSecret);
  let postgrestLog = "";
  postgrestProcess.stderr.on("data", (chunk) => { postgrestLog += chunk.toString(); });
  postgrestProcess.once("error", (error) => { postgrestLog += `\n${String(error?.message || error)}`; });
  await waitFor(async () => {
    if (postgrestProcess.exitCode != null) {
      throw new Error(`PostgREST se detuvo antes de responder: ${postgrestLog.slice(-1500)}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${postgrestPort}/menu_items?select=id&limit=1`, {
        headers: {Authorization: `Bearer ${token}`}
      });
      return response.ok;
    } catch {
      return false;
    }
  }, 15_000);
  supabaseProxy = await startSupabaseRestProxy();
  result.postgrest = {host: "127.0.0.1", port: postgrestPort, proxyPort: supabasePort, version: "16.4"};
  return createClient(`http://127.0.0.1:${supabasePort}`, token, {auth: {autoRefreshToken: false, persistSession: false}});
}

async function startSupabaseRestProxy() {
  const proxy = createServer((request, response) => {
    const incomingUrl = String(request.url || "/");
    if (!incomingUrl.startsWith("/rest/v1")) {
      response.writeHead(404).end();
      return;
    }
    const upstreamPath = incomingUrl.replace(/^\/rest\/v1(?=\/|\?|$)/, "") || "/";
    const upstream = httpRequest({
      headers: request.headers,
      host: "127.0.0.1",
      method: request.method,
      path: upstreamPath,
      port: postgrestPort
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.once("error", () => response.writeHead(502).end());
    request.pipe(upstream);
  });
  await new Promise((resolve, reject) => {
    proxy.once("error", reject);
    proxy.listen(supabasePort, "127.0.0.1", resolve);
  });
  return proxy;
}

function coreQaEnvironment(qa) {
  return {
    CORE360_BASE_URL: qa.baseUrl,
    CORE360_COMMERCE_CUSTOMER_MODE: "identified",
    CORE360_COMMERCE_DELIVERY_ENABLED: "true",
    CORE360_COMMERCE_MAX_DELIVERY_ATTEMPTS: "3",
    CORE360_COMMERCE_MEDIA_PROXY_ENABLED: "true",
    CORE360_COMMERCE_MEDIA_WRITE_ENABLED: "true",
    CORE360_COMMERCE_POLL_ENABLED: "true",
    CORE360_COMMERCE_PREVIEW_ENABLED: "true",
    CORE360_COMMERCE_READ_ENABLED: "true",
    CORE360_COMMERCE_SYNC_ENABLED: "true",
    CORE360_COMMERCE_SYNC_FROM: new Date(Date.now() - 60_000).toISOString(),
    CORE360_COMMERCE_TEST_MODE: "true",
    CORE360_COMMERCE_TOKEN: qa.bearerToken,
    CORE360_FISCAL_INTENT: "pending",
    CORE360_PRICE_LIST_ID: qa.priceListId
  };
}

async function check(name, assertion) {
  try {
    await assertion();
    result.tests.push({name, passed: true});
  } catch (error) {
    result.tests.push({code: String(error?.code || error?.name || "ASSERTION_FAILED"), name, passed: false});
    throw error;
  }
}

async function ensurePrivateQaPaths() {
  if (!qaConfigPath.includes(`${path.sep}.local${path.sep}`) || !postgresBin.includes(`${path.sep}.local${path.sep}`)) {
    throw new Error("La QA nativa sólo acepta fixtures y binarios privados dentro de .local.");
  }
  for (const file of [path.resolve(postgresBin, "initdb.exe"), path.resolve(postgresBin, "pg_ctl.exe"), path.resolve(postgresBin, "psql.exe"), postgrestBin, qaConfigPath]) await access(file);
}

async function readQaFixture(filePath) {
  const seed = JSON.parse(await readFile(filePath, "utf8"));
  const product = (seed.products || []).find((item) => item?.itemType === "product" && Number(item?.unitPriceMinor) === 18800);
  if (seed.qa !== true || !product) throw new Error("El fixture Core360 QA privado no contiene el producto bruto ficticio esperado.");
  const url = new URL(requiredText(seed.baseUrl, "baseUrl"));
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname) || url.port !== "3083") {
    throw new Error("La QA nativa sólo puede usar Core360 loopback:3083.");
  }
  // Some archived QA seeds predate the UOM field. The live QA contract below
  // still has to return `un`; absence in a private fixture must not turn into
  // an invented unit or hide that API assertion.
  if (product.unit != null && String(product.unit) !== "un") {
    throw new Error("El fixture Core360 QA declara una UOM distinta de un.");
  }
  return {
    baseUrl: url.origin,
    bearerToken: requiredText(seed.token, "token QA"),
    commercialVersion: String(product.commercialVersion || "1"),
    coreItemId: requiredText(product.coreItemId, "coreItemId"),
    grossUnitPriceMinor: integer(product.unitPriceMinor),
    issuedOn: requiredText(seed.issuedOn, "issuedOn"),
    priceListId: String(seed.priceListId || ""),
    sku: requiredText(product.sku, "sku"),
    sourceMenuItemId: requiredText(product.externalItemId, "externalItemId"),
    taxBps: integer(product.taxBps)
  };
}

function parseOptions(args) {
  const value = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : "";
  };
  const parsed = {
    coreQaConfig: value("--core-qa-config"),
    postgresBin: value("--postgres-bin"),
    postgrestBin: value("--postgrest-bin")
  };
  if (Object.values(parsed).some((item) => !item)) {
    throw new Error("Uso: node scripts/test-core360-commerce-native-persistence.mjs --core-qa-config <privado> --postgres-bin <binario-privado> --postgrest-bin <postgrest.exe>");
  }
  return parsed;
}

async function psqlFile(filePath) {
  await command("psql.exe", ["-h", "127.0.0.1", "-p", String(postgresPort), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-f", filePath]);
}

async function psql(query, {json = false} = {}) {
  const output = await command("psql.exe", ["-h", "127.0.0.1", "-p", String(postgresPort), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-F", "\t", "-c", query]);
  if (!json) return output;
  return output.trim().split(/\r?\n/).filter(Boolean).map((line) => ({version: line.split("\t")[0]}));
}

async function command(binary, args) {
  const executable = path.resolve(postgresBin, binary);
  const child = spawn(executable, args, {cwd: runDir, stdio: ["ignore", "pipe", "pipe"], windowsHide: true});
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (code !== 0) throw new Error(`${binary} falló: ${output.slice(-1200)}`);
  return output;
}

async function availablePort() {
  const reservation = net.createServer();
  await new Promise((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
  const address = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));
  if (!address || typeof address === "string") throw new Error("No pudimos reservar un puerto loopback.");
  return address.port;
}

async function waitFor(predicate, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("La condición de QA no se cumplió antes del timeout.");
}

async function stopProcesses() {
  if (supabaseProxy) await new Promise((resolve) => supabaseProxy.close(resolve));
  if (postgrestProcess && !postgrestProcess.killed) {
    postgrestProcess.kill();
    await new Promise((resolve) => postgrestProcess.once("exit", resolve));
  }
  if (postgresStarted) await command("pg_ctl.exe", ["stop", "-D", dataDir, "-m", "fast", "-w", "-t", "25"]).catch(() => {});
}

function signedJwt(payload, secret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = encode({...payload, exp: Math.floor(Date.now() / 1000) + 3600});
  const header = encode({alg: "HS256", typ: "JWT"});
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function rowsFrom(value) {
  return Array.isArray(value?.rows) ? value.rows : [];
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} es obligatorio.`);
  return text;
}

function integer(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error("Se esperaba un entero no negativo.");
  return number;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
