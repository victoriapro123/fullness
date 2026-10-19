import assert from "node:assert/strict";
import recoverHandler from "../api/internal/core360/recover.js";

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
