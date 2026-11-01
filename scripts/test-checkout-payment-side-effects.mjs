import assert from "node:assert/strict";
import {syncMercadoPagoPayment} from "../server/mercadopago-checkout.mjs";

const orderId = "55555555-5555-4555-8555-555555555555";
const originalFetch = globalThis.fetch;
const originalError = console.error;
let externalCalls = 0;
globalThis.fetch = async () => { externalCalls += 1; throw new Error("No real provider is permitted in this unit test."); };
console.error = () => {};
try {
  for (const coreFails of [false, true]) {
    const state = {payments: [], updates: [], events: []};
    const result = await syncMercadoPagoPayment("123456789", orderId, {
      supabase: database(state),
      mercadoPagoRequest: async (path) => {
        assert.equal(path, "/v1/payments/123456789");
        return {id: 123456789, status: "approved", transaction_amount: 18800, currency_id: "CLP", external_reference: orderId, live_mode: true};
      },
      enqueueCore360PaymentApproved: async () => {
        assert.equal(state.payments.length, 1);
        assert.equal(state.updates[0].payment_status, "approved");
        assert.equal(state.selectedOrder.subtotal_clp, 18800, "Canonical subtotal must be selected before constructing the outbox.");
        assert.equal(state.selectedOrder.discount_clp, 0);
        assert.equal(state.selectedOrder.delivery_fee_clp, 0);
        assert.equal(state.selectedOrder.client_id, null);
        state.events.push("outbox");
        return {eventId: "66666666-6666-4666-8666-666666666666", status: "pending"};
      },
      sendApprovedOrderEmails: async () => { state.events.push("mail-failed"); throw new Error("QA mail unavailable"); },
      deliverCore360OutboxEvent: async ({event}) => {
        assert.ok(event.id);
        state.events.push("core-attempt");
        if (coreFails) throw new Error("QA Core unavailable");
      }
    });
    assert.equal(result.status, "approved");
    assert.equal(result.orderId, orderId);
    assert.equal(result.customerConfirmationSent, false);
    assert.equal(result.operationsNotificationSent, false);
    assert.deepEqual(state.events, ["outbox", "mail-failed", "core-attempt"]);
  }
  const mismatch = {payments: [], updates: [], events: []};
  await assert.rejects(syncMercadoPagoPayment("123456789", orderId, {
    supabase: database(mismatch),
    mercadoPagoRequest: async () => ({id: 123456789, status: "approved", transaction_amount: 1, currency_id: "CLP", external_reference: orderId,live_mode:true})
  }), error => error.statusCode === 409);
  assert.equal(mismatch.payments.length, 0);
  assert.equal(mismatch.updates.length, 0);
  const wrongMode = {payments: [], updates: [], events: []};
  await assert.rejects(syncMercadoPagoPayment("123456789", orderId, {
    supabase: database(wrongMode),
    mercadoPagoRequest: async () => ({id: 123456789,status:"approved",transaction_amount:18800,currency_id:"CLP",external_reference:orderId,live_mode:false})
  }), error => error.statusCode === 409 && /modo de pago/.test(error.message));
  assert.equal(wrongMode.payments.length,0);
  assert.equal(wrongMode.updates.length,0);
  assert.equal(externalCalls, 0);
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalError;
}
console.log("Payment side effects: mail/Core failures preserve the reconciled payment and independent delivery attempt; amount mismatch remains closed. Mocked providers only.");

function database(state) {
  return {
    from(table) {
      if (table === "orders") return {
        select: (columns) => ({eq: () => ({maybeSingle: async () => {
          const row = {id: orderId, client_id: null, status: "pending_payment", payment_status: "pending", subtotal_clp: 18800, discount_clp: 0, delivery_fee_clp: 0, total_clp: 18800, currency: "CLP", customer_snapshot: {name: "QA", email: "qa@example.invalid"}, note: null, paid_at: null};
          state.selectedOrder = Object.fromEntries(columns.split(",").map(key => [key, row[key]]));
          return {data: state.selectedOrder, error: null};
        }})}),
        update: (row) => ({eq: async () => { state.updates.push(row); return {error: null}; }})
      };
      if (table === "payments") {
        const selected = {eq() { return selected; }, maybeSingle: async () => ({data: null, error: null})};
        return {select: () => selected, insert: async row => { state.payments.push(row); return {error: null}; }};
      }
      if (table === "order_items") return {select: () => ({eq: async () => ({data: [{product_name: "Producto QA", quantity: 1, unit_price_clp: 18800, total_clp: 18800}], error: null})})};
      throw new Error(`Unexpected unit-test table: ${table}`);
    }
  };
}
