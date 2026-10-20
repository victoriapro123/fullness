import {createHash, randomUUID} from "node:crypto";

const CORE360_API_PREFIX = "/api/commerce/v1";
const CORE360_EVENT_TYPE = "web_order.payment_approved";
const CORE360_SCHEMA_VERSION = 2;
const OUTBOX_TABLE = "core360_commerce_outbox";
const CUSTOMER_MAPPING_TABLE = "core360_customer_mappings";
const CATALOG_PROJECTION_TABLE = "core360_catalog_projection";
const PRODUCT_MAPPING_TABLE = "core360_product_mappings";
const STOCK_PROJECTION_TABLE = "core360_stock_projection";
const SYNC_CURSOR_TABLE = "core360_commerce_sync_cursors";
const APPROVED_ORDERS_CURSOR_STREAM = "approved_orders";
const ORDER_STATUS_CURSOR_STREAM = "order_status";
const MAX_RECONCILE_PAGE_SIZE = 100;
const MAX_CORE360_IMAGE_BYTES = 4 * 1024 * 1024;
const CORE360_OUTBOX_LEASE_MS = 5 * 60 * 1000;
const DEFAULT_MAX_DELIVERY_ATTEMPTS = 8;
const MAX_DELIVERY_ATTEMPTS = 20;
const DEFAULT_CORE360_REQUEST_TIMEOUT_MS = 8 * 1000;
const MIN_CORE360_REQUEST_TIMEOUT_MS = 1 * 1000;
const MAX_CORE360_REQUEST_TIMEOUT_MS = 30 * 1000;
const RETRY_BASE_DELAY_MS = 60 * 1000;
const RETRY_MAX_DELAY_MS = 60 * 60 * 1000;
let lastCore360PollEpochMs = 0;
const RECONCILE_ORDER_SELECT = [
  "id",
  "client_id",
  "status",
  "payment_status",
  "subtotal_clp",
  "discount_clp",
  "delivery_fee_clp",
  "total_clp",
  "currency",
  "mercadopago_external_reference",
  "note",
  "customer_snapshot",
  "paid_at",
  "order_items(id,product_id,quantity,unit_price_clp,total_clp,product_snapshot)",
  "payments(provider,provider_payment_id,status,transaction_amount_clp,currency,paid_at,live_mode:raw_payload->live_mode)"
].join(",");

export function isCore360CommerceSyncEnabled(env = process.env) {
  return cleanText(env.CORE360_COMMERCE_SYNC_ENABLED).toLowerCase() === "true";
}

export function isCore360CommerceDeliveryEnabled(env = process.env) {
  return isCore360CommerceSyncEnabled(env)
    && cleanText(env.CORE360_COMMERCE_DELIVERY_ENABLED).toLowerCase() === "true";
}

/**
 * Read access has its own opt-in because observing the Core360 catalogue or
 * stock is useful before order delivery is enabled, but must never become a
 * side effect of a checkout or webhook.
 */
export function isCore360CommerceReadEnabled(env = process.env) {
  return cleanText(env.CORE360_COMMERCE_READ_ENABLED).toLowerCase() === "true";
}

/**
 * Polling is intentionally a third opt-in. Read access can be used to audit
 * Core360 without persisting its commercial state in Fullness.
 */
export function isCore360CommercePollingEnabled(env = process.env) {
  return isCore360CommerceReadEnabled(env)
    && cleanText(env.CORE360_COMMERCE_POLL_ENABLED).toLowerCase() === "true";
}

export function isCore360CommercePreviewEnabled(env = process.env) {
  return isCore360CommerceReadEnabled(env)
    && cleanText(env.CORE360_COMMERCE_PREVIEW_ENABLED).toLowerCase() === "true";
}

/**
 * A checkout preflight is only meaningful against a persisted, current
 * catalogue projection. It deliberately does not imply delivery: the request
 * is POST /orders/preview with an unpaid payment and Core360 never creates a
 * partner or an order from it.
 */
export function isCore360CommerceCheckoutPreflightEnabled(env = process.env) {
  return isCore360CommercePollingEnabled(env)
    && isCore360CommercePreviewEnabled(env);
}

export function isCore360CommerceMediaProxyEnabled(env = process.env) {
  return isCore360CommerceReadEnabled(env)
    && cleanText(env.CORE360_COMMERCE_MEDIA_PROXY_ENABLED).toLowerCase() === "true";
}

/**
 * Media writes require every write opt-in as well as their own explicit flag.
 * This keeps an image editor incapable of reaching Core360 merely because it
 * has read access to image metadata.
 */
export function isCore360CommerceMediaWriteEnabled(env = process.env) {
  return isCore360CommerceDeliveryEnabled(env)
    && cleanText(env.CORE360_COMMERCE_MEDIA_WRITE_ENABLED).toLowerCase() === "true";
}

export async function readCore360Catalog({env = process.env, fetchImpl = fetch, query = {}} = {}) {
  if (!isCore360CommerceReadEnabled(env)) {
    return {enabled: false, skipped: true, reason: "read-disabled"};
  }

  const config = getCore360ReadConfig(env);
  const result = await requestCore360Read({
    config,
    fetchImpl,
    path: "/products",
    query: buildCatalogReadQuery(query)
  });

  return {enabled: true, ...result};
}

export async function readCore360Stock({env = process.env, fetchImpl = fetch, query = {}} = {}) {
  if (!isCore360CommerceReadEnabled(env)) {
    return {enabled: false, skipped: true, reason: "read-disabled"};
  }

  const config = getCore360ReadConfig(env);
  const result = await requestCore360Read({
    config,
    fetchImpl,
    path: "/stock",
    query: pickReadQuery(query, ["cursor", "itemId", "issuedOn", "limit", "q"])
  });

  return {enabled: true, ...result};
}

/**
 * Poll-only UUID projection. It preserves Fullness editorial fields by writing
 * Core commercial facts to separate projection tables; no matching by label,
 * no stock default of zero and no mutation of menu_items occurs here.
 */
export async function projectCore360CommerceRead({env = process.env, fetchImpl = fetch, supabase} = {}) {
  if (!isCore360CommercePollingEnabled(env)) {
    return {enabled: false, skipped: true, reason: "polling-disabled"};
  }
  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para proyectar la lectura Core360.");

  const mappings = await loadActiveProductMappings(supabase);
  const quantities = core360MappingQuantities(mappings);
  const [products, stockRows] = await Promise.all([
    collectCore360ReadPages({env, fetchImpl, query: {quantities}, read: readCore360Catalog}),
    collectCore360ReadPages({env, fetchImpl, read: readCore360Stock})
  ]);
  const productsById = new Map(products.map((row) => [cleanText(row?.id || row?.itemId), row]).filter(([id]) => id));
  const observedAt = new Date().toISOString();
  const catalogRows = [];
  const mappingFacts = [];
  const stockProjectionRows = [];

  for (const mapping of mappings) {
    const sourceMenuItemId = cleanText(mapping.source_menu_item_id);
    const coreItemId = cleanText(mapping.core_item_id);
    const product = productsById.get(coreItemId);
    if (!sourceMenuItemId || !coreItemId) {
      throw core360Error("INVALID_CORE_CATALOG_PROJECTION", "El mapeo Core360 no tiene UUID de origen o artículo canónico.");
    }

    const commercial = normalizeCore360CommercialProjection({mapping, product});
    catalogRows.push({
      core_item_available: commercial.coreItemAvailable,
      core_item_id: coreItemId,
      core_sku: commercial.coreSku,
      currency: commercial.currency,
      factor_compatible: commercial.factorCompatible,
      gross_minor: commercial.grossMinor,
      observed_at: observedAt,
      price_available: commercial.priceAvailable,
      product_version: commercial.productVersion,
      quantity_milli_per_unit: commercial.quantityMilliPerUnit,
      reconciliation_reason: commercial.reconciliationReason,
      source_menu_item_id: sourceMenuItemId,
      tax_bps: commercial.taxBps,
      unit: commercial.unit,
      uom_compatible: commercial.uomCompatible
    });
    stockProjectionRows.push(normalizeCore360StockProjection({
      coreItemId,
      mapping,
      observedAt,
      product,
      sourceMenuItemId
    }));
    if (commercial.mappingFacts) {
      mappingFacts.push({
        core_item_id: coreItemId,
        core_sku: commercial.coreSku,
        gross_unit_price_minor: commercial.grossMinor,
        source_menu_item_id: sourceMenuItemId,
        tax_bps: commercial.taxBps,
        commercial_version: commercial.productVersion,
        availability_version: commercial.availabilityVersion
      });
    }
  }

  const [{error: catalogError}, {error: stockError}, mappingError] = await Promise.all([
    supabase.from(CATALOG_PROJECTION_TABLE).upsert(catalogRows, {onConflict: "source_menu_item_id"}),
    supabase.from(STOCK_PROJECTION_TABLE).upsert(stockProjectionRows, {onConflict: "source_menu_item_id"}),
    updateCore360MappingFacts({rows: mappingFacts, supabase})
  ]);
  if (catalogError || stockError || mappingError) {
    throw core360Error("CORE360_PROJECTION_WRITE_FAILED", "No pudimos guardar la proyección comercial Core360.", catalogError || stockError || mappingError);
  }
  return {
    catalogRows: catalogRows.length,
    enabled: true,
    mappingFacts: mappingFacts.length,
    stockDetailsRead: stockRows.length,
    stockRows: stockProjectionRows.length,
    unavailable: catalogRows.filter((row) => row.price_available !== true).length
  };
}

/**
 * Refreshes only Core image metadata. The Fullness editorial asset is never
 * selected or written here; a 404/no image clears the Core reference instead
 * of retaining a broken cached pointer.
 */
export async function projectCore360ProductImageMetadata({env = process.env, fetchImpl = fetch, supabase} = {}) {
  if (!isCore360CommercePollingEnabled(env)) {
    return {enabled: false, skipped: true, reason: "polling-disabled"};
  }
  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para proyectar metadatos de imágenes Core360.");

  const mappings = await loadActiveProductMappings(supabase);
  const updates = [];
  const failed = [];
  for (const mapping of mappings) {
    const sourceMenuItemId = cleanText(mapping?.source_menu_item_id);
    const coreItemId = cleanText(mapping?.core_item_id);
    if (!sourceMenuItemId || !coreItemId) {
      failed.push({code: "INVALID_PRODUCT_MAPPING", sourceMenuItemId: sourceMenuItemId || null});
      continue;
    }
    try {
      const result = await readCore360ProductImageMetadata({env, fetchImpl, productId: coreItemId});
      const image = asRecord(result?.image);
      updates.push({
        core_item_id: coreItemId,
        image_reference: cleanText(image.id) || null,
        image_version: optionalCoreToken(result.version) || null,
        source_menu_item_id: sourceMenuItemId
      });
    } catch (error) {
      if (error?.statusCode === 404) {
        updates.push({core_item_id: coreItemId, image_reference: null, image_version: null, source_menu_item_id: sourceMenuItemId});
      } else {
        failed.push({code: cleanText(error?.code) || "CORE360_IMAGE_METADATA_FAILED", sourceMenuItemId});
      }
    }
  }
  const error = await updateCore360MappingFacts({rows: updates, supabase});
  if (error) throw core360Error("CORE360_IMAGE_METADATA_WRITE_FAILED", "No pudimos guardar los metadatos de imágenes Core360.", error);
  return {enabled: true, failed, refreshed: updates.length, scanned: mappings.length};
}

/**
 * Point-in-time order-state reader. It is not invoked by checkout or a
 * webhook; a future authenticated worker must opt in with the polling flag.
 */
