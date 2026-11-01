export function checkoutStartError(error) {
  if(error?.code==='TENANT_READ_ONLY')return 'No podemos confirmar tu compra en este momento. Tu carrito se conserva y no iniciamos el cobro. Contacta a Fullness Lab para recibir ayuda.';
  return typeof error?.message==='string'?error.message:'No pudimos validar tu compra. Revisa el carrito antes de volver a intentar.';
}
export function checkoutPaymentMessage(payment) {
  if (payment?.testMode) {
    return payment?.status === "approved"
      ? "Pago TEST confirmado. La orden quedó aislada: no se enviará correo, despacho ni información operativa."
      : "El pago TEST continúa pendiente. No genera una orden operativa mientras se confirma.";
  }
  if (payment?.status !== "approved") {
    return "El pago continúa pendiente. Te avisaremos cuando cambie de estado.";
  }
  return payment.customerConfirmationSent === true
    ? "Recibimos tu pago y enviamos la confirmación de compra a tu correo."
    : "Recibimos tu pago y confirmamos tu compra. El correo de confirmación está pendiente de envío.";
}
