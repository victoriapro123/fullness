import assert from "node:assert/strict";
import {checkoutPaymentMessage,checkoutStartError} from "../src/lib/checkout-result.js";
assert.match(checkoutStartError({code:'TENANT_READ_ONLY'}),/carrito se conserva/);
assert.doesNotMatch(checkoutStartError({code:'TENANT_READ_ONLY'}),/403|Core360/);
assert.equal(checkoutStartError({message:'El total cambió.'}),'El total cambió.');
for (const payment of [
  {status: "approved"},
  {status: "approved", customerConfirmationSent: false},
  {status: "approved", customerConfirmationSent: "true"},
  {status: "approved", customerConfirmationSent: false, operationsNotificationSent: true}
]) {
  assert.match(checkoutPaymentMessage(payment), /pendiente de envío/);
  assert.doesNotMatch(checkoutPaymentMessage(payment), /enviamos la confirmación/);
}
assert.match(checkoutPaymentMessage({status: "approved", customerConfirmationSent: true}), /enviamos la confirmación/);
assert.doesNotMatch(checkoutPaymentMessage({status: "pending", customerConfirmationSent: true}), /Recibimos tu pago|enviamos/);
console.log("Checkout confirmation: approved payment and confirmed customer-email delivery are separate facts.");