export async function readCore360OrderStates({env = process.env, fetchImpl = fetch, query = {}} = {}) {
  if (!isCore360CommercePollingEnabled(env)) {
    return {enabled: false, skipped: true, reason: "polling-disabled"};
  }

  const externalOrderId = cleanText(query?.externalOrderId);
  if (!externalOrderId) {
    throw core360Error("MISSING_EXTERNAL_ORDER_ID", "Debes indicar externalOrderId para consultar el estado Core360.");
  }

  const config = getCore360ReadConfig(env);
  const result = await requestCore360Read({
    config,
    fetchImpl,
    path: `/orders/${encodeURIComponent(externalOrderId)}`
  });

  return {enabled: true, ...result};
}

/**
 * Polls Core360 only for orders already accepted by the durable outbox and
 * stores an independent status projection. It deliberately does not mutate
 * Fullness payment, delivery or fiscal state: acceptance in Core is not a
 * delivery confirmation, invoice or cancellation in Fullness.
 */
export async function projectCore360OrderStates({env = process.env, fetchImpl = fetch, limit = 50, supabase} = {}) {
  if (!isCore360CommercePollingEnabled(env)) {
    return {enabled: false, skipped: true, reason: "polling-disabled"};
  }
  if (!supabase?.from || typeof supabase.rpc !== "function") {
    throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para proyectar los estados Core360.");
  }

  const pageSize = Math.max(1, Math.min(MAX_RECONCILE_PAGE_SIZE, Math.round(Number(limit) || 50)));
  const accepted = await loadAcceptedOrderStatePage({limit: pageSize, supabase});

  let persisted = 0;
  let skipped = 0;
  const failed = [];
  for (const acceptedEvent of accepted || []) {
    const orderId = cleanText(acceptedEvent?.order_id);
    const expectedCoreOrderId = cleanText(acceptedEvent?.core_order_id);
    if (!orderId || !expectedCoreOrderId) {
      failed.push({code: "INVALID_ACCEPTED_OUTBOX", orderId: orderId || null});
      continue;
    }

    try {
      // This timestamp is deliberately captured before the HTTP request. For
      // equal Core versions, a slower answer from an older poll must never
      // overwrite a newer response merely because it returned later.
      const polledAt = nextCore360PollTimestamp();
      const state = await readCore360OrderStates({env, fetchImpl, query: {externalOrderId: orderId}});
      const projection = normalizeCore360OrderState({expectedCoreOrderId, orderId, polledAt, state});
      const {data: stored, error: storeError} = await supabase.rpc("project_core360_commerce_order_state", projection);
      if (storeError) throw core360Error("ORDER_STATE_PROJECTION_WRITE_FAILED", "No pudimos guardar el estado Core360.", storeError);
      if (stored === true) persisted += 1;
      else skipped += 1;
    } catch (stateError) {
      failed.push({code: cleanText(stateError?.code) || "CORE360_ORDER_STATE_FAILED", orderId});
    }
  }

  await persistCore360SyncCursor({
    cursor: cleanText(accepted.at(-1)?.order_id) || null,
    stream: ORDER_STATUS_CURSOR_STREAM,
    supabase
  });

  return {enabled: true, failed, persisted, scanned: accepted.length, skipped};
}

/**
 * The metadata path is intentionally separate from the byte proxy. It can be
 * inspected with the read scope but never exposes a Core360 URL to the browser.
 */
export async function readCore360ProductImageMetadata({env = process.env, fetchImpl = fetch, productId} = {}) {
  if (!isCore360CommerceReadEnabled(env)) {
    return {enabled: false, skipped: true, reason: "read-disabled"};
  }

  const coreProductId = cleanText(productId);
  if (!coreProductId) throw core360Error("MISSING_CORE_PRODUCT_ID", "Debes indicar el artículo Core360 para consultar su imagen.");

  const config = getCore360ReadConfig(env);
  const result = await requestCore360Read({
    config,
    fetchImpl,
    path: `/products/${encodeURIComponent(coreProductId)}/image`
  });

  return {enabled: true, ...result};
}

/**
 * A future server-only route may use these bytes after it establishes an
 * explicit Fullness-to-Core product mapping. There is deliberately no public
 * pass-through URL; write operations remain separate server-only functions.
 */
export async function readCore360ProductImageBytes({
  env = process.env,
  fetchImpl = fetch,
  imageVersionId,
  productId,
  variant = "image"
} = {}) {
  if (!isCore360CommerceMediaProxyEnabled(env)) {
    return {enabled: false, skipped: true, reason: "media-proxy-disabled"};
  }

  const coreProductId = cleanText(productId);
  const safeVariant = cleanText(variant);
  if (!coreProductId) throw core360Error("MISSING_CORE_PRODUCT_ID", "Debes indicar el artículo Core360 para leer su imagen.");
  if (!["image", "thumbnail"].includes(safeVariant)) {
    throw core360Error("INVALID_IMAGE_VARIANT", "La variante de imagen Core360 no es válida.");
  }

  const config = getCore360ReadConfig(env);
  const query = imageVersionId ? {imageVersionId: cleanText(imageVersionId), variant: safeVariant} : {variant: safeVariant};
  const response = await requestCore360Binary({
    config,
    fetchImpl,
    path: `/products/${encodeURIComponent(coreProductId)}/image`,
    query
  });
  return {enabled: true, ...response};
}

/**
 * Server-only raw image upload. This function does not create a browser URL,
 * does not expose the Core360 bearer and does not alter the Fullness original.
 */
export async function uploadCore360ProductImage({
  bytes,
  contentType,
  env = process.env,
  expectedVersion,
  fetchImpl = fetch,
  filename,
  idempotencyKey,
  productId
} = {}) {
  if (!isCore360CommerceMediaWriteEnabled(env)) {
    return {enabled: false, skipped: true, reason: "media-write-disabled"};
  }

  const config = getCore360ReadConfig(env);
  const coreProductId = requiredCoreProductId(productId);
  const payload = normalizeImageBytes(bytes);
  const headers = mediaUploadHeaders({
    contentLength: payload.byteLength,
    contentType,
    expectedVersion,
    filename,
    idempotencyKey
  });
  const result = await requestCore360MediaWrite({
    body: payload,
    config,
    fetchImpl,
    headers,
    method: "POST",
    path: `/products/${encodeURIComponent(coreProductId)}/image`
  });
  return {enabled: true, result};
}

/**
 * Server-only preference removal. It only requests Core360 to remove its
 * preferred image; it never deletes the editorial source stored by Fullness.
 */
export async function removeCore360ProductImage({
  env = process.env,
  expectedVersion,
  fetchImpl = fetch,
  idempotencyKey,
  productId
} = {}) {
  if (!isCore360CommerceMediaWriteEnabled(env)) {
    return {enabled: false, skipped: true, reason: "media-write-disabled"};
  }

  const config = getCore360ReadConfig(env);
  const coreProductId = requiredCoreProductId(productId);
  const result = await requestCore360MediaWrite({
    config,
    fetchImpl,
    body: JSON.stringify(mediaDeleteBody({expectedVersion, idempotencyKey})),
    headers: {Accept: "application/json", "Content-Type": "application/json"},
    method: "DELETE",
    path: `/products/${encodeURIComponent(coreProductId)}/image`
  });
  return {enabled: true, result};
}

/**
 * Compares explicit Fullness -> Core360 ids only. It deliberately never tries
 * to infer a match from a name, SKU or slug, because those are mutable labels.
 */
export function verifyCore360ProductMappings({fullnessProducts, coreProducts, mappings}) {
  const products = Array.isArray(fullnessProducts) ? fullnessProducts : [];
  const coreById = new Map(
    (Array.isArray(coreProducts) ? coreProducts : [])
      .map((product) => [cleanText(product?.id), product])
      .filter(([id]) => id)
  );
  const mappingBySourceId = new Map();
  const duplicateSourceIds = new Set();

  for (const mapping of Array.isArray(mappings) ? mappings : []) {
    const sourceMenuItemId = cleanText(mapping?.source_menu_item_id);
    if (!sourceMenuItemId) continue;
    if (mappingBySourceId.has(sourceMenuItemId)) duplicateSourceIds.add(sourceMenuItemId);
    mappingBySourceId.set(sourceMenuItemId, mapping);
  }

  const rows = products.map((product) => {
    const sourceMenuItemId = cleanText(product?.id);
    const mapping = mappingBySourceId.get(sourceMenuItemId);
    const coreItemId = cleanText(mapping?.core_item_id);
    const status = !sourceMenuItemId
      ? "invalid-fullness-product"
      : duplicateSourceIds.has(sourceMenuItemId)
        ? "duplicate-source-mapping"
        : !mapping
          ? "missing-mapping"
          : mapping.is_active === false
            ? "inactive-mapping"
            : !coreItemId || !coreById.has(coreItemId)
              ? "core-item-not-found"
              : "verified";

    return {
      coreItemId: coreItemId || null,
      fullnessMenuItemId: sourceMenuItemId || null,
      status
    };
  });

  return {
    rows,
    summary: Object.fromEntries(
      ["core-item-not-found", "duplicate-source-mapping", "inactive-mapping", "invalid-fullness-product", "missing-mapping", "verified"]
        .map((status) => [status, rows.filter((row) => row.status === status).length])
    )
  };
}

/**
 * Creates the immutable integration record from data already reconciled by
 * Fullness. It deliberately does not re-read catalogue prices or plan
 * composition, so a later catalogue edit cannot alter the commercial fact.
 */
export function buildCore360PaymentApprovedEvent({items, order, payment}) {
  const orderId = cleanText(order?.id);
  const totalClp = asPositiveInteger(order?.total_clp, "El total de la orden no es válido para Core360.");

  if (!orderId) throw core360Error("INVALID_ORDER", "La orden no tiene identificador para Core360.");
  if (cleanText(order?.currency || "CLP") !== "CLP") {
    throw core360Error("UNSUPPORTED_CURRENCY", "Core360 Commerce espera montos CLP.");
  }
  if (cleanText(payment?.provider) !== "mercado_pago" || cleanText(payment?.status) !== "approved") {
    throw core360Error("UNCONFIRMED_PAYMENT", "Solo se envían a Core360 pagos Mercado Pago aprobados.");
  }

  const sourceItems = Array.isArray(items) ? items : [];
  if (sourceItems.length === 0) {
    throw core360Error("MISSING_ORDER_ITEMS", "La orden aprobada no tiene líneas para Core360.");
  }

  const customer = asRecord(order?.customer_snapshot);
  const paidAt = cleanText(payment?.paid_at || order?.paid_at) || new Date().toISOString();

  const lines = sourceItems.map((item) => buildSourceLine(item));
  const idempotencyKey = `${CORE360_EVENT_TYPE}:${orderId}:v2`;
  const catalogVersions = uniqueDefined(lines.map((line) => line.commercial.catalogVersion));

  return {
    channel: "fullness-web",
    eventId: deterministicEventId(idempotencyKey),
    event: CORE360_EVENT_TYPE,
    idempotencyKey,
    occurredAt: paidAt,
    schemaVersion: CORE360_SCHEMA_VERSION,
    order: {
      catalogVersion: catalogVersions.length === 1 ? catalogVersions[0] : null,
      deliveryFeeClp: asNonNegativeInteger(order?.delivery_fee_clp, "El costo de despacho no es válido."),
      discountClp: asNonNegativeInteger(order?.discount_clp, "El descuento no es válido."),
      deliveryGrossMinor: String(asNonNegativeInteger(order?.delivery_fee_clp, "El costo de despacho no es válido.")),
      discountGrossMinor: String(asNonNegativeInteger(order?.discount_clp, "El descuento no es válido.")),
      externalOrderId: orderId,
      id: orderId,
      issuedOn: chileBusinessDate(paidAt),
      subtotalClp: asNonNegativeInteger(order?.subtotal_clp, "El subtotal de la orden no es válido."),
      subtotalGrossMinor: String(asNonNegativeInteger(order?.subtotal_clp, "El subtotal de la orden no es válido.")),
      totalClp,
      totalGrossMinor: String(totalClp),
      currency: "CLP",
      fulfillment: {
        address: cleanText(customer.address),
        comuna: cleanText(customer.comuna),
        instructions: cleanText(customer.instructions || order?.note),
        mode: cleanText(customer.mode) || "delivery"
      }
    },
    customer: {
      externalCustomerId: externalCustomerIdFor(orderId, order?.client_id),
      email: cleanText(customer.email).toLowerCase(),
      phone: cleanText(customer.phone),
      title: cleanText(customer.name)
    },
    payment: {
      amountClp: asPositiveInteger(payment?.transaction_amount_clp || totalClp, "El pago no tiene monto válido."),
      amountGrossMinor: String(asPositiveInteger(payment?.transaction_amount_clp || totalClp, "El pago no tiene monto válido.")),
      liveMode: observedPaymentLiveMode(payment),
      method: "other",
      provider: "mercado_pago",
      reference: `mercado_pago:${cleanText(payment?.provider_payment_id)}`,
      status: "observed"
    },
    lines
  };
}

