# QA Mercado Pago Checkout Pro

Fecha: 2026-07-21

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
- `13-cuenta-sandbox-lista.png`: panel de Mercado Pago con la cuenta de prueba disponible.

## Intento De Aprobacion 2026-07-21

- Se actualizo `MERCADOPAGO_ACCESS_TOKEN` exclusivamente en Vercel Preview con la credencial sandbox de la aplicacion activa. Production no fue modificada.
- La nueva Preview responde en `https://fullness-l9tm80y87-prof3sionalcl-2961s-projects.vercel.app/tienda` y creo una preferencia de `$44.900` para la orden de prueba.
- Al cambiar desde la sesion personal a la cuenta sandbox, el navegador interno recibio `ERR_TOO_MANY_REDIRECTS` desde `sandbox.mercadopago.cl`. No se llego a la pantalla final de pago y no hubo cargo real.
- El intento alternativo contra el Sandbox oficial por API tampoco emitio pago: Mercado Pago devolvio `G001` durante el tokenizado de la tarjeta de prueba. La creacion de preferencias sigue respondiendo correctamente.
- Por integridad de QA, no se marco la orden como aprobada, no se generaron filas en `payments` y no se envio el correo de confirmacion solicitado. Quedan pendientes hasta disponer de un pago sandbox aprobado.

## Pendiente De Cierre

- Ingresar en Mercado Pago con la cuenta de prueba `Comprador` de la aplicacion y repetir el pago aprobado.
- Guardar captura del retorno aprobado y comprobar filas en `payments` y `orders`.
- Configurar `MERCADOPAGO_WEBHOOK_SECRET` y probar una notificacion firmada.

Para cerrar este punto, abrir un caso con Mercado Pago indicando el bucle de redireccion en `sandbox.mercadopago.cl` y el error de tokenizacion `G001` de la aplicacion `Prof3sional Mercado Pago`. Luego se repite el pago con la cuenta Comprador, se verifica la orden/pago en Supabase y se envia el correo de prueba.

Mercado Pago exige que la cuenta `Comprador` sea distinta del vendedor de prueba. El access token del vendedor no puede crear otro usuario de prueba: esa operacion requiere iniciar sesion con la cuenta productiva en el panel.
