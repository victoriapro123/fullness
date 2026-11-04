# Compra TEST privada preparada — 04/11/2026

## Alcance y autorización

Carlos pidió preparar todo para una compra de prueba de Mercado Pago sin mezclar credenciales ni exponer controles en el carrito público. Trabajo en checkout Fullness existente, detached HEAD, sin nuevas ramas/chats ni coordinación Core360. Publicación solicitada de forma asíncrona; no inferir autorización por esta nota. No ejecutar el pago final por preparar la herramienta.

## Implementación

- Eliminados estados, código de acceso y control TEST del carrito general src/main.jsx. ApprovedShop público sin cambios editoriales.
- Herramienta PrivatePaymentTest únicamente en backoffice, Administración técnica / Respaldo y conexión, para perfiles is_admin. Carrito propio no persistido, sin acceso al carrito/localStorage de clientes. Cuenta compradora de prueba se ingresa explícitamente; no reutilizar la cuenta del vendedor.
- GET /api/mercadopago/test-session verifica propietario con Auth getUser y profiles.is_admin antes de comprobar el vendedor TEST MLC; no emite sesión ni pedido. POST emite autorización sólo a ese propietario. Un código compartido o una URL oculta ya no dan acceso al endpoint.
- Reparado fallo real del token: su UUID ahora se inserta como id de checkout_test_sessions. Antes se generaba un id distinto por defecto, sin cobertura fiel de filtros en la prueba antigua. Sesión ligada a ownerUserId y checkoutKey; diez minutos, un intento, recuperable sólo con la misma identidad/clave/huella. Cambio de propietario/clave, token vencido o colector distinto falla sin fallback LIVE.
- Credenciales TEST obligatorias, servidor rechaza token idéntico a producción. No se modificaron env, credenciales ni configuración remota. Se comprobó localmente que existen las cuatro variables TEST y mediante GET /users/me que el vendedor es test_user de Chile. Esto no acredita el entorno remoto de Vercel.
- Se reutilizan validación de precios/disponibilidad, SQL y preference del carrito mix actual, con checkout_mode=test y test-webhook. Correos, exportaciones, operación comercial y Rewards semanales excluyen TEST. La traza interna de orden conserva checkout_mode; no supone una venta real.
- Selección se bloquea al iniciar para que el reintento recupere el mismo pago. Se exige testMode=true antes de redirigir; no se guardan tokens ni pedidos en claves del carrito público. Referencia de devolución separada en sessionStorage fullness_private_test_order, sin datos de tarjeta.
- Sin migración ni modificaciones productivas de biblioteca, precios, disponibilidad, órdenes o pagos.

## Evidencia

Build Vite y git diff --check PASS. Tests focales PASS: test-private-payment-access; test-mercadopago-test-checkout (actualizado doble obsoleto); test-mix-commerce con PGlite y proveedor sintético; test-approved-shop; test-checkout-payment-side-effects; verify-order-email-flow. Mix TEST:24pollo+1familiar, descuento23520/total230480, propietario, sesión/id persistido, reintento sin segundo POST, denegación de otro dueño/clave/vencimiento, conciliación live_mode=false y cero correos; inventario inalterado. LIVE/legacy se mantienen en regresión.

QA Playwright CLI con componente real y servicios inyectados sólo en runtime local:1440x1000 y390x844 sin overflow, datos/selección persistentes,24individuales+familiar18900=230580, respuesta incierta recuperada con misma clave/token, respuesta sin TEST bloqueada, redirección final interceptada. Sin escrituras externas. Único error consola de carga inicial favicon404 del harness, sin fallo de componente. Capturas y guía en R:/Entregables-Codex/Fullness-Test-Privado-20261104.

Revisadas guías Supabase auth-getUser/changelog, separación de credenciales Mercado Pago y checklist React. Sin nuevas dependencias. Artefactos runtime/.playwright-cli y WIP fotos/temp excluidos. Cerebro central pendiente según transición; registro local no equivale a importación remota.

## Límites para el paso siguiente

No se creó preferencia TEST real ni pedido productivo/TEST remoto, no se realizó pago ni se probaron tarjetas. Para ejecutar después: publicar con autorización; iniciar sesión como administrador y abrir Administración técnica, verificar conexión en el entorno publicado; usar comprador TEST distinto del vendedor, tarjeta de prueba y navegador aislado de sesión personal; comprobar retorno y webhook TEST sin correo/venta real. No entregar claves ni contraseñas por chat. El cobro final no está autorizado por preparar esta herramienta.