/**
 * This is the only hook intended for the Mercado Pago reconciliation path.
 * With the default flag it returns before any database or HTTP operation.
 */
export async function enqueueCore360PaymentApproved({env = process.env, items, order, payment, supabase}) {
  if (!isCore360CommerceSyncEnabled(env)) {
    return {enabled: false, skipped: true, reason: "sync-disabled"};
  }

  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para registrar el outbox Core360.");
  assertCore360SyncCutover({env, occurredAt: payment?.paid_at || order?.paid_at});
  assertCore360LivePayment({env, liveMode: observedPaymentLiveMode(payment)});

  const payload = buildCore360PaymentApprovedEvent({items, order, payment});
  const idempotencyKey = payload.idempotencyKey;
  const row = {
    event_type: CORE360_EVENT_TYPE,
    idempotency_key: idempotencyKey,
    order_id: payload.order.id,
    payload,
    schema_version: payload.schemaVersion,
    source_catalog_version: payload.order.catalogVersion || null,
    status: "pending"
  };
  const {data, error} = await supabase
    .from(OUTBOX_TABLE)
    .insert(row)
    .select("id,status")
    .maybeSingle();

  if (!error && data?.id) {
    return {enabled: true, eventId: data.id, idempotencyKey, status: data.status || "pending"};
  }

  if (!isUniqueViolation(error)) {
    throw core360Error("OUTBOX_WRITE_FAILED", "No pudimos registrar el outbox Core360.", error);
  }

  const {data: existing, error: existingError} = await supabase
    .from(OUTBOX_TABLE)
    .select("id,status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError || !existing?.id) {
    throw core360Error("OUTBOX_IDEMPOTENCY_LOOKUP_FAILED", "No pudimos recuperar el evento Core360 existente.", existingError);
  }

  return {enabled: true, eventId: existing.id, idempotencyKey, reused: true, status: existing.status || "pending"};
}

/**
 * Recovery path for a transient outbox write failure after Mercado Pago has
 * already been reconciled. It only looks at paid Fullness orders, validates the
 * exact Mercado Pago amount/currency again, and relies on the outbox unique key
 * for idempotency. It is deliberately manual: no cron invokes it yet.
 */
export async function reconcileMissingCore360ApprovedOrders({env = process.env, supabase, cursor = null, limit = 50}) {
  if (!isCore360CommerceSyncEnabled(env)) {
    return {enabled: false, skipped: true, reason: "sync-disabled"};
  }
  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para reconciliar el outbox Core360.");
  const syncFrom = requiredCore360SyncCutover(env);

  const pageSize = Math.max(1, Math.min(MAX_RECONCILE_PAGE_SIZE, Math.round(Number(limit) || 50)));
  const persistedCursor = cursor ? null : await loadCore360SyncCursor({stream: APPROVED_ORDERS_CURSOR_STREAM, supabase});
  const activeCursor = cursor || persistedCursor;
  let page = await loadApprovedOrderRecoveryPage({cursor: activeCursor, limit: pageSize, supabase, syncFrom});
  if (page.length === 0 && activeCursor) {
    // The cursor has reached the tail. Wrap on the next page so long-lived
    // workers do not remain stuck behind the first MAX_RECONCILE_PAGE_SIZE rows.
    page = await loadApprovedOrderRecoveryPage({cursor: null, limit: pageSize, supabase, syncFrom});
  }
  const orderIds = page.map((order) => cleanText(order?.id)).filter(Boolean);
  const {data: existingEvents, error: existingEventsError} = orderIds.length
    ? await supabase
      .from(OUTBOX_TABLE)
      .select("order_id")
      .eq("event_type", CORE360_EVENT_TYPE)
      .in("order_id", orderIds)
    : {data: [], error: null};
  if (existingEventsError) {
    throw core360Error("RECONCILE_OUTBOX_READ_FAILED", "No pudimos revisar el outbox Core360.", existingEventsError);
  }

  const existingOrderIds = new Set((existingEvents || []).map((event) => cleanText(event?.order_id)).filter(Boolean));
  const queued = [];
  const skipped = [];
  const failed = [];

  for (const order of page) {
    const orderId = cleanText(order?.id);
    if (!orderId || existingOrderIds.has(orderId)) {
      skipped.push({orderId, reason: "outbox-exists"});
      continue;
    }

    const payment = selectReconciledMercadoPagoPayment({
      currency: order.currency,
      externalReference: order.mercadopago_external_reference,
      orderId,
      payments: order.payments,
      totalClp: order.total_clp
    });
    if (!payment) {
      skipped.push({orderId, reason: "payment-not-exactly-reconciled"});
      continue;
    }

    try {
      const result = await enqueueCore360PaymentApproved({
        env,
        items: order.order_items || [],
        order,
        payment,
        supabase
      });
      queued.push({orderId, ...result});
    } catch (error) {
      failed.push({code: cleanText(error?.code) || "RECONCILE_QUEUE_FAILED", orderId, reason: cleanText(error?.message)});
    }
  }

  const last = page.at(-1);
  const nextCursor = last?.paid_at && last?.id ? {orderId: last.id, paidAt: last.paid_at} : null;
  if (!cursor) {
    await persistCore360SyncCursor({
      cursor: nextCursor ? JSON.stringify(nextCursor) : null,
      stream: APPROVED_ORDERS_CURSOR_STREAM,
      supabase
    });
  }
  return {
    enabled: true,
    failed,
    nextCursor,
    queued,
    scanned: page.length,
    skipped
  };
}

export function selectReconciledMercadoPagoPayment({currency, externalReference, orderId, payments, totalClp}) {
  const expectedTotal = Number(totalClp);
  const expectedCurrency = cleanText(currency || "CLP");
  const expectedOrderId = cleanText(orderId);
  if (
    !Number.isSafeInteger(Math.round(expectedTotal))
    || expectedTotal <= 0
    || !expectedCurrency
    || !expectedOrderId
    || cleanText(externalReference) !== expectedOrderId
  ) return null;

  return (Array.isArray(payments) ? [...payments] : [])
    .filter((payment) => (
      cleanText(payment?.provider) === "mercado_pago"
      && cleanText(payment?.status) === "approved"
      && cleanText(payment?.provider_payment_id)
      && Math.round(Number(payment?.transaction_amount_clp)) === expectedTotal
      && cleanText(payment?.currency || "CLP") === expectedCurrency
    ))
    .sort((left, right) => String(right?.paid_at || "").localeCompare(String(left?.paid_at || "")))[0] || null;
}

/**
 * Worker entry point. Nothing in Fullness invokes it automatically. A future
 * worker must explicitly select a pending outbox row and call this function.
 */
export async function deliverCore360OutboxEvent({env = process.env, event, fetchImpl = fetch, supabase, now = new Date()} = {}) {
  if (!isCore360CommerceDeliveryEnabled(env)) {
    return {enabled: false, skipped: true, reason: "delivery-disabled"};
  }
  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para entregar a Core360.");

  const outboxId = cleanText(event?.id);
  if (!outboxId) {
    throw core360Error("INVALID_OUTBOX_EVENT", "El evento de outbox Core360 no es válido.");
  }

  const claim = await claimCore360OutboxEvent({event, now, outboxId, supabase});
  if (!claim) return {accepted: false, skipped: true, reason: "outbox-claimed"};

  try {
    const persisted = await loadCore360OutboxDispatch({outboxId, leaseToken: claim.token, supabase});
    const persistedPayload = asRecord(persisted?.payload);
    if (persistedPayload.event !== CORE360_EVENT_TYPE) {
      throw core360Error("INVALID_OUTBOX_EVENT", "El evento persistido Core360 no es válido.");
    }
    if (!isCore360SyncEventEligible({env, occurredAt: persistedPayload?.occurredAt})) {
      await updateOutbox(supabase, outboxId, {
        last_error: "El pago ocurrió antes del corte operativo Core360.",
        lease_expires_at: null,
        lease_token: null,
        next_attempt_at: null,
        status: "historical_excluded"
      }, claim.token);
      return {accepted: false, skipped: true, reason: "before-sync-cutover"};
    }
    assertCore360LivePayment({env, liveMode: persistedPayload.payment?.liveMode});
    const config = getCore360Config(env);
    const request = await resolveCore360OutboxRequest({
      config,
      event: persistedPayload,
      fetchImpl,
      outboxId,
      persisted,
      leaseToken: claim.token,
      supabase
    });

    const result = await requestCore360({body: request.order, config, fetchImpl, path: "/orders"});

    await updateOutbox(supabase, outboxId, {
      core_order_id: cleanText(result?.coreOrderId || result?.id) || null,
      core_order_version: optionalVersion(result?.version ?? result?.orderVersion),
      delivered_at: new Date().toISOString(),
      lease_expires_at: null,
      lease_token: null,
      last_error: null,
      next_attempt_at: null,
      response_summary: responseSummary(result),
      status: "accepted"
    }, claim.token);

    return {accepted: true, coreOrderId: cleanText(result?.coreOrderId || result?.id) || null, result};
  } catch (error) {
    const state = error.code === "OUTBOX_REQUEST_INTEGRITY_FAILED" || error.code === "CORE360_NON_LIVE_PAYMENT"
      ? "failed"
      : error.code === "PRICE_RECONCILIATION_REQUIRED"
      ? "price_reconciliation_required"
      : error.code === "MISSING_PRODUCT_MAPPING" || error.code === "ORDER_ADJUSTMENT_RECONCILIATION_REQUIRED"
        ? "needs_mapping"
        : error.code === "STOCK_UNAVAILABLE"
          ? "stock_unavailable"
        : "retry";
    const terminal = state !== "retry";
    const attemptsExhausted = claim.attemptCount >= maxCore360DeliveryAttempts(env);
    const nextStatus = terminal ? state : attemptsExhausted ? "failed" : "retry";
    await updateOutbox(supabase, outboxId, {
      last_error: cleanText(error.message).slice(0, 1000) || "Core360 delivery failed.",
      lease_expires_at: null,
      lease_token: null,
      next_attempt_at: nextStatus === "retry" ? retryAt({attemptCount: claim.attemptCount, now}) : null,
      response_summary: responseSummary(error.response),
      status: nextStatus
    }, claim.token);
    throw error;
  }
}

/**
 * Runnable recovery for the two safe cases: paid orders that lack an outbox
 * record and expired sending leases. It is manual/private; no cron invokes it
 * unless a separately approved scheduler calls this entry point.
 */
