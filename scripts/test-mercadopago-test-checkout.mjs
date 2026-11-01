import assert from "node:assert/strict";
import {authorizeTestCheckoutSession, consumeTestCheckoutSession} from "../server/mercadopago-test-checkout.mjs";
import {createCheckoutPreference, syncMercadoPagoPayment, validateWebhookSignature} from "../server/mercadopago-checkout.mjs";
import {createHmac} from "node:crypto";

const env = {
  FULLNESS_TEST_CHECKOUT_ACCESS_CODE: "test-checkout-code-only-for-local-qa",
  MERCADOPAGO_TEST_ACCESS_TOKEN: "test-access-token-not-a-real-secret",
  MERCADOPAGO_TEST_PUBLIC_KEY: "test-public-key-not-a-real-secret",
  MERCADOPAGO_TEST_USER_ID: "test-merchant-123",
  MERCADOPAGO_TEST_WEBHOOK_SECRET: "test-webhook-secret"
};
const orderId = "55555555-5555-4555-8555-555555555555";
const product = {
  id: "33333333-3333-4333-8333-333333333333",
  is_active: true,
  name: "Plan semanal QA",
  plan_frequency: "weekly",
  price_clp: 44900,
  product_type: "plan",
  slug: "plan-semanal-qa",
  sku: "FULLNESS-PLAN-SEM-001"
};

const sessions = createSessionStore();
let profileRequests = 0;
await assert.rejects(
  authorizeTestCheckoutSession({
    accessCode: "incorrecto",
    env,
    fetchImpl: async () => { profileRequests += 1; throw new Error("No debe consultar Mercado Pago"); },
    supabase: sessions
  }),
  (error) => error.statusCode === 403 && error.code === "TEST_ACCESS_DENIED"
);
assert.equal(profileRequests, 0, "Un código erróneo no consulta ni selecciona un perfil Mercado Pago.");

const authorization = await authorizeTestCheckoutSession({
  accessCode: env.FULLNESS_TEST_CHECKOUT_ACCESS_CODE,
  env,
  fetchImpl: async () => new Response(JSON.stringify({id: env.MERCADOPAGO_TEST_USER_ID, site_id: "MLC", tags: ["test_user"]}), {
    status: 200,
    headers: {"Content-Type": "application/json"}
  }),
  supabase: sessions
});
assert.match(authorization.testSessionToken, /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{32,128}$/i);
assert.equal(Object.hasOwn(authorization, "accessToken"), false, "El navegador no recibe la credencial de Mercado Pago.");

