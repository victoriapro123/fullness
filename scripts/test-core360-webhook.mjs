import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {processCore360Webhook, verifyCore360WebhookSignature} from "../server/core360-webhook.mjs";

const now = new Date("2026-10-20T18:00:00.000Z");
const orderId = "11111111-1111-4111-8111-111111111111";
const coreOrderId = "22222222-2222-4222-8222-222222222222";
const eventId = "33333333-3333-4333-8333-333333333333";
const secret = "test-only-core360-webhook-secret-at-least-32-chars";
const env = {
  CORE360_BASE_URL: "https://core360.example.test",
  CORE360_COMMERCE_CLIENT_ID: "44444444-4444-4444-8444-444444444444",
  CORE360_COMMERCE_COMPANY_ID: "55555555-5555-4555-8555-555555555555",
  CORE360_COMMERCE_TENANT_ID: "66666666-6666-4666-8666-666666666666",
  CORE360_COMMERCE_TOKEN: "test-only-bearer",
  CORE360_WEBHOOK_SECRET: secret
};
const payload = {
  clientId: env.CORE360_COMMERCE_CLIENT_ID,
  companyId: env.CORE360_COMMERCE_COMPANY_ID,
  coreOrderId,
  eventId,
  externalOrderId: orderId,
  occurredAt: now.toISOString(),
  tenantId: env.CORE360_COMMERCE_TENANT_ID,
  type: "order.updated",
  version: "7"
};
const rawBody = JSON.stringify(payload);
const timestamp = String(Math.floor(now.getTime() / 1000));
const headers = {
  "x-core360-event-id": eventId,
  "x-core360-signature": `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`,
  "x-core360-timestamp": timestamp
};

assert.equal(verifyCore360WebhookSignature({env, headers, now, rawBody}).eventId, eventId);
assert.throws(
  () => verifyCore360WebhookSignature({env, headers: {...headers, "x-core360-signature": "sha256:invalid"}, now, rawBody}),
  {code: "INVALID_CORE360_WEBHOOK_SIGNATURE"}
);

const receipts = new Map();
const projections = [];
const supabase = {
  from(table) {
    if (table === "orders") {
      return {
        select() {
          return {
            eq() {
              return {maybeSingle: async () => ({data: {id: orderId}, error: null})};
            }
          };
        }
      };
    }
    if (table !== "payment_events") throw new Error(`Unexpected table ${table}`);
    return paymentEventsTable(receipts);
  },
  async rpc(name, args) {
    assert.equal(name, "project_core360_commerce_order_state");
    projections.push(args);
    return {data: true, error: null};
  }
};

function paymentEventsTable(events) {
  return {
    select() {
      const query = {provider: "", eventId: ""};
      return {
        eq(field, value) {
          if (field === "provider") query.provider = value;
          if (field === "provider_event_id") query.eventId = value;
          return this;
        },
        async maybeSingle() {
          const existing = events.get(query.eventId);
          return {data: existing ? {id: existing.id, processed_at: existing.processed_at} : null, error: null};
        }
      };
    },
    insert(row) {
      return {
        select() {
          return {
            async single() {
              const id = `receipt-${events.size + 1}`;
              events.set(row.provider_event_id, {...row, id, processed_at: null});
              return {data: {id}, error: null};
            }
          };
        }
      };
    },
    update(changes) {
      return {
        async eq(field, value) {
          assert.equal(field, "id");
          const existing = [...events.values()].find((row) => row.id === value);
          Object.assign(existing, changes);
          return {data: null, error: null};
        }
      };
    }
  };
}

const calls = [];
const fetchImpl = async (url, request) => {
  calls.push({request, url});
  assert.equal(request.method, "GET");
  assert.equal(request.headers.Authorization, "Bearer test-only-bearer");
  return {
    ok: true,
    status: 200,
    json: async () => ({
      commercial: {status: "open"},
      coreOrderId,
      externalOrderId: orderId,
      fiscal: {status: "pending"},
      fulfillment: {status: "pending_preparation"},
      sourceVersion: "source-v7",
      version: 4
    })
  };
};

const first = await processCore360Webhook({env, fetchImpl, headers, now, rawBody, supabase});
assert.deepEqual(first, {eventId, received: true, replayed: false});
assert.equal(calls.length, 1);
assert.equal(projections.length, 1);
assert.equal(receipts.get(eventId).processed_at, now.toISOString());

const replay = await processCore360Webhook({env, fetchImpl, headers, now, rawBody, supabase});
assert.deepEqual(replay, {eventId, received: true, replayed: true});
assert.equal(calls.length, 1, "A completed event must not re-read Core360 on sequential replay.");

console.log("Core360 webhook: signed canonical projection and replay verified.");