export async function recoverCore360CommerceDelivery({
  cursor = null,
  env = process.env,
  fetchImpl = fetch,
  limit = 50,
  now = new Date(),
  supabase
} = {}) {
  const wakeup = await refreshCore360CommerceWakeup({env, fetchImpl, limit, supabase});
  if (!isCore360CommerceDeliveryEnabled(env)) {
    return {enabled: false, ...wakeup, skipped: true, reason: "delivery-disabled"};
  }
  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para recuperar el outbox Core360.");

  const reconciled = await reconcileMissingCore360ApprovedOrders({cursor, env, limit, supabase});
  const candidates = await loadRecoverableCore360OutboxEvents({now, limit, supabase});
  const delivered = [];
  const failed = [];
  for (const event of candidates) {
    try {
      const result = await deliverCore360OutboxEvent({env, event, fetchImpl, now, supabase});
      delivered.push({eventId: cleanText(event.id), result});
    } catch (error) {
      failed.push({code: cleanText(error?.code) || "CORE360_DELIVERY_FAILED", eventId: cleanText(event.id)});
    }
  }
  return {enabled: true, delivered, failed, ...wakeup, reconciled, scanned: candidates.length};
}

/**
 * Scheduler-safe read refresh. It remains completely independent from order
 * delivery; a failure is reported but never retries or mutates an already
 * frozen outbox request.
 */
async function refreshCore360CommerceWakeup({env, fetchImpl, limit, supabase}) {
  if (!isCore360CommercePollingEnabled(env)) {
    const skipped = {enabled: false, skipped: true, reason: "polling-disabled"};
    return {catalog: skipped, images: skipped, orderStates: skipped, wakeupFailures: []};
  }
  const catalog = await captureWakeupProjection(() => projectCore360CommerceRead({env, fetchImpl, supabase}), "catalog");
  const images = await captureWakeupProjection(() => projectCore360ProductImageMetadata({env, fetchImpl, supabase}), "images");
  const orderStates = await captureWakeupProjection(() => projectCore360OrderStates({env, fetchImpl, limit, supabase}), "order_states");
  const wakeupFailures = [
    ...summarizeWakeupFailures(catalog, "catalog"),
    ...summarizeWakeupFailures(images, "images"),
    ...summarizeWakeupFailures(orderStates, "order_states")
  ];
  return {catalog, images, orderStates, wakeupFailures};
}

async function captureWakeupProjection(project, stream) {
  try {
    return await project();
  } catch (error) {
    return {code: cleanText(error?.code) || "CORE360_WAKEUP_FAILED", failed: true, stream};
  }
}

function summarizeWakeupFailures(result, stream) {
  if (result?.failed === true) {
    return [{code: cleanText(result.code) || "CORE360_WAKEUP_FAILED", stream}];
  }
  if (!Array.isArray(result?.failed) || result.failed.length === 0) return [];
  return result.failed.map((failure) => ({
    code: cleanText(failure?.code) || "CORE360_WAKEUP_PARTIAL_FAILURE",
    stream
  }));
}

/**
 * Builds the exact flat Core360 POST /orders and /orders/preview body. It is
 * pure so the checkout can never make a network call merely by constructing a
 * Mercado Pago preference.
 */
export function createCore360OrderRequest({config, event, mappings}) {
  if (Number(event?.schemaVersion) !== CORE360_SCHEMA_VERSION) {
    throw core360Error("UNSUPPORTED_OUTBOX_SCHEMA", "El evento Core360 no tiene la versión comercial aprobada.");
  }
  assertCore360OrderTotals(event);
  const mappingByMenuItemId = new Map((mappings || []).map((mapping) => [cleanText(mapping.source_menu_item_id), mapping]));
  const coreLines = (event.lines || []).map((line) => {
    const menuItemId = cleanText(line?.source?.menuItemId);
    const mapping = mappingByMenuItemId.get(menuItemId);
    if (!mapping || mapping.is_active === false) {
      throw core360Error("MISSING_PRODUCT_MAPPING", `Falta mapeo Core360 para el producto ${menuItemId || "sin identificador"}.`);
    }

    assertFrozenCommercialMapping(mapping, line);
    const frozen = asRecord(line?.commercial);
    const quantityMilli = asPositiveInteger(line?.quantity, "La cantidad Fullness no es válida.")
      * asPositiveInteger(frozen.quantityMilliPerUnit ?? mapping.quantity_milli_per_unit ?? 1000, "La equivalencia Core360 no es válida.");
    if (!Number.isSafeInteger(quantityMilli)) {
      throw core360Error("INVALID_CORE_QUANTITY", "La cantidad Core360 supera el rango seguro.");
    }
    assertCommercialVersion(mapping, line);
    assertGrossPriceMatches(mapping, line);

    const unit = cleanText(frozen.uomCode || mapping.uom_code);
    if (!unit) {
      throw core360Error("MISSING_PRODUCT_MAPPING", "El mapeo Core360 no tiene la UOM canónica del artículo.");
    }

    return compactUndefined({
      commercialVersion: cleanText(frozen.priceVersion) || mappingCommercialVersion(mapping),
      itemId: cleanText(frozen.coreItemId || mapping.core_item_id),
      lineGrossMinor: String(asPositiveInteger(line?.totalClp, "La línea no tiene total bruto válido.")),
      quantityMilli: String(quantityMilli),
      sku: cleanText(frozen.coreSku || mapping.core_sku || mapping.sku) || undefined,
      taxBps: asNonNegativeInteger(frozen.taxBps ?? mapping.tax_bps ?? 1900, "El impuesto Core360 no es válido."),
      unitGrossMinor: String(asPositiveInteger(line?.unitPriceClp, "La línea no tiene precio bruto válido.")),
      unit
    });
  });

  if (coreLines.some((line) => !line.itemId)) {
    throw core360Error("MISSING_PRODUCT_MAPPING", "Un mapeo Core360 no tiene itemId.");
  }

  assertNoUnmappedOrderAdjustments(event);

  return {
    order: compactUndefined({
      currency: "CLP",
      expectedTotalMinor: String(event.order.totalClp),
      externalOrderId: event.order.id,
      fiscalIntent: config.fiscalIntent,
      issuedOn: event.order.issuedOn,
      lines: coreLines,
      partnerId: config.partnerIdCore || undefined,
      payment: {
        method: "other",
        reference: event.payment.reference,
        status: "observed"
      },
      priceListId: config.priceListId || undefined,
      title: `Pedido web Fullness ${event.order.id.slice(0, 8).toUpperCase()}`
    })
  };
}

/**
 * Builds the pre-payment quote contract. It is intentionally separate from
 * the payment-approved event: it has no Fullness order id, no Core customer,
 * and represents the payment as unpaid. Core360's preview route is read-only
 * with respect to orders, inventory movement and fiscal documents.
 */
export function createCore360CheckoutPreviewRequest({config, items, previewId = `preview-${randomUUID()}`} = {}) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) throw core360Error("MISSING_ORDER_ITEMS", "El checkout no tiene líneas para validar en Core360.");
  const lines = rows.map(({product, quantity}) => {
    const itemId = cleanText(product?.core360_item_id || product?.core360ItemId);
    const unit = cleanText(product?.core360_uom_code || product?.core360UomCode);
    const sku = cleanText(product?.core360_sku || product?.core360Sku);
    const commercialVersion = cleanText(product?.core360_commercial_version || product?.core360CommercialVersion);
    const factor = asPositiveInteger(product?.core360_quantity_milli_per_unit ?? product?.core360QuantityMilliPerUnit, "La equivalencia Core360 no es válida.");
    const unitGrossMinor = asPositiveInteger(product?.price_clp, "El precio Core360 no es válido.");
    const taxBps = asNonNegativeInteger(product?.core360_tax_bps ?? product?.core360TaxBps, "El impuesto Core360 no es válido.");
    const units = asPositiveInteger(quantity, "La cantidad Fullness no es válida.");
    const quantityMilli = units * factor;
    if (!isUuid(itemId) || !unit || !sku || !commercialVersion || !Number.isSafeInteger(quantityMilli)) {
      throw core360Error("CORE360_CHECKOUT_RECONCILIATION_REQUIRED", "La proyección Core360 no tiene identidad, unidad o versión comercial válida.");
    }
    return {
      commercialVersion,
      itemId,
      lineGrossMinor: String(unitGrossMinor * units),
      quantityMilli: String(quantityMilli),
      sku,
      taxBps,
      unit,
      unitGrossMinor: String(unitGrossMinor)
    };
  });
  const totalMinor = lines.reduce((total, line) => total + asPositiveInteger(line.lineGrossMinor, "La línea Core360 no tiene total válido."), 0);
  const externalOrderId = cleanText(previewId);
  if (!externalOrderId) throw core360Error("INVALID_CORE_PREVIEW", "La revisión Core360 no tiene identificador temporal.");
  return {
    order: compactUndefined({
      currency: "CLP",
      expectedTotalMinor: String(totalMinor),
      externalOrderId,
      fiscalIntent: "pending",
      issuedOn: chileBusinessDate(new Date()),
      lines,
      payment: {method: "other", reference: "", status: "unpaid"},
      priceListId: cleanText(config?.priceListId) || undefined,
      title: "Revisión checkout web Fullness"
    })
  };
}

/**
 * Validates the live Core360 commercial quote before Mercado Pago can receive
 * a preference. This is deliberately not a stock-reservation guard: products
 * in preparation can quote with zero balance, and Core360 enforces physical
 * availability at the later fulfillment/delivery operation when applicable.
 */
export async function previewCore360Checkout({env = process.env, fetchImpl = fetch, items, previewId} = {}) {
  if (!isCore360CommerceCheckoutPreflightEnabled(env)) {
    return {enabled: false, skipped: true, reason: "checkout-preflight-disabled"};
  }
  const config = getCore360CheckoutPreviewConfig(env);
  const request = createCore360CheckoutPreviewRequest({config, items, previewId});
  const result = await requestCore360({body: request.order, config, fetchImpl, path: "/orders/preview"});
  assertCore360CheckoutPreview({request: request.order, result});
  return {enabled: true, request: request.order, result};
}

/** A disabled-by-default Core price/stock assertion before payment. */
export async function previewCore360Order({env = process.env, event, fetchImpl = fetch, mappings, supabase} = {}) {
  if (!isCore360CommercePreviewEnabled(env)) {
    return {enabled: false, skipped: true, reason: "preview-disabled"};
  }

  const config = getCore360Config(env);
  const partnerIdCore = await resolveCore360Customer({config, event, fetchImpl, supabase});
  const request = createCore360OrderRequest({config: {...config, partnerIdCore}, event, mappings});
  const result = await requestCore360({body: request.order, config, fetchImpl, path: "/orders/preview"});
  return {enabled: true, request: request.order, result};
}

