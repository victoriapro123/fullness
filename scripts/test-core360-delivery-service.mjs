import assert from "node:assert/strict";
import {DELIVERY_SERVICE_BINDINGS, snapshotDeliveryService} from "../server/delivery-service.mjs";
import {buildCore360PaymentApprovedEvent, createCore360OrderRequest, createCore360CheckoutPreviewRequest, resolveCore360DeliveryService} from "../server/core360-commerce-adapter.mjs";

const env = {CORE360_BASE_URL: "https://core360.example.test", CORE360_COMMERCE_TOKEN: "qa-private", CORE360_COMMERCE_READ_ENABLED: "true"};
const product = {id: "33333333-3333-4333-8333-333333333333", price_clp: 64260, core360_item_id: "44444444-4444-4444-8444-444444444444", core360_sku: "QA-PLAN", core360_uom_code: "un", core360_quantity_milli_per_unit: 1000, core360_commercial_version: "qa-price-v1", core360_tax_bps: 1900};
const config = {fiscalIntent: "pending"};
const mapping = {source_menu_item_id: product.id, core_item_id: product.core360_item_id, core_sku: "QA-PLAN", quantity_milli_per_unit: 1000, uom_code: "un", commercial_version: "qa-price-v1", gross_unit_price_minor: 64260, tax_bps: 1900, is_active: true};

export function serviceRow(binding) {
  return {id: binding.coreItemId, sku: binding.coreSku, item_type: "service", inventory_enabled: false, active: true, sale_enabled: true, currency: "CLP", priceBasis: "gross", priceAvailable: true, unitGrossMinor: String(binding.feeClp), lineGrossMinor: String(binding.feeClp), quantityMilli: "1000", tax_bps: 1900, unit: "UN", commercialVersion: "qa-service-v1"};
}

for (const binding of DELIVERY_SERVICE_BINDINGS) {
  const row = serviceRow(binding);
  const service = snapshotDeliveryService(row, binding.feeClp);
  const resolved = await resolveCore360DeliveryService({env, feeClp: binding.feeClp, issuedOn: "2026-10-25", fetchImpl: async (url) => {
    assert.match(url, /\/products\?/);
    assert.equal(new URL(url).searchParams.get("q"), binding.coreSku);
    return new Response(JSON.stringify({rows: [row], page: {nextCursor: null}}), {status: 200, headers: {"Content-Type": "application/json"}});
  }});
  assert.deepEqual(resolved, service);
  const preview = createCore360CheckoutPreviewRequest({config, items: [{product, quantity: 2}], deliveryService: service});
  assert.equal(preview.order.lines.length, 2);
  assert.equal(preview.order.lines[1].quantityMilli, "1000", "Un envío por pedido, no por plato/cantidad");
  assert.equal(preview.order.expectedTotalMinor, String(64260 * 2 + binding.feeClp));
  assert.equal(preview.order.lines[1].itemId, binding.coreItemId);

  const order = {id: "55555555-5555-4555-8555-555555555555", currency: "CLP", ordered_at: "2026-10-25T15:00:00Z", subtotal_clp: 128520, delivery_fee_clp: binding.feeClp, discount_clp: 0, total_clp: 128520 + binding.feeClp, customer_snapshot: {mode: "delivery", deliveryService: service}};
  const items = [{id: "66666666-6666-4666-8666-666666666666", product_id: product.id, quantity: 2, unit_price_clp: 64260, total_clp: 128520, product_snapshot: {core360ItemId: product.core360_item_id, core360Sku: "QA-PLAN", core360UomCode: "un", core360PriceVersion: "qa-price-v1", core360TaxBps: 1900}}];
  const event = buildCore360PaymentApprovedEvent({order, items, payment: {provider: "mercado_pago", status: "approved", provider_payment_id: "123456789", transaction_amount_clp: order.total_clp, paid_at: "2026-10-25T15:00:00Z"}});
  const request = createCore360OrderRequest({config, event, mappings: [mapping]});
  assert.equal(request.order.lines.length, 2);
  assert.equal(request.order.expectedTotalMinor, String(order.total_clp));
  assert.equal(request.order.lines.reduce((sum, line) => sum + Number(line.lineGrossMinor), 0), order.total_clp);
  assert.deepEqual(request.order.lines[1], preview.order.lines[1]);
  assert.throws(() => createCore360OrderRequest({config, event: {...event, order: {...event.order, deliveryService: null}}, mappings: [mapping]}), /despacho/i);
  assert.throws(() => createCore360OrderRequest({config, event: {...event, order: {...event.order, subtotalClp: 128521, discountClp: 1}}, mappings: [mapping]}));

  for (const change of [{id: "77777777-7777-4777-8777-777777777777"}, {unitGrossMinor: "1"}, {lineGrossMinor: "1"}, {sku: "otro"}, {item_type: "product"}, {inventory_enabled: true}, {sale_enabled: false}, {active: false}, {currency: "USD"}, {tax_bps: null}, {commercialVersion: ""}, {priceAvailable: false}]) {
    assert.throws(() => snapshotDeliveryService({...row, ...change}, binding.feeClp), /despacho|Core360/i);
  }
}
assert.equal(await resolveCore360DeliveryService({feeClp: 0, env: {}, fetchImpl: () => {throw Error("Retiro no debe consultar Core");}}), null);
await assert.rejects(resolveCore360DeliveryService({feeClp: 3990, env: {}, fetchImpl: () => {throw Error("No debe hacer HTTP con lectura apagada");}}), error => error.statusCode === 503);
console.log("Core despacho QA OK: servicios UUID explícitos, precio/UOM/IVA/versiones canónicos, una línea adicional por pedido, total exacto y rechazo ante alteraciones. Sin tráfico externo.");
