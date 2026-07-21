# QA Mercado Pago Checkout Pro

Fecha: 2026-07-20

## Cobertura

- Tienda desktop y mobile `390x844`.
- Carrito persistente y cantidades.
- Datos de QA prerrellenados.
- Despacho con direccion/comuna.
- Retiro en local sin campos de direccion.
- Preferencia sandbox por `$44.900` validada desde backend y Vercel Preview.
- Formulario de tarjeta oficial de prueba y resumen previo al pago.
- Retorno fallido sin borrar el carrito.
- Build de produccion y ultima Preview de Vercel verificados.

## Capturas

- `01-tienda-hero.png`: portada desktop.
- `02-checkout-prerrellenado.png`: carrito desktop.
- `03-mercadopago-metodo.png`: seleccion de metodo en sandbox.
- `04-tarjeta-prueba.png`: formulario sandbox con datos publicos de prueba.
- `05-resumen-antes-de-pagar.png`: revision previa al pago.
- `06-mobile-tienda.png`: portada mobile.
- `07-mobile-checkout.png`: carrito mobile.
- `08-mobile-pago-cta.png`: final del formulario y CTA mobile.
- `09-retorno-fallido.png`: estado fallido y carrito conservado.
- `11-preview-tienda.png`: tienda servida desde la ultima Preview.
- `12-preview-checkout.png`: checkout prerrellenado servido desde la ultima Preview.

## Pendiente De Cierre

- Ingresar en Mercado Pago con la cuenta de prueba `Comprador` de la aplicacion y repetir el pago aprobado.
- Guardar captura del retorno aprobado y comprobar filas en `payments` y `orders`.
- Configurar `MERCADOPAGO_WEBHOOK_SECRET` y probar una notificacion firmada.

Mercado Pago exige que la cuenta `Comprador` sea distinta del vendedor de prueba. El access token del vendedor no puede crear otro usuario de prueba: esa operacion requiere iniciar sesion con la cuenta productiva en el panel.