/** Pure body builder for observed payment, refund and cancellation facts. */
export function createCore360OrderEventRequest({
  amountMinor,
  confirmed,
  currency = "CLP",
  eventKind,
  externalOrderId,
  expectedDocumentVersion,
  expectedSourceVersion,
  expectedVersion,
  externalEventId,
  externalReference,
  issuedOn,
  observedAt,
  reason
} = {}) {
  const orderId = cleanText(externalOrderId);
  const kind = cleanText(eventKind);
  const eventId = cleanText(externalEventId);
  const observed = cleanText(observedAt);
  if (!orderId || !eventId || !observed) {
    throw core360Error("INVALID_CORE_ORDER_EVENT", "El evento Core360 requiere orden, identificador externo y fecha observada.");
  }
  if (Number.isNaN(new Date(observed).getTime())) {
    throw core360Error("INVALID_CORE_ORDER_EVENT", "La fecha observada del evento Core360 debe ser ISO válida.");
  }
  if (!["payment_observed", "refund_observed", "cancellation_requested"].includes(kind)) {
    throw core360Error("INVALID_CORE_ORDER_EVENT", "El tipo de evento Core360 no está permitido.");
  }
  if (["payment_observed", "refund_observed"].includes(kind) && (amountMinor === undefined || amountMinor === null || amountMinor === "")) {
    throw core360Error("INVALID_CORE_ORDER_EVENT", "El pago o reembolso observado requiere un monto explícito.");
  }
  if (kind !== "cancellation_requested" && cleanText(currency) !== "CLP") {
    throw core360Error("INVALID_CORE_ORDER_EVENT", "El evento Core360 debe conservar moneda CLP.");
  }
  if (["payment_observed", "refund_observed"].includes(kind) && !cleanText(externalReference)) {
    throw core360Error("INVALID_CORE_ORDER_EVENT", "El pago o reembolso observado requiere su referencia externa.");
  }
  if (kind === "cancellation_requested" && (!cleanText(expectedVersion) || !cleanText(expectedDocumentVersion) || !cleanText(expectedSourceVersion))) {
    throw core360Error(
      "INVALID_CORE_ORDER_EVENT",
      "La cancelación Core360 requiere expectedVersion, expectedDocumentVersion y expectedSourceVersion."
    );
  }
  if (["refund_observed", "cancellation_requested"].includes(kind) && (!cleanText(issuedOn) || confirmed !== true)) {
    throw core360Error("INVALID_CORE_ORDER_EVENT", "El reembolso o la cancelación Core360 requiere issuedOn y confirmed=true.");
  }

  const request = compactUndefined({
    confirmed: typeof confirmed === "boolean" ? confirmed : undefined,
    currency: kind === "cancellation_requested" ? undefined : cleanText(currency) || undefined,
    eventKind: kind,
    expectedDocumentVersion: optionalVersion(expectedDocumentVersion),
    expectedSourceVersion: optionalCoreToken(expectedSourceVersion),
    expectedVersion: optionalVersion(expectedVersion),
    externalEventId: eventId,
    externalReference: cleanText(externalReference) || undefined,
    issuedOn: cleanText(issuedOn) || undefined,
    observedAt: observed,
    reason: cleanText(reason) || undefined
  });

  if (amountMinor !== undefined && amountMinor !== null && amountMinor !== "") {
    request.amountMinor = String(asPositiveInteger(amountMinor, "El monto del evento Core360 no es válido."));
  }

  return {externalOrderId: orderId, request};
}

/** No application workflow calls this until a separately approved outbox exists. */
export async function deliverCore360OrderEvent({env = process.env, fetchImpl = fetch, ...input} = {}) {
  if (!isCore360CommerceDeliveryEnabled(env)) {
    return {enabled: false, skipped: true, reason: "delivery-disabled"};
  }

  const config = getCore360Config(env);
  const {externalOrderId, request} = createCore360OrderEventRequest(input);
  const result = await requestCore360({
    body: request,
    config,
    fetchImpl,
    path: `/orders/${encodeURIComponent(externalOrderId)}/events`
  });
  return {enabled: true, result};
}

export function getCore360Config(env = process.env) {
  const {baseUrl, bearerToken, requestTimeoutMs} = getCore360ReadConfig(env);
  const customerMode = cleanText(env.CORE360_COMMERCE_CUSTOMER_MODE || "anonymous").toLowerCase();
  const fiscalIntent = cleanText(env.CORE360_FISCAL_INTENT || "pending");

  if (fiscalIntent !== "pending") {
    throw core360Error("FISCAL_NOT_APPROVED", "CORE360_FISCAL_INTENT debe mantenerse pending hasta validar la emisión DTE.");
  }
  if (!["anonymous", "identified"].includes(customerMode)) {
    throw core360Error("INVALID_CORE_CUSTOMER_MODE", "CORE360_COMMERCE_CUSTOMER_MODE debe ser anonymous o identified.");
  }
  if (cleanText(env.CORE360_PARTNER_ID)) {
    throw core360Error("CUSTOMER_MAPPING_REQUIRED", "CORE360_PARTNER_ID no autoriza una orden: el cliente debe crearse o vincularse por POST /customers en esta API.");
  }

  return {
    baseUrl,
    bearerToken,
    customerMode,
    fiscalIntent,
    priceListId: cleanText(env.CORE360_PRICE_LIST_ID),
    requestTimeoutMs
  };
}

function getCore360CheckoutPreviewConfig(env = process.env) {
  const {baseUrl, bearerToken, requestTimeoutMs} = getCore360ReadConfig(env);
  return {
    baseUrl,
    bearerToken,
    fiscalIntent: "pending",
    priceListId: cleanText(env.CORE360_PRICE_LIST_ID),
    requestTimeoutMs
  };
}

function getCore360ReadConfig(env = process.env) {
  const baseUrl = cleanText(env.CORE360_BASE_URL).replace(/\/+$/, "");
  const bearerToken = cleanText(env.CORE360_COMMERCE_TOKEN);

  if (!isSecureOrExplicitLoopbackTestUrl(baseUrl, env)) {
    throw core360Error("MISSING_CORE360_CONFIG", "CORE360_BASE_URL HTTPS es obligatoria; HTTP sólo se permite en loopback con CORE360_COMMERCE_TEST_MODE=true.");
  }
  if (!bearerToken) {
    throw core360Error("MISSING_CORE360_CONFIG", "Falta la credencial privada de Core360 para consultar catálogo o stock.");
  }

  return {baseUrl, bearerToken, requestTimeoutMs: core360RequestTimeoutMs(env)};
}

