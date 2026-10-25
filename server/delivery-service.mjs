// Explicit bindings to services created, with Carlos' approval, in Fullnesslab
// (company f8d85871-8871-5103-91a7-b2489747ee21) on 2026-10-25.
// Commercial facts are fetched from Core360 before checkout, not guessed here.
export const DELIVERY_SERVICE_BINDINGS = Object.freeze([
  Object.freeze({feeClp: 3990, coreItemId: "b7c4620f-e066-43ff-9807-10e94c8418fa", coreSku: "FULL-DESPACHO-LB"}),
  Object.freeze({feeClp: 5990, coreItemId: "ef8d4c67-4afb-4ee0-af4d-15f9c702e6d4", coreSku: "FULL-DESPACHO-LC-VIT"})
]);

export function deliveryServiceBinding(feeClp) {
  const binding = DELIVERY_SERVICE_BINDINGS.find((row) => row.feeClp === feeClp);
  if (!binding) throw deliveryServiceError("El despacho no tiene un servicio Core360 aprobado.");
  return binding;
}

export function deliveryServiceError(message) {
  const error = new Error(message);
  error.code = "DELIVERY_SERVICE_RECONCILIATION_REQUIRED";
  error.statusCode = 503;
  return error;
}

export function snapshotDeliveryService(row, feeClp) {
  const binding = deliveryServiceBinding(feeClp);
  if (!row || row.id !== binding.coreItemId || row.sku !== binding.coreSku || row.item_type !== "service"
    || row.inventory_enabled !== false || row.active !== true || row.sale_enabled !== true
    || row.currency !== "CLP" || row.priceBasis !== "gross" || row.priceAvailable !== true
    || String(row.unitGrossMinor) !== String(feeClp) || String(row.lineGrossMinor) !== String(feeClp)
    || String(row.quantityMilli) !== "1000") {
    throw deliveryServiceError("Core360 no confirmó el servicio ni el mismo precio final de despacho. No se creó un cobro.");
  }
  const snapshot = {
    bindingVersion: "2026-10-25",
    coreItemId: binding.coreItemId,
    coreSku: binding.coreSku,
    commercialVersion: row.commercialVersion,
    unit: row.unit,
    quantityMilli: "1000",
    unitGrossMinor: String(feeClp),
    lineGrossMinor: String(feeClp),
    taxBps: row.tax_bps,
    currency: "CLP",
    inventoryManaged: false
  };
  assertDeliveryServiceSnapshot(snapshot, feeClp);
  return snapshot;
}

export function assertDeliveryServiceSnapshot(snapshot, feeClp) {
  const binding = deliveryServiceBinding(feeClp);
  if (!snapshot || snapshot.bindingVersion !== "2026-10-25" || snapshot.coreItemId !== binding.coreItemId
    || snapshot.coreSku !== binding.coreSku || snapshot.inventoryManaged !== false
    || snapshot.currency !== "CLP" || snapshot.quantityMilli !== "1000"
    || snapshot.unitGrossMinor !== String(feeClp) || snapshot.lineGrossMinor !== String(feeClp)
    || typeof snapshot.commercialVersion !== "string" || !snapshot.commercialVersion.trim()
    || typeof snapshot.unit !== "string" || !snapshot.unit.trim()
    || !Number.isSafeInteger(snapshot.taxBps) || snapshot.taxBps < 0 || snapshot.taxBps > 10000) {
    throw deliveryServiceError("El cargo de despacho no tiene una identidad comercial Core360 íntegra.");
  }
}

export function deliveryServiceCoreLine(snapshot, feeClp) {
  assertDeliveryServiceSnapshot(snapshot, feeClp);
  return {
    itemId: snapshot.coreItemId,
    sku: snapshot.coreSku,
    unit: snapshot.unit,
    quantityMilli: snapshot.quantityMilli,
    commercialVersion: snapshot.commercialVersion,
    unitGrossMinor: snapshot.unitGrossMinor,
    lineGrossMinor: snapshot.lineGrossMinor,
    taxBps: snapshot.taxBps
  };
}
