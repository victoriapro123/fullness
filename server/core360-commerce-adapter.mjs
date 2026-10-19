import {createHash} from "node:crypto";

const CORE360_API_PREFIX = "/api/commerce/v1";
const CORE360_EVENT_TYPE = "web_order.payment_approved";
const CORE360_SCHEMA_VERSION = 2;
const OUTBOX_TABLE = "core360_commerce_outbox";
const PRODUCT_MAPPING_TABLE = "core360_product_mappings";
const ADJUSTMENT_MAPPING_TABLE = "core360_commerce_adjustment_mappings";
const MAX_RECONCILE_PAGE_SIZE = 100;
const RECONCILE_ORDER_SELECT = [
  "id",
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
  "payments(provider,provider_payment_id,status,transaction_amount_clp,currency,paid_at)"
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

export async function readCore360Catalog({env = process.env, fetchImpl = fetch, query = {}} = {}) {
  if (!isCore360CommerceReadEnabled(env)) {
    return {enabled: false, skipped: true, reason: "read-disabled"};
  }

  const config = getCore360ReadConfig(env);
  const result = await requestCore360Read({
    config,
    fetchImpl,
    path: "/products",
    query: pickReadQuery(query, ["cursor", "limit", "priceListId", "q"])
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
    query: pickReadQuery(query, ["cursor", "itemId", "limit", "q"])
  });

  return {enabled: true, ...result};
}

/**
 * Incremental order-state reader. It is not invoked by checkout or a webhook;
 * a future authenticated worker must opt in with CORE360_COMMERCE_POLL_ENABLED.
 */
export async function readCore360OrderStates({env = process.env, fetchImpl = fetch, query = {}} = {}) {
  if (!isCore360CommercePollingEnabled(env)) {
    return {enabled: false, skipped: true, reason: "polling-disabled"};
  }

  const config = getCore360ReadConfig(env);
  const result = await requestCore360Read({
    config,
    fetchImpl,
    path: "/orders",
    query: pickReadQuery(query, ["cursor", "externalOrderId", "limit", "sinceVersion"])
  });

  return {enabled: true, ...result};
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
      externalCustomerId: externalCustomerIdFor(orderId, customer),
      email: cleanText(customer.email).toLowerCase(),
      phone: cleanText(customer.phone),
      title: cleanText(customer.name)
    },
    payment: {
      amountClp: asPositiveInteger(payment?.transaction_amount_clp || totalClp, "El pago no tiene monto válido."),
      amountGrossMinor: String(asPositiveInteger(payment?.transaction_amount_clp || totalClp, "El pago no tiene monto válido.")),
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

  const pageSize = Math.max(1, Math.min(MAX_RECONCILE_PAGE_SIZE, Math.round(Number(limit) || 50)));
  let ordersQuery = supabase
    .from("orders")
    .select(RECONCILE_ORDER_SELECT)
    .eq("status", "paid")
    .eq("payment_status", "approved");

  const afterPaidAt = cleanText(cursor?.paidAt);
  const afterOrderId = cleanText(cursor?.orderId);
  if (afterPaidAt && afterOrderId) {
    ordersQuery = ordersQuery.or(`paid_at.gt.${afterPaidAt},and(paid_at.eq.${afterPaidAt},id.gt.${afterOrderId})`);
  }

  const {data: orders, error: ordersError} = await ordersQuery
    .order("paid_at", {ascending: true})
    .order("id", {ascending: true})
    .limit(pageSize);
  if (ordersError) throw core360Error("RECONCILE_READ_FAILED", "No pudimos cargar órdenes pagadas para Core360.", ordersError);

  const page = orders || [];
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
  return {
    enabled: true,
    failed,
    nextCursor: last?.paid_at && last?.id ? {orderId: last.id, paidAt: last.paid_at} : null,
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
export async function deliverCore360OutboxEvent({env = process.env, event, fetchImpl = fetch, supabase}) {
  if (!isCore360CommerceDeliveryEnabled(env)) {
    return {enabled: false, skipped: true, reason: "delivery-disabled"};
  }
  if (!supabase?.from) throw core360Error("MISSING_SUPABASE", "No hay cliente de Supabase para entregar a Core360.");

  const outboxId = cleanText(event?.id);
  const payload = asRecord(event?.payload);
  if (!outboxId || payload.event !== CORE360_EVENT_TYPE) {
    throw core360Error("INVALID_OUTBOX_EVENT", "El evento de outbox Core360 no es válido.");
  }

  await updateOutbox(supabase, outboxId, {
    attempt_count: Number(event?.attempt_count || 0) + 1,
    last_attempt_at: new Date().toISOString(),
    status: "sending"
  });

  try {
    const config = getCore360Config(env);
    const mappings = await loadProductMappings({supabase, menuItemIds: payload.lines?.map((line) => line?.source?.menuItemId)});
    const adjustmentMappings = await loadAdjustmentMappings({
      adjustmentKinds: adjustmentKindsFor(payload),
      supabase
    });
    const request = createCore360OrderRequest({config, event: payload, mappings, adjustmentMappings});

    await requestCore360({body: request.customer, config, fetchImpl, path: "/customers"});
    const result = await requestCore360({body: request.order, config, fetchImpl, path: "/orders"});

    await updateOutbox(supabase, outboxId, {
      core_order_id: cleanText(result?.coreOrderId || result?.id) || null,
      delivered_at: new Date().toISOString(),
      last_error: null,
      response_summary: responseSummary(result),
      status: "accepted"
    });

    return {accepted: true, coreOrderId: cleanText(result?.coreOrderId || result?.id) || null, result};
  } catch (error) {
    const state = error.code === "PRICE_RECONCILIATION_REQUIRED"
      ? "price_reconciliation_required"
      : error.code === "MISSING_PRODUCT_MAPPING" || error.code === "ADJUSTMENT_MAPPING_REQUIRED"
        ? "needs_mapping"
        : error.code === "STOCK_UNAVAILABLE"
          ? "stock_unavailable"
        : "retry";
    await updateOutbox(supabase, outboxId, {
      last_error: cleanText(error.message).slice(0, 1000) || "Core360 delivery failed.",
      response_summary: responseSummary(error.response),
      status: state
    });
    throw error;
  }
}

export function createCore360OrderRequest({config, event, mappings, adjustmentMappings = []}) {
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

    const quantityMilli = asPositiveInteger(line?.quantity, "La cantidad Fullness no es válida.")
      * asPositiveInteger(mapping.quantity_milli_per_unit || 1000, "La equivalencia Core360 no es válida.");
    if (!Number.isSafeInteger(quantityMilli)) {
      throw core360Error("INVALID_CORE_QUANTITY", "La cantidad Core360 supera el rango seguro.");
    }
    assertCommercialVersion(mapping, line);
    assertGrossPriceMatches(mapping, line);

    return {
      commercialVersion: mappingCommercialVersion(mapping),
      itemIdCore: cleanText(mapping.core_item_id),
      lineGrossMinor: String(asPositiveInteger(line?.totalClp, "La línea no tiene total bruto válido.")),
      quantityMilli: String(quantityMilli),
      sku: cleanText(mapping.core_sku || mapping.sku) || undefined,
      taxBps: asNonNegativeInteger(mapping.tax_bps ?? 1900, "El impuesto Core360 no es válido."),
      unitGrossMinor: String(asPositiveInteger(line?.unitPriceClp, "La línea no tiene precio bruto válido.")),
      uomCode: cleanText(mapping.uom_code) || "unit"
    };
  });

  if (coreLines.some((line) => !line.itemIdCore)) {
    throw core360Error("MISSING_PRODUCT_MAPPING", "Un mapeo Core360 no tiene itemIdCore.");
  }

  const adjustments = buildCore360Adjustments({event, mappings: adjustmentMappings});

  return {
    customer: {
      email: event.customer.email || undefined,
      externalCustomerId: event.customer.externalCustomerId,
      phone: event.customer.phone || undefined,
      title: event.customer.title || undefined
    },
    order: compactUndefined({
      adjustments,
      catalogVersion: uniqueVersion(coreLines.map((line) => line.commercialVersion)),
      channel: cleanText(event.channel) || "fullness-web",
      currency: "CLP",
      eventId: cleanText(event.eventId),
      expectedTotals: {
        currency: "CLP",
        deliveryGrossMinor: cleanText(event.order.deliveryGrossMinor),
        discountGrossMinor: cleanText(event.order.discountGrossMinor),
        subtotalGrossMinor: cleanText(event.order.subtotalGrossMinor),
        totalGrossMinor: cleanText(event.order.totalGrossMinor)
      },
      expectedTotalMinor: String(event.order.totalClp),
      externalOrderId: event.order.id,
      fiscalIntent: config.fiscalIntent,
      issuedOn: event.order.issuedOn,
      lines: coreLines,
      partnerIdCore: config.partnerIdCore,
      payment: {
        amountGrossMinor: cleanText(event.payment.amountGrossMinor),
        method: "other",
        reference: event.payment.reference,
        status: "observed"
      },
      priceListId: config.priceListId || undefined,
      schemaVersion: Number(event.schemaVersion || CORE360_SCHEMA_VERSION),
      title: `Pedido web Fullness ${event.order.id.slice(0, 8).toUpperCase()}`
    })
  };
}

export function getCore360Config(env = process.env) {
  const {baseUrl, bearerToken} = getCore360ReadConfig(env);
  const partnerIdCore = cleanText(env.CORE360_PARTNER_ID);
  const fiscalIntent = cleanText(env.CORE360_FISCAL_INTENT || "pending");

  if (!partnerIdCore) {
    throw core360Error("MISSING_CORE360_CONFIG", "Faltan credenciales o partner Core360 para entregar órdenes.");
  }
  if (fiscalIntent !== "pending") {
    throw core360Error("FISCAL_NOT_APPROVED", "CORE360_FISCAL_INTENT debe mantenerse pending hasta validar la emisión DTE.");
  }

  return {
    baseUrl,
    bearerToken,
    fiscalIntent,
    partnerIdCore,
    priceListId: cleanText(env.CORE360_PRICE_LIST_ID)
  };
}

function getCore360ReadConfig(env = process.env) {
  const baseUrl = cleanText(env.CORE360_BASE_URL).replace(/\/+$/, "");
  const bearerToken = cleanText(env.CORE360_COMMERCE_TOKEN);

  if (!baseUrl || !/^https:\/\//i.test(baseUrl)) {
    throw core360Error("MISSING_CORE360_CONFIG", "CORE360_BASE_URL HTTPS es obligatoria para consultar Core360.");
  }
  if (!bearerToken) {
    throw core360Error("MISSING_CORE360_CONFIG", "Falta la credencial privada de Core360 para consultar catálogo o stock.");
  }

  return {baseUrl, bearerToken};
}

async function loadProductMappings({supabase, menuItemIds}) {
  const ids = [...new Set((menuItemIds || []).map(cleanText).filter(Boolean))];
  if (ids.length === 0) return [];

  const {data, error} = await supabase
    .from(PRODUCT_MAPPING_TABLE)
    .select("source_menu_item_id,core_item_id,core_sku,sku,quantity_milli_per_unit,uom_code,commercial_version,record_version,gross_unit_price_minor,tax_bps,is_active")
    .in("source_menu_item_id", ids)
    .eq("is_active", true);
  if (error) throw core360Error("MAPPING_LOOKUP_FAILED", "No pudimos cargar los mapeos Core360.", error);
  return data || [];
}

async function loadAdjustmentMappings({adjustmentKinds, supabase}) {
  if (!Array.isArray(adjustmentKinds) || adjustmentKinds.length === 0) return [];

  const {data, error} = await supabase
    .from(ADJUSTMENT_MAPPING_TABLE)
    .select("adjustment_kind,core_adjustment_id,commercial_version,tax_bps,is_active")
    .in("adjustment_kind", adjustmentKinds)
    .eq("is_active", true);
  if (error) throw core360Error("ADJUSTMENT_MAPPING_LOOKUP_FAILED", "No pudimos cargar los ajustes Core360.", error);
  return data || [];
}

async function requestCore360({body, config, fetchImpl, path}) {
  const response = await fetchImpl(`${config.baseUrl}${CORE360_API_PREFIX}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.bearerToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
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
    }
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

function pickReadQuery(input, allowedKeys) {
  return Object.fromEntries(
    allowedKeys
      .map((key) => [key, cleanText(input?.[key])])
      .filter(([, value]) => value)
  );
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
      imageReference: cleanText(snapshot.core360ImageReference || snapshot.core360_image_reference) || null,
      priceVersion: cleanText(snapshot.core360PriceVersion || snapshot.core360_price_version) || null
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

function adjustmentKindsFor(event) {
  const kinds = [];
  if (asNonNegativeInteger(event?.order?.deliveryFeeClp, "El costo de despacho no es válido.") > 0) kinds.push("delivery");
  if (asNonNegativeInteger(event?.order?.discountClp, "El descuento no es válido.") > 0) kinds.push("discount");
  return kinds;
}

function buildCore360Adjustments({event, mappings}) {
  const adjustments = [];
  const mappingByKind = new Map((mappings || []).map((mapping) => [cleanText(mapping.adjustment_kind), mapping]));

  for (const kind of adjustmentKindsFor(event)) {
    const mapping = mappingByKind.get(kind);
    if (!mapping || mapping.is_active === false || !cleanText(mapping.core_adjustment_id)) {
      throw core360Error("ADJUSTMENT_MAPPING_REQUIRED", `Falta el ajuste Core360 para ${kind === "delivery" ? "despacho" : "descuento"}.`);
    }
    const amount = kind === "delivery" ? event.order.deliveryFeeClp : event.order.discountClp;
    adjustments.push({
      amountGrossMinor: String(asNonNegativeInteger(amount, "El ajuste Core360 no es válido.")),
      commercialVersion: mappingCommercialVersion(mapping),
      coreAdjustmentId: cleanText(mapping.core_adjustment_id),
      kind,
      taxBps: asNonNegativeInteger(mapping.tax_bps ?? 1900, "El impuesto del ajuste Core360 no es válido.")
    });
  }

  return adjustments;
}

function assertCommercialVersion(mapping, line) {
  const mappingVersion = mappingCommercialVersion(mapping);
  const snapshotVersion = cleanText(line?.commercial?.priceVersion);
  if (!mappingVersion) {
    throw core360Error("PRICE_RECONCILIATION_REQUIRED", "El mapeo Core360 no tiene versión comercial.");
  }
  if (snapshotVersion && snapshotVersion !== mappingVersion) {
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

function mappingCommercialVersion(mapping) {
  return cleanText(mapping?.commercial_version || mapping?.record_version);
}

function uniqueDefined(values) {
  return [...new Set((values || []).map(cleanText).filter(Boolean))];
}

function uniqueVersion(values) {
  const versions = uniqueDefined(values);
  return versions.length === 1 ? versions[0] : undefined;
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

function externalCustomerIdFor(orderId, customer) {
  const email = cleanText(customer?.email).toLowerCase();
  if (!email) return `fullness-web:order:${orderId}`;
  const digest = createHash("sha256").update(email).digest("hex").slice(0, 32);
  return `fullness-web:email:${digest}`;
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

function isUniqueViolation(error) {
  return error?.code === "23505" || /duplicate key|unique/i.test(cleanText(error?.message));
}

async function updateOutbox(supabase, id, update) {
  const {error} = await supabase.from(OUTBOX_TABLE).update(update).eq("id", id);
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