function isSecureOrExplicitLoopbackTestUrl(baseUrl, env) {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol === "https:") return true;
    return parsed.protocol === "http:"
      && cleanText(env?.CORE360_COMMERCE_TEST_MODE).toLowerCase() === "true"
      && ["127.0.0.1", "::1", "localhost"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function loadProductMappings({supabase, menuItemIds}) {
  const ids = [...new Set((menuItemIds || []).map(cleanText).filter(Boolean))];
  if (ids.length === 0) return [];

  const {data, error} = await supabase
    .from(PRODUCT_MAPPING_TABLE)
    .select("source_menu_item_id,core_item_id,core_sku,quantity_milli_per_unit,uom_code,commercial_version,gross_unit_price_minor,tax_bps,is_active")
    .in("source_menu_item_id", ids)
    .eq("is_active", true);
  if (error) throw core360Error("MAPPING_LOOKUP_FAILED", "No pudimos cargar los mapeos Core360.", error);
  return data || [];
}

async function loadActiveProductMappings(supabase) {
  const {data, error} = await supabase
    .from(PRODUCT_MAPPING_TABLE)
    .select("source_menu_item_id,core_item_id,core_sku,quantity_milli_per_unit,uom_code,commercial_version,gross_unit_price_minor,tax_bps,availability_version,image_reference,image_version,is_active")
    .eq("is_active", true);
  if (error) throw core360Error("MAPPING_LOOKUP_FAILED", "No pudimos cargar los mapeos Core360.", error);
  return data || [];
}

async function updateCore360MappingFacts({rows, supabase}) {
  for (const row of rows || []) {
    const sourceMenuItemId = cleanText(row?.source_menu_item_id);
    const coreItemId = cleanText(row?.core_item_id);
    if (!sourceMenuItemId || !coreItemId) {
      return core360Error("INVALID_PRODUCT_MAPPING", "El refresco Core360 no tiene un mapeo explícito válido.");
    }
    const changes = {...row};
    delete changes.source_menu_item_id;
    delete changes.core_item_id;
    const {error} = await supabase
      .from(PRODUCT_MAPPING_TABLE)
      .update(changes)
      .eq("source_menu_item_id", sourceMenuItemId)
      .eq("core_item_id", coreItemId);
    if (error) return error;
  }
  return null;
}

function core360MappingQuantities(mappings) {
  const quantities = {};
  for (const mapping of mappings || []) {
    const coreItemId = cleanText(mapping?.core_item_id);
    if (!coreItemId) continue;
    const factor = String(asPositiveInteger(mapping?.quantity_milli_per_unit || 1000, "La equivalencia Core360 no es válida."));
    if (quantities[coreItemId] && quantities[coreItemId] !== factor) {
      throw core360Error("CORE360_MAPPING_RECONCILIATION_REQUIRED", "Un mismo artículo Core360 tiene equivalencias distintas y requiere conciliación explícita.");
    }
    quantities[coreItemId] = factor;
  }
  return quantities;
}

async function collectCore360ReadPages({env, fetchImpl, query = {}, read}) {
  const rows = [];
  let cursor = "";
  do {
    const result = await read({env, fetchImpl, query: {...query, cursor, limit: MAX_RECONCILE_PAGE_SIZE}});
    rows.push(...(Array.isArray(result.rows) ? result.rows : []));
    cursor = cleanText(result?.page?.nextCursor);
  } while (cursor);
  return rows;
}

async function loadAcceptedOrderStatePage({limit, supabase}) {
  const cursor = await loadCore360SyncCursor({stream: ORDER_STATUS_CURSOR_STREAM, supabase});
  let accepted = await selectAcceptedOrderStatePage({afterOrderId: cursor, limit, supabase});
  if (accepted.length === 0 && cursor) {
    accepted = await selectAcceptedOrderStatePage({afterOrderId: null, limit, supabase});
  }
  return accepted;
}

async function selectAcceptedOrderStatePage({afterOrderId, limit, supabase}) {
  let query = supabase
    .from(OUTBOX_TABLE)
    .select("order_id,core_order_id")
    .eq("status", "accepted")
    .not("core_order_id", "is", null);
  if (afterOrderId) query = query.gt("order_id", afterOrderId);
  const {data, error} = await query
    .order("order_id", {ascending: true})
    .limit(limit);
  if (error) throw core360Error("ORDER_STATE_OUTBOX_LOOKUP_FAILED", "No pudimos cargar las órdenes Core360 aceptadas.", error);
  return data || [];
}

async function loadApprovedOrderRecoveryPage({cursor, limit, supabase, syncFrom}) {
  let ordersQuery = supabase
    .from("orders")
    .select(RECONCILE_ORDER_SELECT)
    .eq("status", "paid")
    .eq("payment_status", "approved")
    .gte("paid_at", syncFrom);
  const afterPaidAt = cleanText(cursor?.paidAt);
  const afterOrderId = cleanText(cursor?.orderId);
  if (afterPaidAt && afterOrderId) {
    ordersQuery = ordersQuery.or(`paid_at.gt.${afterPaidAt},and(paid_at.eq.${afterPaidAt},id.gt.${afterOrderId})`);
  }
  const {data, error} = await ordersQuery
    .order("paid_at", {ascending: true})
    .order("id", {ascending: true})
    .limit(limit);
  if (error) throw core360Error("RECONCILE_READ_FAILED", "No pudimos cargar órdenes pagadas para Core360.", error);
  return data || [];
}

async function loadCore360SyncCursor({stream, supabase}) {
  const {data, error} = await supabase
    .from(SYNC_CURSOR_TABLE)
    .select("cursor")
    .eq("stream", stream)
    .maybeSingle();
  if (error) throw core360Error("SYNC_CURSOR_READ_FAILED", "No pudimos recuperar el cursor de integración Core360.", error);
  if (stream === APPROVED_ORDERS_CURSOR_STREAM) return parseApprovedOrdersCursor(data?.cursor);
  return cleanText(data?.cursor) || null;
}

async function persistCore360SyncCursor({cursor, stream, supabase}) {
  const {error} = await supabase
    .from(SYNC_CURSOR_TABLE)
    .upsert({
      cursor: cursor || null,
      last_polled_at: new Date().toISOString(),
      stream
    }, {onConflict: "stream"});
  if (error) throw core360Error("SYNC_CURSOR_WRITE_FAILED", "No pudimos guardar el cursor de integración Core360.", error);
}

function parseApprovedOrdersCursor(value) {
  try {
    const parsed = JSON.parse(cleanText(value));
    const orderId = cleanText(parsed?.orderId);
    const paidAt = cleanText(parsed?.paidAt);
    return orderId && paidAt ? {orderId, paidAt} : null;
  } catch {
    return null;
  }
}

function nextCore360PollTimestamp() {
  lastCore360PollEpochMs = Math.max(Date.now(), lastCore360PollEpochMs + 1);
  return new Date(lastCore360PollEpochMs).toISOString();
}

async function loadRecoverableCore360OutboxEvents({limit, now, supabase}) {
  const pageSize = Math.max(1, Math.min(Number(limit) || 50, MAX_RECONCILE_PAGE_SIZE));
  const columns = "id,attempt_count,core_request,core_request_hash,payload,status,lease_expires_at";
  const {data: waiting, error: waitingError} = await supabase
    .from(OUTBOX_TABLE)
    .select(columns)
    .in("status", ["pending", "retry"])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date(now).toISOString()}`)
    .order("created_at", {ascending: true})
    .limit(pageSize);
  if (waitingError) throw core360Error("OUTBOX_RECOVERY_LOOKUP_FAILED", "No pudimos cargar el outbox Core360 pendiente.", waitingError);

  const remaining = Math.max(0, pageSize - (waiting || []).length);
  if (remaining === 0) return waiting || [];
  const staleBefore = new Date(now).toISOString();
  const {data: stale, error: staleError} = await supabase
    .from(OUTBOX_TABLE)
    .select(columns)
    .eq("status", "sending")
    .lt("lease_expires_at", staleBefore)
    .order("lease_expires_at", {ascending: true})
    .limit(remaining);
  if (staleError) throw core360Error("OUTBOX_RECOVERY_LOOKUP_FAILED", "No pudimos cargar el lease Core360 vencido.", staleError);
  return [...(waiting || []), ...(stale || [])];
}

async function claimCore360OutboxEvent({event, now, outboxId, supabase}) {
  const startedAt = new Date(now).toISOString();
  const leaseExpiresAt = new Date(new Date(now).getTime() + CORE360_OUTBOX_LEASE_MS).toISOString();
  const token = randomUUID();
  const status = cleanText(event?.status || "pending");
  let query = supabase
    .from(OUTBOX_TABLE)
    .update({
      attempt_count: Number(event?.attempt_count || 0) + 1,
      last_attempt_at: startedAt,
      lease_expires_at: leaseExpiresAt,
      lease_token: token,
      next_attempt_at: null,
      status: "sending"
    })
    .eq("id", outboxId);

  if (status === "sending") {
    query = query.eq("status", "sending").lt("lease_expires_at", startedAt);
  } else {
    query = query.in("status", ["pending", "retry"]);
  }
  const {data, error} = await query.select("id,attempt_count").maybeSingle();
  if (error) throw core360Error("OUTBOX_CLAIM_FAILED", "No pudimos reclamar el outbox Core360.", error);
  return data?.id ? {attemptCount: Number(data.attempt_count || 0), token} : null;
}

async function loadCore360OutboxDispatch({outboxId, leaseToken, supabase}) {
  const {data, error} = await supabase
    .from(OUTBOX_TABLE)
    .select("id,payload,core_request,core_request_hash")
    .eq("id", outboxId)
    .eq("lease_token", leaseToken)
    .maybeSingle();
  if (error) throw core360Error("OUTBOX_DISPATCH_READ_FAILED", "No pudimos leer el despacho Core360 reclamado.", error);
  if (!data?.id) throw core360Error("OUTBOX_LEASE_LOST", "El lease del outbox Core360 fue reclamado por otro worker.");
  return data;
}

async function resolveCore360OutboxRequest({config, event, fetchImpl, outboxId, persisted, leaseToken, supabase}) {
  const persistedRequest = asRecord(persisted?.core_request);
  const persistedHash = cleanText(persisted?.core_request_hash);
  if (Object.keys(persistedRequest).length > 0 || persistedHash) {
    assertPersistedCore360Request({event, hash: persistedHash, request: persistedRequest});
    return {order: persistedRequest};
  }

  const mappings = await loadProductMappings({supabase, menuItemIds: event.lines?.map((line) => line?.source?.menuItemId)});
  const partnerIdCore = await resolveCore360Customer({config, event, fetchImpl, supabase});
  const request = createCore360OrderRequest({config: {...config, partnerIdCore}, event, mappings});
  const requestHash = core360RequestHash(request.order);
  await updateOutbox(supabase, outboxId, {
    core_request: request.order,
    core_request_hash: requestHash
  }, leaseToken);
  return request;
}

function assertPersistedCore360Request({event, hash, request}) {
  if (!hash || core360RequestHash(request) !== hash || cleanText(request?.externalOrderId) !== cleanText(event?.order?.id)) {
    throw core360Error("OUTBOX_REQUEST_INTEGRITY_FAILED", "La solicitud Core360 persistida no coincide con la orden Fullness y requiere revisión.");
  }
  if (!Array.isArray(request.lines) || request.lines.length === 0) {
    throw core360Error("OUTBOX_REQUEST_INTEGRITY_FAILED", "La solicitud Core360 persistida no tiene líneas válidas.");
  }
}

async function resolveCore360Customer({config, event, fetchImpl, supabase}) {
  if (config.customerMode === "anonymous") return null;
  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para vincular el cliente Core360.");

  const customer = asRecord(event?.customer);
  const externalCustomerId = cleanText(customer.externalCustomerId);
  const identityFingerprint = customerIdentityFingerprint(customer);
  if (!isUuid(externalCustomerId)) {
    throw core360Error("INVALID_CORE_CUSTOMER", "El cliente Core360 debe tener el UUID estable de Fullness o de la orden invitada.");
  }

  const existing = await loadCore360CustomerMapping({externalCustomerId, supabase});
  if (existing) {
    assertCustomerIdentityUnchanged(existing, identityFingerprint);
    return requiredCorePartnerId(existing.core_partner_id);
  }

  const result = await requestCore360({
    body: compactUndefined({
      email: cleanText(customer.email) || undefined,
      externalCustomerId,
      phone: cleanText(customer.phone) || undefined,
      title: cleanText(customer.title) || undefined
    }),
    config,
    fetchImpl,
    path: "/customers"
  });
  const corePartnerId = requiredCorePartnerId(result?.corePartnerId || result?.partnerId || result?.customerId || result?.id || result?.customer?.id);
  const row = {
    core_partner_id: corePartnerId,
    external_customer_id: externalCustomerId,
    identity_fingerprint: identityFingerprint,
    source: "core360-commerce-api"
  };
  const {error} = await supabase.from(CUSTOMER_MAPPING_TABLE).insert(row);
  if (!error) return corePartnerId;
  if (!isUniqueViolation(error)) {
    throw core360Error("CUSTOMER_MAPPING_WRITE_FAILED", "No pudimos guardar el vínculo del cliente Core360.", error);
  }

  const concurrent = await loadCore360CustomerMapping({externalCustomerId, supabase});
  if (!concurrent) {
    throw core360Error("CUSTOMER_MAPPING_LOOKUP_FAILED", "No pudimos recuperar el vínculo concurrente del cliente Core360.");
  }
  assertCustomerIdentityUnchanged(concurrent, identityFingerprint);
  return requiredCorePartnerId(concurrent.core_partner_id);
}

async function loadCore360CustomerMapping({externalCustomerId, supabase}) {
  const {data, error} = await supabase
    .from(CUSTOMER_MAPPING_TABLE)
    .select("external_customer_id,core_partner_id,identity_fingerprint")
    .eq("external_customer_id", externalCustomerId)
    .maybeSingle();
  if (error) throw core360Error("CUSTOMER_MAPPING_LOOKUP_FAILED", "No pudimos cargar el vínculo del cliente Core360.", error);
  return data || null;
}

async function requestCore360({body, config, fetchImpl, path}) {
  const response = await fetchImpl(`${config.baseUrl}${CORE360_API_PREFIX}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.bearerToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: core360RequestSignal(config)
  });
  const payload = await readResponseJson(response);

  if (!response.ok) {
    const code = cleanText(payload?.code || payload?.error?.code)
      || (response.status === 409 ? "CORE360_CONFLICT" : "CORE360_REQUEST_FAILED");
    const error = core360Error(code, cleanText(payload?.message || payload?.error?.message) || `Core360 respondió ${response.status}.`);
    error.response = payload;
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function requestCore360Read({config, fetchImpl, path, query}) {
  const params = new URLSearchParams(query);
  const response = await fetchImpl(`${config.baseUrl}${CORE360_API_PREFIX}${path}${params.size ? `?${params}` : ""}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.bearerToken}`
    },
    signal: core360RequestSignal(config)
  });
  const payload = await readResponseJson(response);

  if (!response.ok) {
    const code = cleanText(payload?.code || payload?.error?.code) || "CORE360_READ_FAILED";
    const error = core360Error(code, cleanText(payload?.message || payload?.error?.message) || `Core360 respondió ${response.status}.`);
    error.response = payload;
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function requestCore360Binary({config, fetchImpl, path, query}) {
  const params = new URLSearchParams(query);
  const response = await fetchImpl(`${config.baseUrl}${CORE360_API_PREFIX}${path}${params.size ? `?${params}` : ""}`, {
    method: "GET",
    headers: {Accept: "image/*", Authorization: `Bearer ${config.bearerToken}`},
    signal: core360RequestSignal(config)
  });

  if (!response.ok) {
    const payload = await readResponseJson(response);
    const code = cleanText(payload?.code || payload?.error?.code) || "CORE360_MEDIA_READ_FAILED";
    const error = core360Error(code, cleanText(payload?.message || payload?.error?.message) || `Core360 respondió ${response.status}.`);
    error.response = payload;
    error.statusCode = response.status;
    throw error;
  }

  return {
    contentType: cleanText(response.headers?.get?.("content-type")) || "application/octet-stream",
    bytes: new Uint8Array(await response.arrayBuffer())
  };
}

async function requestCore360MediaWrite({body, config, fetchImpl, headers, method, path}) {
  const response = await fetchImpl(`${config.baseUrl}${CORE360_API_PREFIX}${path}`, {
    method,
    headers: {Authorization: `Bearer ${config.bearerToken}`, ...headers},
    body,
    signal: core360RequestSignal(config)
  });
  const payload = await readResponseJson(response);

  if (!response.ok) {
    const code = cleanText(payload?.code || payload?.error?.code) || "CORE360_MEDIA_WRITE_FAILED";
    const error = core360Error(code, cleanText(payload?.message || payload?.error?.message) || `Core360 respondió ${response.status}.`);
    error.response = payload;
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function pickReadQuery(input, allowedKeys) {
  return Object.fromEntries(
    allowedKeys
      .map((key) => [key, cleanText(input?.[key])])
      .filter(([, value]) => value)
  );
}

function buildCatalogReadQuery(input) {
  const query = pickReadQuery(input, ["cursor", "issuedOn", "limit", "priceListId", "q", "quantityMilli"]);
  const quantities = serializeQuantitiesQuery(input?.quantities);
  if (quantities) query.quantities = quantities;
  return query;
}

function serializeQuantitiesQuery(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return serializeQuantitiesQuery(parsed);
    } catch {
      throw core360Error("INVALID_CORE_QUANTITIES", "quantities debe ser un mapa JSON de item Core360 a milliunidades.");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const entries = Object.entries(value)
    .map(([itemId, quantityMilli]) => [cleanText(itemId), String(asPositiveInteger(quantityMilli, "Una cantidad Core360 no es válida."))])
    .filter(([itemId]) => itemId);
  if (entries.length === 0) return "";
  return JSON.stringify(Object.fromEntries(entries));
}

function requiredCoreProductId(value) {
  const id = cleanText(value);
  if (!id) throw core360Error("MISSING_CORE_PRODUCT_ID", "Debes indicar el artículo Core360 para escribir su imagen.");
  return id;
}

function mediaUploadHeaders({contentLength, contentType, expectedVersion, filename, idempotencyKey}) {
  const version = asNonNegativeInteger(expectedVersion, "La versión esperada de imagen Core360 no es válida.");
  const key = cleanText(idempotencyKey);
  if (!isUuid(key)) {
    throw core360Error("INVALID_MEDIA_IDEMPOTENCY_KEY", "La escritura de imagen Core360 requiere una clave de idempotencia válida.");
  }
  const type = cleanText(contentType).toLowerCase();
  const name = cleanText(filename);
  if (!type || !name) {
    throw core360Error("INVALID_MEDIA_UPLOAD", "La carga de imagen Core360 requiere contentType y filename.");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    throw core360Error("INVALID_MEDIA_UPLOAD", "Core360 sólo permite imágenes JPEG, PNG o WebP.");
  }
  if (/[\\/\r\n]/.test(name) || name.length > 255) {
    throw core360Error("INVALID_MEDIA_UPLOAD", "El filename de imagen Core360 no es válido.");
  }
  return {
    "Content-Length": String(asPositiveInteger(contentLength, "El tamaño de imagen Core360 no es válido.")),
    "Content-Type": type,
    "x-core360-expected-version": String(version),
    "x-core360-filename": encodeURIComponent(name),
    "x-core360-request-id": key
  };
}

function mediaDeleteBody({expectedVersion, idempotencyKey}) {
  const version = asNonNegativeInteger(expectedVersion, "La versión esperada de imagen Core360 no es válida.");
  const key = cleanText(idempotencyKey);
  if (!isUuid(key)) {
    throw core360Error("INVALID_MEDIA_IDEMPOTENCY_KEY", "La eliminación de imagen Core360 requiere una clave de idempotencia UUID válida.");
  }
  return {expectedVersion: version, idempotencyKey: key};
}

function normalizeImageBytes(value) {
  let bytes;
  if (value instanceof Uint8Array) {
    bytes = value;
  } else if (value instanceof ArrayBuffer) {
    bytes = new Uint8Array(value);
  } else if (ArrayBuffer.isView(value)) {
    bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  } else {
    throw core360Error("INVALID_MEDIA_UPLOAD", "La carga de imagen Core360 requiere bytes binarios.");
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CORE360_IMAGE_BYTES) {
    throw core360Error("INVALID_MEDIA_UPLOAD", "El tamaño de imagen Core360 debe estar entre 1 byte y 4 MB.");
  }
  return bytes;
}

function buildSourceLine(item) {
  const snapshot = asRecord(item?.product_snapshot);
  const productId = cleanText(item?.product_id);
  const quantity = asPositiveInteger(item?.quantity, "La línea de orden no tiene cantidad válida.");

  if (!productId) {
    throw core360Error("MISSING_PRODUCT_ID", "No se puede integrar una línea sin menu_items.id.");
  }

  return {
    commercial: {
      catalogVersion: cleanText(snapshot.core360CatalogVersion || snapshot.core360_catalog_version) || null,
      coreItemId: cleanText(snapshot.core360ItemId || snapshot.core360_item_id) || null,
      coreSku: cleanText(snapshot.core360Sku || snapshot.core360_sku) || null,
      imageReference: cleanText(snapshot.core360ImageReference || snapshot.core360_image_reference) || null,
      imageVersion: cleanText(snapshot.core360ImageVersion || snapshot.core360_image_version) || null,
      priceVersion: cleanText(snapshot.core360PriceVersion || snapshot.core360_price_version) || null,
      quantityMilliPerUnit: positiveIntegerOrNull(snapshot.core360QuantityMilliPerUnit ?? snapshot.core360_quantity_milli_per_unit),
      taxBps: nonNegativeIntegerOrNull(snapshot.core360TaxBps ?? snapshot.core360_tax_bps),
      uomCode: cleanText(snapshot.core360UomCode || snapshot.core360_uom_code) || null
    },
    lineId: cleanText(item?.id),
    quantity,
    source: {
      menuItemId: productId,
      planFrequency: cleanText(snapshot.planFrequency) || null,
      planStructure: cleanText(snapshot.planStructure) || null,
      productType: cleanText(snapshot.productType) || null,
      sku: cleanText(snapshot.sku) || null,
      slug: cleanText(snapshot.slug) || null
    },
    totalClp: asPositiveInteger(item?.total_clp, "La línea de orden no tiene total válido."),
    unitPriceClp: asPositiveInteger(item?.unit_price_clp, "La línea de orden no tiene precio válido.")
  };
}

function assertNoUnmappedOrderAdjustments(event) {
  const deliveryFee = asNonNegativeInteger(event?.order?.deliveryFeeClp, "El costo de despacho no es válido.");
  const discount = asNonNegativeInteger(event?.order?.discountClp, "El descuento no es válido.");
  if (deliveryFee > 0 || discount > 0) {
    throw core360Error(
      "ORDER_ADJUSTMENT_RECONCILIATION_REQUIRED",
      "La orden incluye despacho o descuento sin una línea/una regla comercial Core360 aprobada."
    );
  }
}

function assertCommercialVersion(mapping, line) {
  const mappingVersion = mappingCommercialVersion(mapping);
  const snapshotVersion = cleanText(line?.commercial?.priceVersion);
  if (!mappingVersion) {
    throw core360Error("PRICE_RECONCILIATION_REQUIRED", "El mapeo Core360 no tiene versión comercial.");
  }
  if (snapshotVersion && snapshotVersion !== String(mappingVersion)) {
    throw core360Error("PRICE_RECONCILIATION_REQUIRED", "La versión comercial Core360 cambió después del cobro Fullness.");
  }
}

function assertGrossPriceMatches(mapping, line) {
  const configuredGross = asPositiveInteger(mapping.gross_unit_price_minor, "El mapeo Core360 no tiene precio bruto válido.");
  const chargedGross = asPositiveInteger(line?.unitPriceClp, "La línea Fullness no tiene precio bruto válido.");
  if (configuredGross !== chargedGross) {
    throw core360Error("PRICE_RECONCILIATION_REQUIRED", "El precio bruto Core360 no coincide exactamente con el cobro Fullness.");
  }
}

function assertFrozenCommercialMapping(mapping, line) {
  const frozen = asRecord(line?.commercial);
  const expected = [
    ["coreItemId", cleanText(mapping?.core_item_id)],
    ["coreSku", cleanText(mapping?.core_sku || mapping?.sku)],
    ["uomCode", cleanText(mapping?.uom_code)],
    ["priceVersion", mappingCommercialVersion(mapping)]
  ];
  for (const [field, current] of expected) {
    const persisted = cleanText(frozen[field]);
    if (persisted && persisted !== current) {
      throw core360Error("PRICE_RECONCILIATION_REQUIRED", "La identidad comercial Core360 cambió después del cobro Fullness.");
    }
  }
  const persistedFactor = positiveIntegerOrNull(frozen.quantityMilliPerUnit);
  if (persistedFactor !== null && persistedFactor !== asPositiveInteger(mapping?.quantity_milli_per_unit || 1000, "La equivalencia Core360 no es válida.")) {
    throw core360Error("PRICE_RECONCILIATION_REQUIRED", "La equivalencia de unidades Core360 cambió después del cobro Fullness.");
  }
  const persistedTax = nonNegativeIntegerOrNull(frozen.taxBps);
  if (persistedTax !== null && persistedTax !== asNonNegativeInteger(mapping?.tax_bps ?? 1900, "El impuesto Core360 no es válido.")) {
    throw core360Error("PRICE_RECONCILIATION_REQUIRED", "El impuesto Core360 cambió después del cobro Fullness.");
  }
}

function mappingCommercialVersion(mapping) {
  return cleanText(mapping?.commercial_version ?? mapping?.record_version) || null;
}

function optionalVersion(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return asNonNegativeInteger(value, "La versión Core360 no es válida.");
}

function normalizeAvailableMilli({inventoryManaged, value}) {
  if (!inventoryManaged || value === undefined || value === null || value === "") {
    return null;
  }
  const raw = cleanText(value);
  if (!/^\d+$/.test(raw) || raw.length > 16) {
    throw core360Error("INVALID_CORE_STOCK_PROJECTION", "Core360 devolvió una disponibilidad milli inválida.");
  }
  return BigInt(raw).toString();
}

function normalizeCore360CommercialProjection({mapping, product}) {
  const sourceUnit = cleanText(mapping?.uom_code);
  const sourceFactor = asPositiveInteger(mapping?.quantity_milli_per_unit || 1000, "La equivalencia Core360 no es válida.");
  if (!product) {
    return {
      availabilityVersion: null,
      coreItemAvailable: false,
      coreSku: null,
      currency: "CLP",
      factorCompatible: null,
      grossMinor: null,
      mappingFacts: null,
      priceAvailable: false,
      productVersion: null,
      quantityMilliPerUnit: sourceFactor,
      reconciliationReason: "missing_core_item",
      taxBps: null,
      unit: sourceUnit || null,
      uomCompatible: null
    };
  }

  const productVersion = cleanText(product.commercialVersion ?? product.version) || null;
  const gross = product.lineGrossMinor;
  const grossMinor = positiveIntegerOrNull(gross);
  const currency = cleanText(product.currency || "CLP");
  const unit = cleanText(product.unit) || null;
  const coreSku = cleanText(product.sku) || null;
  const taxBps = nonNegativeIntegerOrNull(product.taxBps ?? product.tax_bps);
  const reportedFactor = positiveIntegerOrNull(product.quantityMilli ?? product.quantity_milli);
  const coreItemAvailable = isCoreItemAvailable(product);
  const uomCompatible = sourceUnit && unit ? sourceUnit === unit : false;
  const factorCompatible = reportedFactor === null ? null : reportedFactor === sourceFactor;
  const priceAvailable = coreItemAvailable
    && product.priceAvailable !== false
    && product.price_available !== false
    && currency === "CLP"
    && Boolean(productVersion)
    && Boolean(coreSku)
    && grossMinor !== null
    && taxBps !== null
    && uomCompatible
    && factorCompatible === true;
  const reconciliationReason = !coreItemAvailable
    ? "core_item_unavailable"
    : !uomCompatible
      ? "uom_reconciliation_required"
      : factorCompatible !== true
        ? "quantity_factor_reconciliation_required"
        : currency !== "CLP"
          ? "currency_reconciliation_required"
          : !productVersion || grossMinor === null || taxBps === null
            ? "commercial_fact_incomplete"
            : priceAvailable
              ? null
              : "price_unavailable";

  return {
    availabilityVersion: cleanText(product.availabilityVersion ?? product.availability_version) || null,
    coreItemAvailable,
    coreSku,
    currency: currency || "CLP",
    factorCompatible,
    grossMinor: grossMinor === null ? null : String(grossMinor),
    mappingFacts: priceAvailable ? true : null,
    priceAvailable,
    productVersion,
    quantityMilliPerUnit: sourceFactor,
    reconciliationReason,
    taxBps,
    unit,
    uomCompatible
  };
}

function normalizeCore360StockProjection({coreItemId, mapping, observedAt, product, sourceMenuItemId}) {
  const commercial = normalizeCore360CommercialProjection({mapping, product});
  const inventoryManaged = Boolean(product) && product.inventory_enabled !== false && product.inventoryManaged !== false;
  const availableMilli = normalizeAvailableMilli({
    inventoryManaged,
    value: product?.available_milli ?? product?.availableMilli
  });
  return {
    availability_version: commercial.availabilityVersion,
    available_milli: availableMilli,
    core_item_id: coreItemId,
    inventory_managed: inventoryManaged,
    observed_at: observedAt,
    source_menu_item_id: sourceMenuItemId,
    stock_known: inventoryManaged && availableMilli !== null
  };
}

function isCoreItemAvailable(product) {
  const status = cleanText(product?.status).toLowerCase();
  return product?.is_active !== false
    && product?.isActive !== false
    && product?.active !== false
    && product?.sale_enabled !== false
    && product?.saleEnabled !== false
    && !["archived", "disabled", "inactive", "retired"].includes(status);
}

function positiveIntegerOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  try {
    return asPositiveInteger(value, "El importe o factor Core360 no es válido.");
  } catch {
    return null;
  }
}

function nonNegativeIntegerOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  try {
    return asNonNegativeInteger(value, "El impuesto Core360 no es válido.");
  } catch {
    return null;
  }
}

function normalizeCore360OrderState({expectedCoreOrderId, orderId, polledAt, state}) {
  const externalOrderId = cleanText(state?.externalOrderId);
  const coreOrderId = cleanText(state?.coreOrderId || state?.id);
  const sourceVersion = cleanText(state?.sourceVersion);
  const coreOrderVersion = optionalVersion(state?.version);
  if (externalOrderId !== orderId || coreOrderId !== expectedCoreOrderId || !sourceVersion || coreOrderVersion === null) {
    throw core360Error("INVALID_CORE_ORDER_STATE", "Core360 devolvió un estado de orden que no corresponde al pedido Fullness aceptado.");
  }

  const commercial = asRecord(state?.commercial);
  const fulfillment = asRecord(state?.fulfillment);
  const fiscal = asRecord(state?.fiscal);
  return {
    p_commercial_status: cleanText(commercial.status || state?.commercialStatus || state?.status) || "unknown",
    p_core_order_id: coreOrderId,
    p_core_order_version: coreOrderVersion,
    p_fiscal_artifact_reference: cleanText(fiscal.artifactReference || fiscal.artifact_url || state?.fiscalArtifactReference) || null,
    p_fiscal_document_type: cleanText(fiscal.documentType || fiscal.document_type || state?.fiscalDocumentType) || null,
    p_fiscal_folio: cleanText(fiscal.folio || state?.fiscalFolio) || null,
    p_fiscal_status: cleanText(fiscal.status || state?.fiscalStatus) || "unknown",
    p_fulfillment_status: cleanText(fulfillment.status || state?.fulfillmentStatus) || null,
    p_order_id: orderId,
    p_provider_payload: asRecord(state),
    p_received_at: cleanText(polledAt) || nextCore360PollTimestamp(),
    p_source_version: sourceVersion
  };
}

function observedPaymentLiveMode(payment) {
  const rawMode = asRecord(payment?.raw_payload).live_mode;
  if (typeof rawMode === "boolean") return rawMode;
  return typeof payment?.live_mode === "boolean" ? payment.live_mode : null;
}

function assertCore360LivePayment({env, liveMode}) {
  // Synthetic provider facts are allowed only in the already constrained
  // loopback QA environment. A public Core target always requires evidence
  // from Mercado Pago itself; missing or string-coerced live_mode is rejected.
  let loopbackQa = false;
  try {
    const target = new URL(cleanText(env.CORE360_BASE_URL));
    loopbackQa = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
      && cleanText(env.CORE360_COMMERCE_TEST_MODE).toLowerCase() === "true";
  } catch {}
  if (loopbackQa) return;
  if (liveMode !== true
    || cleanText(env.MERCADOPAGO_TEST_MODE).toLowerCase() === "true"
    || cleanText(env.MERCADOPAGO_ACCESS_TOKEN).startsWith("TEST-")) {
    throw core360Error("CORE360_NON_LIVE_PAYMENT", "Core360 productivo requiere un pago Mercado Pago live_mode=true y configuración de cobro real.");
  }
}

function requiredCore360SyncCutover(env) {
  const raw = cleanText(env?.CORE360_COMMERCE_SYNC_FROM);
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) {
    throw core360Error(
      "CORE360_SYNC_CUTOVER_REQUIRED",
      "CORE360_COMMERCE_SYNC_FROM ISO es obligatorio antes de entregar pedidos a Core360."
    );
  }
  return parsed.toISOString();
}

