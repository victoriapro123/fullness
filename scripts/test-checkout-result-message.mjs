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
for(const fulfillmentMode of ['pickup','delivery']){
  const base={status:'approved',purchaseModel:'mix_v1',fulfillmentMode};
  const message=checkoutPaymentMessage({...base,customerConfirmationSent:true});
  assert.match(message,/Gracias por tu compra\./);
  assert.match(message,/Enviamos la confirmación/);
  assert.match(checkoutPaymentMessage({...base,customerConfirmationSent:false}),/pendiente de envío/);
  assert.doesNotMatch(checkoutPaymentMessage({...base,customerConfirmationSent:'true'}),/Enviamos la confirmación/);
  if(fulfillmentMode==='pickup'){
    assert.match(message,/Te contactaremos para coordinar el retiro de tu pedido\./);
    assert.doesNotMatch(message,/valor del despacho/);
  }else{
    assert.match(message,/Te informaremos el valor del despacho para tu aprobación antes de coordinar el envío\./);
    assert.doesNotMatch(message,/despacho gratis|despacho incluido|enviamos tu pedido|ya despachamos/i);
  }
  assert.doesNotMatch(checkoutPaymentMessage({...base,status:'pending'}),/Gracias por tu compra|coordinar/);
  assert.match(checkoutPaymentMessage({...base,testMode:true}),/Pago TEST confirmado/);
}
for(const payment of [{purchaseModel:'mix_v1'},{fulfillmentMode:'delivery'},{purchaseModel:'mix_v1',fulfillmentMode:'unknown'}]){
  const message=checkoutPaymentMessage({status:'approved',customerConfirmationSent:false,...payment});
  assert.match(message,/Recibimos tu pago/);assert.doesNotMatch(message,/valor del despacho|coordinar el retiro/);
}
console.log("Checkout confirmation: approved payment and confirmed customer-email delivery are separate facts.");
