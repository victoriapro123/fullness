import assert from "node:assert/strict";
import recoverHandler, {runtimeConfiguration} from "../api/internal/core360/recover.js";

const saved = {
  CORE360_RECOVERY_TOKEN: process.env.CORE360_RECOVERY_TOKEN,
  CRON_SECRET: process.env.CRON_SECRET
};
delete process.env.CORE360_RECOVERY_TOKEN;
delete process.env.CRON_SECRET;

try {
  const cronResponse = responseCapture();
  await recoverHandler({headers: {authorization: "Bearer ignored"}, method: "GET"}, cronResponse.response);
  assert.equal(cronResponse.statusCode, 503);
  assert.deepEqual(cronResponse.body, {error: "recovery_not_configured"});

  const manualResponse = responseCapture();
  await recoverHandler({body: {}, headers: {authorization: "Bearer ignored"}, method: "POST"}, manualResponse.response);
  assert.equal(manualResponse.statusCode, 503);
  assert.deepEqual(manualResponse.body, {error: "recovery_not_configured"});

  process.env.CRON_SECRET = "qa-cron-only";
  const unauthorized = responseCapture();
  await recoverHandler({headers: {}, method: "GET"}, unauthorized.response);
  assert.equal(unauthorized.statusCode, 401);
  assert.deepEqual(unauthorized.body, {error: "unauthorized"});

  const privateToken = "qa-access-token-never-returned";
  const privateWebhook = "qa-webhook-secret-never-returned";
  const config = runtimeConfiguration({
    CHECKOUT_SITE_URL: "https://www.fullnesslab.com/tienda",
    CORE360_COMMERCE_CUSTOMER_MODE: "identified",
    CORE360_COMMERCE_DELIVERY_ENABLED: "true",
    CORE360_COMMERCE_MEDIA_WRITE_ENABLED: "false",
    CORE360_COMMERCE_SYNC_FROM: "2026-10-20T12:00:00Z",
    MERCADOPAGO_ACCESS_TOKEN: privateToken,
    MERCADOPAGO_WEBHOOK_SECRET: privateWebhook,
    VERCEL_GIT_COMMIT_SHA: "a".repeat(40)
  });
  assert.equal(config.commitSha, "a".repeat(40));
  assert.equal(config.syncFrom, "2026-10-20T12:00:00.000Z");
  assert.equal(config.customerMode, "identified");
  assert.equal(config.fiscalIntent, "pending");
  assert.equal(config.flags.CORE360_COMMERCE_DELIVERY_ENABLED, true);
  assert.equal(config.flags.CORE360_COMMERCE_MEDIA_WRITE_ENABLED, false);
  assert.deepEqual(config.mercadoPago, {
    accessTokenConfigured: true,
    accessTokenKind: "unknown",
    notificationUrl: "https://www.fullnesslab.com/api/mercadopago/webhook",
    testMode: false,
    webhookSecretConfigured: true
  });
  assert.ok(!JSON.stringify(config).includes(privateToken));
  assert.ok(!JSON.stringify(config).includes(privateWebhook));
  const empty = runtimeConfiguration({CORE360_COMMERCE_SYNC_FROM: "invalid", CHECKOUT_SITE_URL: "https://user:password@example.invalid/"});
  assert.equal(empty.syncFrom, null);
  assert.equal(empty.mercadoPago.notificationUrl, null);
} finally {
  restoreEnvironment("CORE360_RECOVERY_TOKEN", saved.CORE360_RECOVERY_TOKEN);
  restoreEnvironment("CRON_SECRET", saved.CRON_SECRET);
}

console.log("Core360 recover endpoint: sin secreto no inicia cron, worker ni proyección.");

function responseCapture() {
  const captured = {body: null, statusCode: null};
  return {
    ...captured,
    get body() { return captured.body; },
    get statusCode() { return captured.statusCode; },
    response: {
      json(payload) {
        captured.body = payload;
        return this;
      },
      setHeader() {},
      status(code) {
        captured.statusCode = code;
        return this;
      }
    }
  };
}

function restoreEnvironment(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