function assertCore360SyncCutover({env, occurredAt}) {
  if (!isCore360SyncEventEligible({env, occurredAt})) {
    throw core360Error(
      "CORE360_SYNC_BEFORE_CUTOVER",
      "El pago ocurrió antes del corte operativo Core360 y no se incorporará al outbox."
    );
  }
}

function isCore360SyncEventEligible({env, occurredAt}) {
  const occurred = new Date(cleanText(occurredAt));
  if (Number.isNaN(occurred.getTime())) {
    throw core360Error("CORE360_SYNC_EVENT_TIMESTAMP_REQUIRED", "El pago aprobado requiere paid_at ISO para evaluar el corte Core360.");
  }
  return occurred.getTime() >= new Date(requiredCore360SyncCutover(env)).getTime();
}

function maxCore360DeliveryAttempts(env) {
  const raw = cleanText(env?.CORE360_COMMERCE_MAX_DELIVERY_ATTEMPTS);
  if (!raw) return DEFAULT_MAX_DELIVERY_ATTEMPTS;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_DELIVERY_ATTEMPTS) {
    throw core360Error("INVALID_CORE360_DELIVERY_ATTEMPTS", `CORE360_COMMERCE_MAX_DELIVERY_ATTEMPTS debe ser un entero entre 1 y ${MAX_DELIVERY_ATTEMPTS}.`);
  }
  return value;
}