const checkoutState = {coreCalls: 0, orderItems: [], preferenceCalls: 0, sessions};
const checkoutResult = await createCheckoutPreference({
  cart: [{quantity: 1, slug: product.slug}],
  fulfillment: {
    address: "Av. Prueba 123",
    comuna: "Santiago",
    email: "buyer-test@example.test",
    mode: "pickup",
    name: "Comprador TEST",
    phone: "+56911111111"
  },
  request: {headers: {host: "fullness.test", "x-forwarded-proto": "https"}},
  testSessionToken: authorization.testSessionToken,
  dependencies: {
      resolveDispatchProducts: async (products) => products, // Calendar is covered separately by test-dispatch-calendar.
    env,
    mercadoPagoRequest: async (path, {body, profile}) => {
      checkoutState.preferenceCalls += 1;
      assert.equal(path, "/checkout/preferences");
      assert.equal(profile.mode, "test");
      assert.equal(body.metadata.checkout_mode, "test");
      assert.equal(body.notification_url, "https://fullness.test/api/mercadopago/test-webhook");
      return {id: "test-preference-1", init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=test"};
    },
    resolveMercadoPagoProfile: async () => ({mode: "test", webhookSecret: env.MERCADOPAGO_TEST_WEBHOOK_SECRET}),
    enqueueCore360UnpaidOrder: async () => { checkoutState.coreCalls += 1; throw new Error("TEST nunca debe llegar a Core360"); },
    supabase: checkoutSupabase(checkoutState)
  }
});
assert.equal(checkoutResult.testMode, true);
assert.equal(checkoutState.preferenceCalls, 1);
assert.equal(checkoutState.coreCalls, 0);
assert.equal(checkoutState.order.checkout_mode, "test");
assert.equal(checkoutState.order.customer_snapshot.checkoutMode, "test");
assert.equal(sessions.row.order_id, orderId);
assert.equal(sessions.row.preference_id, "test-preference-1");

await assert.rejects(
  consumeTestCheckoutSession({env, sessionToken: authorization.testSessionToken, supabase: sessions}),
  (error) => error.statusCode === 403 && error.code === "TEST_SESSION_INVALID"
);

let emailCalls = 0;
let corePaymentCalls = 0;
let tracedPayment = "";
const syncResult = await syncMercadoPagoPayment("123456", orderId, {
  checkoutMode: "test",
  env,
  mercadoPagoRequest: async (_path, {profile}) => {
    assert.equal(profile.mode, "test");
    return {
      currency_id: "CLP",
      date_approved: "2026-10-21T12:00:00.000Z",
      external_reference: orderId,
      collector_id: env.MERCADOPAGO_TEST_USER_ID,
      id: 123456,
      live_mode: false,
      metadata: {order_id: orderId},
      payer: {email: "buyer-test@example.test"},
      status: "approved",
      status_detail: "accredited",
      transaction_amount: 44900
    };
  },
  paymentProfile: {merchantId: env.MERCADOPAGO_TEST_USER_ID, mode: "test"},
  sendApprovedOrderEmails: async () => { emailCalls += 1; throw new Error("TEST no envía correos"); },
  enqueueCore360PaymentApproved: async () => { corePaymentCalls += 1; throw new Error("TEST no llega a Core360"); },
  attachTestSessionPayment: async ({paymentId}) => { tracedPayment = paymentId; },
  supabase: paymentSupabase()
});
assert.equal(syncResult.status, "approved");
assert.equal(syncResult.testMode, true);
assert.equal(tracedPayment, "123456");
assert.equal(emailCalls, 0);
assert.equal(corePaymentCalls, 0);

await assert.rejects(
  syncMercadoPagoPayment("123457", orderId, {
    checkoutMode: "test",
    mercadoPagoRequest: async () => ({collector_id: env.MERCADOPAGO_TEST_USER_ID, currency_id: "CLP", external_reference: orderId, id: 123457, live_mode: true, status: "approved", transaction_amount: 44900}),
    paymentProfile: {merchantId: env.MERCADOPAGO_TEST_USER_ID, mode: "test"},
    supabase: paymentSupabase()
  }),
  (error) => error.statusCode === 409 && /modo de pago/.test(error.message)
);

await assert.rejects(
  syncMercadoPagoPayment("123458", orderId, {
    checkoutMode: "test",
    mercadoPagoRequest: async () => ({collector_id: "untrusted-test-collector", currency_id: "CLP", external_reference: orderId, id: 123458, live_mode: false, status: "approved", transaction_amount: 44900}),
    paymentProfile: {merchantId: env.MERCADOPAGO_TEST_USER_ID, mode: "test"},
    supabase: paymentSupabase()
  }),
  (error) => error.statusCode === 409 && /colector de pruebas/.test(error.message)
);

const signature = webhookSignature({dataId: "123456", requestId: "request-test", secret: env.MERCADOPAGO_TEST_WEBHOOK_SECRET, timestamp: "1710000000"});
validateWebhookSignature({checkoutMode: "test", dataId: "123456", env, requestId: "request-test", signature});
assert.throws(
  () => validateWebhookSignature({checkoutMode: "live", dataId: "123456", env, requestId: "request-test", signature}),
  (error) => error.statusCode === 503
);

console.log("Mercado Pago TEST checkout QA OK: código servidor, sesión de un uso, perfil TEST, webhook separado, live_mode y efectos comerciales aislados.");

function createSessionStore() {
  const store = {row: null};
  return {
    get row() { return store.row; },
    from(table) {
      assert.equal(table, "checkout_test_sessions");
      return {
        insert(record) {
          store.row = {id: "11111111-1111-4111-8111-111111111111", ...record};
          return {select: () => ({single: async () => ({data: store.row, error: null})})};
        },
        update(patch) {
          if (Object.hasOwn(patch, "consumed_at")) {
            const query = {
              eq() { return query; },
              is() { return query; },
              gt() { return query; },
              select() {
                return {maybeSingle: async () => {
                  if (store.row?.consumed_at) return {data: null, error: null};
                  store.row = {...store.row, ...patch};
                  return {data: store.row, error: null};
                }};
              }
            };
            return query;
          }
          return {eq: async () => {
            store.row = {...store.row, ...patch};
            return {error: null};
          }};
        }
      };
    }
  };
}

function checkoutSupabase(state) {
  return {
    from(table) {
      if (table === "checkout_test_sessions") return state.sessions.from(table);
      if (table === "menu_items") return {select: () => ({in: () => ({eq: async () => ({data: [product], error: null})})})};
      if (table === "orders") {
        return {
          insert(row) {
            state.order = row;
            return {select: () => ({single: async () => ({data: {id: orderId, ...row}, error: null})})};
          },
          update: () => ({eq: async () => ({error: null})})
        };
      }
      if (table === "order_items") return {insert: async (rows) => { state.orderItems.push(...rows); return {error: null}; }};
      throw new Error(`Tabla inesperada: ${table}`);
    }
  };
}

function paymentSupabase() {
  const order = {
    checkout_mode: "test",
    currency: "CLP",
    customer_snapshot: {email: "buyer-test@example.test"},
    id: orderId,
    payment_status: "pending",
    status: "pending_payment",
    total_clp: 44900
  };
  return {
    from(table) {
      if (table === "orders") {
        return {
          select: () => ({eq: () => ({maybeSingle: async () => ({data: order, error: null})})}),
          update: () => ({eq: async () => ({error: null})})
        };
      }
      if (table === "payments") {
        return {
          select: () => {
            const query = {eq: () => query, maybeSingle: async () => ({data: null, error: null})};
            return query;
          },
          insert: async () => ({error: null})
        };
      }
      if (table === "checkout_test_sessions") return {update: () => ({eq: async () => ({error: null})})};
      throw new Error(`Tabla inesperada: ${table}`);
    }
  };
}

function webhookSignature({dataId, requestId, secret, timestamp}) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${timestamp},v1=${v1}`;
}