function core360RequestTimeoutMs(env) {
  const raw = cleanText(env?.CORE360_COMMERCE_REQUEST_TIMEOUT_MS);
  if (!raw) return DEFAULT_CORE360_REQUEST_TIMEOUT_MS;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < MIN_CORE360_REQUEST_TIMEOUT_MS || value > MAX_CORE360_REQUEST_TIMEOUT_MS) {
    throw core360Error(
      "INVALID_CORE360_REQUEST_TIMEOUT",
      `CORE360_COMMERCE_REQUEST_TIMEOUT_MS debe ser un entero entre ${MIN_CORE360_REQUEST_TIMEOUT_MS} y ${MAX_CORE360_REQUEST_TIMEOUT_MS}.`
    );
  }
  return value;
}

function core360RequestSignal(config) {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(Number(config?.requestTimeoutMs) || DEFAULT_CORE360_REQUEST_TIMEOUT_MS)
    : undefined;
}

function retryAt({attemptCount, now}) {
  const exponent = Math.max(0, Math.min(10, Number(attemptCount || 1) - 1));
  const delay = Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * (2 ** exponent));
  return new Date(new Date(now).getTime() + delay).toISOString();
}

function optionalCoreToken(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const token = cleanText(value);
  if (!token || token.length > 512) throw core360Error("INVALID_CORE_ORDER_EVENT", "El token Core360 no es válido.");
  return token;
}

function uniqueDefined(values) {
  return [...new Set((values || []).map(cleanText).filter(Boolean))];
}

function deterministicEventId(seed) {
  const hex = createHash("sha256").update(cleanText(seed)).digest("hex");
  const variant = Number.parseInt(hex.slice(16, 18), 16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((variant & 0x3f) | 0x80).toString(16).padStart(2, "0")}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

function assertCore360OrderTotals(event) {
  const linesTotal = (event.lines || []).reduce((total, line) => total + asPositiveInteger(line?.totalClp, "Una línea no tiene total válido."), 0);
  const subtotalClp = asNonNegativeInteger(event?.order?.subtotalClp, "El subtotal no es válido.");
  const discountClp = asNonNegativeInteger(event?.order?.discountClp, "El descuento no es válido.");
  const deliveryFeeClp = asNonNegativeInteger(event?.order?.deliveryFeeClp, "El costo de despacho no es válido.");
  const totalClp = asPositiveInteger(event?.order?.totalClp, "El total no es válido.");

  if (linesTotal !== subtotalClp) {
    throw core360Error("LINE_TOTAL_RECONCILIATION_REQUIRED", "Las líneas de producto no coinciden con el subtotal Fullness.");
  }
  if (subtotalClp - discountClp + deliveryFeeClp !== totalClp) {
    throw core360Error("ORDER_TOTAL_RECONCILIATION_REQUIRED", "Subtotal, descuento, despacho y total Fullness no concilian.");
  }
}

function assertCore360CheckoutPreview({request, result}) {
  // `availableMilli` is intentionally not part of this commercial assertion.
  // A pending preparation order may legitimately have zero current balance;
  // do not create a fake reservation or infer stock from the storefront.
  if (cleanText(result?.currency) !== "CLP" || cleanText(result?.totalMinor) !== cleanText(request?.expectedTotalMinor)) {
    throw core360Error("PRICE_RECONCILIATION_REQUIRED", "Core360 no confirmó el mismo total antes de crear el cobro.");
  }
  const expectedLines = Array.isArray(request?.lines) ? request.lines : [];
  const projectedLines = Array.isArray(result?.lines) ? result.lines : [];
  if (!expectedLines.length || expectedLines.length !== projectedLines.length) {
    throw core360Error("CATALOG_VERSION_CONFLICT", "Core360 no confirmó todas las líneas del checkout.");
  }
  for (let index = 0; index < expectedLines.length; index += 1) {
    const expected = expectedLines[index];
    const projected = projectedLines[index] || {};
    for (const field of ["itemId", "unit", "sku", "commercialVersion", "unitGrossMinor", "lineGrossMinor", "taxBps"]) {
      if (String(projected[field] ?? "") !== String(expected[field] ?? "")) {
        throw core360Error("CATALOG_VERSION_CONFLICT", "Core360 informó una versión, unidad, impuesto o precio distinta antes del cobro.");
      }
    }
    if (projected.priceAvailable !== true) {
      throw core360Error("CATALOG_VERSION_CONFLICT", "Core360 no dejó disponible una línea del checkout.");
    }
  }
}

function externalCustomerIdFor(orderId, clientId) {
  const stableClientId = cleanText(clientId);
  return isUuid(stableClientId) ? stableClientId : orderId;
}

function customerIdentityFingerprint(customer) {
  const canonical = JSON.stringify({
    email: cleanText(customer?.email).toLowerCase(),
    phone: cleanText(customer?.phone),
    title: cleanText(customer?.title)
  });
  return createHash("sha256").update(canonical).digest("hex");
}

function assertCustomerIdentityUnchanged(mapping, expectedFingerprint) {
  if (cleanText(mapping?.identity_fingerprint) !== expectedFingerprint) {
    throw core360Error(
      "CUSTOMER_RECONCILIATION_REQUIRED",
      "La identidad del cliente Core360 cambió; requiere conciliación explícita y no se fusiona por email."
    );
  }
}

function requiredCorePartnerId(value) {
  const id = cleanText(value);
  if (!isUuid(id)) {
    throw core360Error("INVALID_CORE_CUSTOMER", "Core360 no devolvió un UUID de cliente válido.");
  }
  return id;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanText(value));
}

function chileBusinessDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Santiago",
    year: "numeric"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}

function compactUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function responseSummary(value) {
  if (!value || typeof value !== "object") return null;
  return compactUndefined({
    code: cleanText(value.code || value.error?.code) || undefined,
    coreOrderId: cleanText(value.coreOrderId || value.id) || undefined,
    fiscalStatus: cleanText(value.fiscal?.status || value.fiscalStatus) || undefined,
    message: cleanText(value.message || value.error?.message).slice(0, 500) || undefined
  });
}

function core360RequestHash(request) {
  return createHash("sha256").update(canonicalJson(request)).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function isUniqueViolation(error) {
  return error?.code === "23505" || /duplicate key|unique/i.test(cleanText(error?.message));
}

async function updateOutbox(supabase, id, update, leaseToken = null) {
  let query = supabase.from(OUTBOX_TABLE).update(update).eq("id", id);
  if (leaseToken) {
    query = query.eq("lease_token", leaseToken);
    const {data, error} = await query.select("id").maybeSingle();
    if (error) throw core360Error("OUTBOX_UPDATE_FAILED", "No pudimos actualizar el estado Core360.", error);
    if (!data?.id) throw core360Error("OUTBOX_LEASE_LOST", "El lease del outbox Core360 fue reclamado por otro worker.");
    return;
  }
  const {error} = await query;
  if (error) throw core360Error("OUTBOX_UPDATE_FAILED", "No pudimos actualizar el estado Core360.", error);
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function asPositiveInteger(value, message) {
  const parsed = Math.round(Number(value));
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw core360Error("INVALID_AMOUNT", message);
  return parsed;
}

function asNonNegativeInteger(value, message) {
  const parsed = Math.round(Number(value || 0));
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw core360Error("INVALID_AMOUNT", message);
  return parsed;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function core360Error(code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.code = code;
  return error;
}
