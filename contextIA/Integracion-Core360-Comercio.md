# Integracion Core360 - Comercio web FullnessLab

Fecha: 2026-10-16
Estado: adaptador de pedidos apagado por defecto. La lectura de catálogo/stock Core360 fue verificada el 2026-10-16 con una credencial revocable exclusiva de lectura; no se ejecutaron mutaciones de datos, pedidos, entregas, DTE, cobros ni correos.

## Alcance y evidencia

- Este documento cubre la tienda web `https://www.fullnesslab.com/tienda`, que cobra con Mercado Pago Checkout Pro.
- No cubre el terminal presencial Transbank ni la emision presencial de boleta. La existencia de ese flujo fue informada por Carlos; no hay integracion Transbank ni Core360 en este repositorio.
- Se revisaron las migraciones, los endpoints y el backend de checkout del checkout actual `2f54e4b` (rama `codex/unify-mobile-menu-typography`).
- La forma administrativa de la base no se verificó en vivo: el `.env.local` disponible en este checkout contiene solo `VERCEL_OIDC_TOKEN`, sin una credencial de servicio Supabase. El catálogo público activo sí se verificó en vivo mediante la tienda publicada y sus permisos públicos; las escrituras, filas inactivas y el esquema remoto administrativo siguen requiriendo revalidación antes de activar una integración.

## Hechos canonicos actuales

### Catalogo y precio

- `menu_items` es la fuente comercial del sitio: `id`, `slug`, `sku`, `name`, `price_clp`, `currency`, `is_active`, `product_type`, `plan_frequency`, `included_items`, fotos y metadatos editoriales.
- El checkout recibe unicamente `slug` y `quantity`; vuelve a consultar solo filas activas de `menu_items`. No acepta precio, nombre ni inventario desde el navegador.
- `price_clp` y `currency` revalidados en ese backend son el precio de cobro. Core360 no debe sobrescribirlos ni inferirlos desde nombre, slug o SKU.
- Los planes son composiciones cerradas. Un plan semanal conserva seis mealpreps en `included_items`; un mensual contiene cuatro semanas en `monthly_plan_weeks` y el checkout guarda la estructura de cuatro semanas en el snapshot. El cliente no combina platos.
- No existe columna ni tabla de stock, bodega, capacidad, reserva, lote o disponibilidad comercial. El `InStock` de SEO no acredita inventario operativo.

### Pedido y pago web

1. `POST /api/mercadopago/preferences` valida fulfillment y carrito, lee el catalogo autoritativo y crea `orders` con `status=pending_payment`, `payment_status=pending` y `delivery_status=pending`.
2. Inserta `order_items`, con cantidad, precio unitario/total y `product_snapshot` inmutable. Para planes, el snapshot conserva identificadores, SKU y composicion cerrada (`presetMenu` semanal o `monthlyWeeks` mensual).
3. Crea la preferencia Mercado Pago con `external_reference = orders.id`, y conserva esa misma referencia en `orders.mercadopago_external_reference`.
4. El retorno `GET /api/mercadopago/payments` y el webhook firmado concilian consultando a Mercado Pago. Antes de marcar el pedido aprobado validan monto total y moneda contra `orders`.
5. Un pago `approved` hace `orders.status=paid`, `payment_status=approved` y llena `paid_at`; un rechazo/cancelacion cancela el pedido; un reembolso/chargeback lo marca `refunded` y cancela la entrega.

`payments` guarda solo pagos Mercado Pago en el contrato actual (`provider` admite `mercado_pago`) y tiene unicidad por `(provider, provider_payment_id)`. `payment_events` registra el evento entrante del webhook y `email_deliveries` hace idempotentes los correos, pero no hay una cola/outbox de integracion externa.

### Operacion posterior

- Backoffice permite la secuencia `paid -> preparing -> ready -> out_for_delivery/delivered` y registra `order_status_events`.
- Una cancelacion operativa es distinta de un reembolso. El reembolso actual es completo, solo Mercado Pago aprobado, lo solicita el backoffice owner y usa `orders.id` como clave de idempotencia hacia Mercado Pago.

## Punto seguro para Core360

El disparador inicial seguro es **`web_order.payment_approved`**, despues de que Fullness haya conciliado el pago con Mercado Pago y persistido `orders.status=paid` / `payment_status=approved`.

No reservar ni descontar inventario definitivo cuando se crea la preferencia (`pending_payment`): hoy ese paso crea un pedido nuevo por intento y no existe idempotencia de intento de checkout ni expiracion de reserva. Si el negocio requiere retener capacidad antes del pago, debe agregarse en una fase posterior un identificador de intento y una reserva Core360 con TTL; no usar una orden pendiente como descuento permanente.

El adaptador debe ser asincrono y tipo outbox, no una llamada dentro del webhook de Mercado Pago:

- Fullness persiste primero la conciliacion local.
- En la misma unidad de persistencia futura se crea un evento `web_order.payment_approved` unico por `orders.id`.
- Un worker reintenta la entrega a Core360. Un timeout o 5xx de Core360 no revierte ni vuelve incierto el pago ya conciliado.
- Core360 recibe `externalOrderId = orders.id` y debe tratarlo como idempotency key por empresa y canal `fullness-web`.
- El consumidor debe responder de forma estable ante reintentos con el mismo identificador y no crear ni reservar dos veces.

## Payload minimo propuesto hacia Core360

Este es un contrato propuesto, no un endpoint existente:

```json
{
  "event": "web_order.payment_approved",
  "eventId": "uuid-del-outbox",
  "occurredAt": "2026-10-16T00:00:00Z",
  "companyId": "identificador-empresa-core360",
  "channel": "fullness-web",
  "externalOrderId": "uuid-de-orders-id",
  "payment": {
    "provider": "mercado_pago",
    "providerPaymentId": "solo-referencia-no-secreta",
    "status": "approved",
    "paidAt": "timestamp",
    "amountClp": 44900,
    "currency": "CLP"
  },
  "fulfillment": {
    "mode": "delivery",
    "customer": {"name": "...", "email": "...", "phone": "..."},
    "address": {"address": "...", "comuna": "...", "instructions": "..."}
  },
  "items": [
    {
      "lineId": "uuid-de-order_items-id",
      "menuItemId": "uuid-o-null",
      "sku": "sku-snapshot-o-null",
      "slug": "slug-snapshot",
      "name": "nombre-snapshot",
      "quantity": 1,
      "unitPriceClp": 44900,
      "totalClp": 44900,
      "composition": {"planStructure": "weekly_mealpreps_v1"}
    }
  ],
  "totalClp": 44900,
  "currency": "CLP"
}
```

El payload se deriva de `orders`, `order_items` y `product_snapshot`, no de una nueva lectura de precio o composicion. Para un plan mensual, `composition` debe llevar las cuatro semanas y sus mealpreps tal como quedaron en el snapshot. Core360 no recibe secretos de Mercado Pago, payloads completos del proveedor ni credenciales de Fullness.

## Respuesta y estados esperados de Core360

La respuesta sincrona solo confirma recepcion idempotente:

```json
{
  "accepted": true,
  "externalOrderId": "uuid-de-orders-id",
  "coreOrderId": "id-core360",
  "inventory": {"status": "reserved_or_deducted"},
  "fiscal": {"status": "pending"}
}
```

La boleta/DTE es asincrona. Core360 debe comunicar posteriormente, mediante webhook autenticado o polling server-to-server, `issued`, `rejected` o `voided`, con tipo de documento, folio y referencias seguras a PDF/XML cuando existan. Fullness debe conservar esos estados como evidencia operativa, sin considerar un `accepted` como boleta emitida.

## Cambios requeridos antes de activar

1. Crear una tabla de integracion, por ejemplo `core360_commerce_events`/`core360_commerce_syncs`, con `order_id`, `event_type`, `idempotency_key`, payload versionado, intento, estado, respuesta saneada, `core_order_id`, timestamps y un indice unico sobre `(order_id, event_type)`.
2. Separar el envio desde la conciliacion de Mercado Pago por medio de worker/outbox. La tabla `payment_events` no es sustituto: representa eventos del proveedor de pagos y su indice no es una unicidad de outbox Core360.
3. Crear `core360_product_mapping` administrado y auditado. Debe vincular cada `menu_items.id`/SKU y, cuando corresponda, cada componente de plan con el articulo/inventario Core360. Nunca hacer matching por nombre o slug libre.
4. Definir con Core360 si el inventario se maneja por plan vendido, por mealprep componente o por ambos. Mensual/semanal/POS deben consumir la misma regla y los mismos mapeos.
5. Definir autenticacion server-to-server, empresa, scopes de minimo privilegio, rotacion de secretos y validacion de firma para callbacks. Las variables propuestas deben quedar solo en servidor, por ejemplo `CORE360_BASE_URL`, `CORE360_CLIENT_ID`, `CORE360_CLIENT_SECRET` y `CORE360_COMPANY_ID`; los nombres y mecanismo definitivos dependen del contrato Core360.
6. Agregar pruebas de repeticion de webhook, timeout Core360, 409 idempotente, rechazo de inventario, DTE pendiente/rechazado y reembolso posterior. No llamar a Core360, descontar stock ni emitir DTE desde pruebas locales.

## Adaptador local preparado y apagado

El 2026-10-16 se dejó una primera implementación local para inspección, sin habilitar ninguna conexión:

- `server/core360-commerce-adapter.mjs` construye el evento inmutable desde la orden ya conciliada, encola el outbox y contiene una entrada de worker explícita para entrega posterior. No hay worker, cron ni llamada automática a Core360.
- `server/mercadopago-checkout.mjs` tiene un único hook posterior a la persistencia del pago aprobado. Si el outbox falla, conserva la conciliación y el correo existentes; si está apagado no ejecuta ni una consulta adicional.
- `CORE360_COMMERCE_SYNC_ENABLED` debe ser literalmente `true` para permitir siquiera la escritura del outbox. `CORE360_COMMERCE_DELIVERY_ENABLED` debe ser además literalmente `true` para permitir HTTP. Ambos están apagados por ausencia.
- `supabase/candidates/core360-commerce-outbox.sql` es un SQL candidato, fuera de `supabase/migrations`; no se aplicó ni puede entrar en un `db push` normal. Define mapeo explícito, outbox y proyección fiscal.
- Los planes se transmiten inicialmente como línea de producto vendible opaca mediante su `menu_items.id` mapeado. No descuenta ni reserva automáticamente los mealpreps componentes hasta que se apruebe esa estrategia.

### Precio, cliente y rechazo de reconciliación

- Antes de crear la orden Core360, el adaptador envía `POST /customers` con un `externalCustomerId` determinista: hash de correo cuando existe o identidad por orden cuando falta. Core360 conserva su mapeo/recibo inmutable.
- `POST /orders` recibe `expectedTotalMinor` desde el total ya aprobado de Fullness, no un nuevo cálculo local. Core360 conserva la autoridad de la lista de precios configurada y debe aceptar sólo una coincidencia exacta.
- Si Core360 devuelve `409 PRICE_RECONCILIATION_REQUIRED`, el evento queda en `price_reconciliation_required`; no se reintenta ni se modifica automáticamente el monto, pago, pedido o catálogo de Fullness.
- El pago se informa sólo como observación: `mercado_pago:<id>`, `status=observed`, `method=other`. Fullness no pide a Core360 conciliar Mercado Pago ni generar correos.
- El bearer de Core360 es privado y de servidor a servidor; no usa cookies ni depende de `Origin`. Al activarlo debe quedar limitado a `catalog.read`, `stock.read`, `orders.read`, `orders.write`, `customers.write`, `fiscal.read` y `fiscal.request`, con vigencia/revocación administradas por Core360. Nunca se guarda en payloads, SQL candidato, cliente React ni documentación de valores.

### Prueba local

`node scripts/test-core360-commerce-adapter.mjs` verifica que, sin flags, el adaptador no consulta Supabase ni llama a Core360, y valida el payload, el identificador idempotente y el mapeo de una línea opaca. El 2026-10-16 aprobó junto con `node --check` de los dos módulos de servidor. Esta evidencia no ejecuta ni valida una API Core360 ni una base de Producción.

### Lectura verificada de catálogo y stock Core360

- La URL canónica del sitio es `https://www.fullnesslab.com`; `https://fullnesslab.com/tienda` redirige allí. El origen HTTPS autorizado de la credencial incluye ambos hosts, pero el catálogo se consultó en el dominio canónico.
- `scripts/export-fullness-core360-catalog.mjs` consultó el catálogo público activo de `/tienda` el 2026-10-16 y generó `runtime/fullness-core360-catalog.local`. Es un archivo privado ignorado por Git: contiene 9 artículos activos con UUID, SKU, nombre, precio CLP, tipo, categoría editorial, imágenes y composición de planes.
- El snapshot contiene 4 platos `family`, 4 planes semanales y 1 plan mensual. `menu_items` no expone impuesto por producto, stock, bodega, reserva ni capacidad. Por lo tanto, el precio es el precio web de cobro expresado en CLP, pero no hay evidencia suficiente para declarar IVA incluido, tasa, exención o inventario físico. Cada fila del export conserva esos dos campos como `known: false`; no se deben inventar en Core360.
- `.core360-commerce.local` es la única ruta local consumida por el backend para esta conexión y está ignorada por `*.local`. Contiene la credencial revocable de Core360 y deja `CORE360_COMMERCE_READ_ENABLED=true`, `CORE360_COMMERCE_SYNC_ENABLED=false` y `CORE360_COMMERCE_DELIVERY_ENABLED=false`. El token no se guarda en documentación, código, exports ni variables `VITE_`/`NEXT_PUBLIC_`.
- Las mismas cinco variables necesarias para lectura quedaron configuradas como variables de servidor de Production en Vercel (`CORE360_COMMERCE_TOKEN` como Secret; URL y flags como Config). Este cambio no desplegó código ni alteró el deployment vigente: una futura publicación autorizada será la que reciba esas variables en ejecución.
- `readCore360Catalog` y `readCore360Stock` sólo se ejecutan cuando el flag de lectura es literalmente `true`; no están conectados al checkout/webhook. Ambos usan `GET /api/commerce/v1/products` y `GET /api/commerce/v1/stock`, con paginación de hasta 100 filas y Bearer de servidor. `scripts/verify-core360-read.mjs` compara únicamente IDs explícitos, nunca nombre/SKU/slug.
- La primera lectura contra `https://core.prof3sional.com/api/commerce/v1` fue útil para validar acceso sin mutaciones. La revalidación posterior dejó el reporte privado `runtime/fullness-core360-read-report.local` con los nueve mapeos UUID explícitos verificados y cero filas de stock. No se creó ningún artículo Core360 desde Fullness.

### Mapeo canónico posterior a la importación

- El 2026-10-16 Carlos confirmó que los nueve precios web publicados incluyen IVA 19%. El servicio canónico de Core360 creó los nueve artículos para la misma empresa/tenant, preservando SKU y nombre de Fullness. El recibo privado está fuera de este repositorio y contiene el par explícito `fullnessMenuItemId -> coreItemId`, junto con precio bruto, neto, moneda CLP, IVA `1900` bps y su versión de registro.
- `scripts/import-core360-product-mappings.mjs` transforma ese recibo solamente en `runtime/fullness-core360-mappings.local`, también ignorado por Git. Rechaza recibos sin mapeos, IDs de Fullness duplicados, monedas distintas de CLP o IVA distinto de 19%; no imprime IDs ni secretos. `scripts/verify-core360-read.mjs` continúa verificando exclusivamente esos IDs explícitos contra `GET /products`.
- No existe stock, reserva, pedido, pago, DTE, worker ni publicación nuevos. La credencial conserva únicamente `catalog.read` y `stock.read`; `CORE360_COMMERCE_SYNC_ENABLED` y `CORE360_COMMERCE_DELIVERY_ENABLED` siguen en `false`.
- El recibo reporta que el precio neto entero puede diferir al agrupar cantidades de algunas líneas. El contrato permanece `PRICE_RECONCILIATION_REQUIRED` y fail-closed: no se compensa, redondea, cambia el catálogo ni se cobra automáticamente para resolver esa diferencia.

## Decisiones de frontera

## Contrato Core360 V2 alineado localmente (2026-10-19)

- `server/core360-commerce-adapter.mjs` conserva el outbox `web_order.payment_approved` versión 2, el `eventId` determinista y la clave idempotente; sigue apagado por defecto. La conciliación Mercado Pago persiste antes que el intento de outbox y sus correos; un fallo del outbox nunca revierte un pago ya aprobado. El hook ya existe después de la conciliación; `recoverCore360CommerceDelivery` y `scripts/recover-core360-commerce-outbox.mjs` son la recuperación manual/paginada de órdenes aprobadas sin evento y de leases `sending` vencidos. La clave de orden externa se conserva para que un reintento tras POST incierto siga siendo idempotente.
- El contrato HTTP exacto usa `GET /products` (con `issuedOn`, `quantityMilli` y `quantities` JSON además de filtros existentes), `GET /stock` con `issuedOn`, y `GET /orders/{externalOrderId}`. La consulta de estado conserva su flag de polling y no se transforma en un changefeed ni persiste nada sola.
- `POST /orders/preview` y `POST /orders` reciben el cuerpo plano acordado: `externalOrderId`, partner opcional, fecha, lista de precio opcional, líneas con `itemId`, `quantityMilli`, UOM Core, SKU, versión comercial, precios brutos e impuesto, pago solamente observado, intención fiscal `pending`, total esperado y moneda. No se llama a `/customers`, no se anida un objeto alternativo y no se envía DTE.
- La UOM se recibe del mapeo canónico Core360 y se preserva literalmente (por ejemplo `un`); Fullness ya no inventa `unit`. Cada mapeo exige UUID, UOM, versión comercial opaca, precio bruto e impuesto. Las versiones comercial/disponibilidad y `sourceVersion` no se convierten a número: son tokens opacos. Una versión o precio distinta queda en `price_reconciliation_required`; no existe matching por nombre, slug o SKU.
- Los nueve productos actuales preservan mapeos UUID a UUID. Planes mensual y semanal permanecen como productos opacos: no se reserva ni descuenta automáticamente un mealprep componente.
- Fullness no tiene hoy descuentos ni cobros de despacho activos: el checkout inserta ambos en cero. Si una orden futura trae un valor distinto de cero, el adaptador se bloquea con `ORDER_ADJUSTMENT_RECONCILIATION_REQUIRED`; no inventa UUID de servicio, regla de descuento ni redondeo. Antes de activarlo se debe modelar un servicio no inventariable Core360 para despacho y una lista/regla Core publicada para descuentos que conserve el total.
- Se prepararon el constructor de eventos explícitos `payment_observed`, `refund_observed` y `cancellation_requested` hacia `POST /orders/{externalOrderId}/events`, pero ningún webhook, refund ni flujo operativo lo invoca aún. `cancellation_requested` exige CAS de `expectedVersion`, `expectedDocumentVersion` y el token opaco `expectedSourceVersion`, con `issuedOn` y `confirmed=true`, y omite moneda/monto. Pago y reembolso siguen siendo hechos observados, no liquidaciones en Core360.
- Cliente: `anonymous` omite `partnerId`. `identified` crea/vincula por `POST /customers` de la misma API usando `client_id` UUID de Fullness o el UUID de la orden invitada; conserva el vínculo Core UUID + huella de identidad. No se fusiona por email y un cambio de nombre/correo/teléfono exige conciliación. Un `CORE360_PARTNER_ID` manual se rechaza antes de hacer HTTP. Las direcciones continúan sólo en el snapshot Fullness, nunca se infieren desde un nombre.
- La metadata privada de imagen usa `GET /products/{coreItemId}/image`; los bytes `image|thumbnail` están separados detrás de `CORE360_COMMERCE_MEDIA_PROXY_ENABLED=true`. `uploadCore360ProductImage` y `removeCore360ProductImage` son sólo backend y requieren además `CORE360_COMMERCE_MEDIA_WRITE_ENABLED=true`, `SYNC` y `DELIVERY`: carga raw de hasta 4 MB con `x-core360-expected-version`, `x-core360-request-id` UUID, `x-core360-filename`, content type/length; borrado con JSON CAS. No hay URL pública, token React ni borrado del original editorial Fullness.
- `supabase/candidates/core360-commerce-outbox.sql` continúa fuera de `supabase/migrations`, sin SQL remoto. Contiene mapeos de producto/cliente, outbox con lease CAS, proyección de catálogo y stock UUID. La proyección preserva datos editoriales; un servicio no inventariable o un stock ausente queda `available_milli = NULL`, nunca cero inferido. `scripts/project-core360-commerce-read.mjs` es manual/privado y exige flags de polling + credenciales de servicio.
- Todos los flags (`READ`, `POLL`, `PREVIEW`, `MEDIA_PROXY`, `MEDIA_WRITE`, `SYNC`, `DELIVERY`) son independientes y parten en `false`. El manifiesto Vercel programa una recuperación diaria privada por `GET /api/internal/core360/recover`, protegida por `CRON_SECRET`; no habilita flags ni entrega órdenes si siguen apagados. `POST` conserva `CORE360_RECOVERY_TOKEN`. La activación requiere la migración remota, permisos, flags y prueba bilateral aceptadas conjuntamente.
- `scripts/test-core360-commerce-loopback.mjs` es la aceptación aislada del contrato. Levanta un servidor HTTP efímero sólo en `127.0.0.1` con token ficticio, verifica catálogo, stock, metadata/bytes de imagen privada, preview, outbox, estado y cancelación CAS; luego lo cierra. La única excepción HTTP del adaptador exige a la vez host loopback y `CORE360_COMMERCE_TEST_MODE=true`; ninguna URL pública puede usarla.
- El 2026-10-19 se generó el candidato privado `runtime/fullness-core360-price-conversion-candidate.local` para los 9 UUID ya mapeados. SHA-256: `8c4eff9f088f78b767e3922f340b63032ad03abba1210668807c715e450fbb6f`. Es sólo dry-run: conserva condición de stock cero/no ajustado y no emite movimientos. Las 9 filas mostraron SKU y versión coincidentes, pero UOM del Core actual distinta del mapeo; no puede aplicarse hasta esa conciliación explícita.
- Aceptación bilateral aislada aprobada el 2026-10-19 contra `http://localhost:3083`, con fixture y token ficticios privados de Core360. El recibo privado es `runtime/fullness-core360-qa-receipt.local`, SHA-256 `9514bc400fc84bff32148e85604745f6bc683db14b0e0373d697c002d11a9444`; runner `b24fd92b6b25dd2ffed27bcd2d6507275beeaab61c1251fefaa6b2dc14804f3c`; adaptador `2fa4b26179fa5f70a7c80463ebd84b863a7fd5d67c330522725a7477502d7fff`. Cubre cantidades milli string, stock, metadata/upload/lectura/remove de imagen, cliente Core propio, preview, create/replay, estado/sourceVersion, refund, cancelación CAS, rechazo de pago repetido en otra orden y rechazo de UUID de cliente ajeno. No hubo tráfico Mercado Pago, SQL remoto, flags persistidos, publicación ni datos reales.

- Fuente de precio web: `menu_items` de Fullness. Core360 recibe una evidencia inmutable del monto ya conciliado; no recalcula ni reemplaza el precio cobrado.
- Fuente de inventario una vez activado: Core360/POS para los SKU o componentes mapeados. Fullness no tiene hoy un modelo local que pueda competir con esa fuente.
- Fuente de pago online: Mercado Pago. Transbank/POS permanece fuera de este checkout y debe entrar a Core360 como canal independiente, con hechos de inventario compartidos y distinto `externalOrderId`/canal.
- Fuente de DTE: Core360. Fullness solo refleja el resultado asincrono verificable; una falla fiscal no invalida retrospectivamente la conciliacion de pago.

## Referencias del repositorio

- `supabase/migrations/20260606223000_fullness_commerce_schema.sql`
- `supabase/migrations/20260720001000_guest_checkout_orders.sql`
- `supabase/migrations/20260802001000_backoffice_order_operations.sql`
- `supabase/migrations/20260810001000_monthly_plan_weeks.sql`
- `server/mercadopago-checkout.mjs`
- `api/mercadopago/preferences.js`, `api/mercadopago/payments.js`, `api/mercadopago/webhook.js`
- `api/backoffice/orders.js`

## Correccion acotada del CHECK de stock y QA SQL local (2026-10-19)

Se corrigio unicamente el CHECK de `public.core360_stock_projection` del SQL candidato. El predicado anterior obligaba `available_milli IS NULL` incluso para inventario conocido: la actualizacion sintetica a `1200` fallo con SQLSTATE `23514`, constraint `core360_stock_projection_check`. El CHECK vigente acepta inventario conocido no negativo (incluido cero) y conserva NULL cuando `stock_known=false`; un servicio no inventariable no puede declarar stock conocido ni convertir NULL en cero.

Hash SHA256 anterior del candidato: `b79ef19ee418818cf77cc603d51e16205aff61a7db60c3b34f5cd2a5ffcdb012`. Hash SHA256 real corregido: `0e90a6dac55c4005ae2ebc082ae9ffc6ee45ff35e0f3eb246737c70b40802d82`. Se verifico que el cambio de bytes del candidato corresponde solo a ese CHECK; no se editaron otros modulos de Fullness.

Validacion nueva con Node `24.19.0` y PGlite: **13/13 PASS**, contra el candidato real corregido, sin overlay, cuyo hash permanecio identico antes/despues. Incluye DDL, versiones hash textuales, INSERT y unicidades de outbox, claim/reclaim de lease y finish mediante CAS SQL explicito, UUID/FK y upserts de precio/stock separados de los datos editoriales. La matriz acepta cuatro estados validos (servicio NULL, inventario desconocido NULL, conocido cero y positivo) y rechaza siete inconsistentes. Los registros editoriales originales del fixture quedaron identicos.

Recibo reproducible, dentro de la raiz Core360 `C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/fullness-integration-20261018/fullness-sql-qa/`: `runs/2026-10-19T01-25-51-627Z-33aa0d51-b5fa-4d1f-a19a-89a8024e8cd8/result.json`; operador `run.mjs`. Se conservan por separado el ensayo historico original 10 PASS/1 FAIL (`runs/2026-10-19T01-21-26-792Z-7e5de8e5-712d-46ab-ad3e-7d6bfc44d5b2/result.json`) y la propuesta previa 13/13 (`runs/2026-10-19T01-22-31-116Z-b6d91a4f-a534-4ead-a48d-e74b4f7137eb/result.json`); no se suman cohortes.

La base es nueva y sintetica: ejecuto tres migraciones base reales, con fixtures explicitos de auth/storage/roles y omitiendo solo la declaracion pgcrypto de la base porque gen_random_uuid ya existe en PGlite. El candidato no define RPC propias de claim/finish; la evidencia CAS corresponde a sentencias SQL del ensayo. La aceptacion HTTP bilateral de 3083 uso la API Core360 local real y persistencia Fullness simulada con un mock de Supabase: es evidencia distinta de esta validacion SQL. Ninguna de ambas acredita E2E de Supabase Fullness o Mercado Pago reales.

El candidato sigue fuera de `supabase/migrations`. Esta correccion y su prueba son locales: sin SQL remoto, cambios de flags/credenciales, publicacion ni gestiones Git. Los datos y procesos QA de 3082/3083 no se tocaron.

## Cierre técnico de worker y proyección (2026-10-19)

- El outbox persiste el `core_request` y su hash bajo lease antes de `POST /orders`; los reintentos usan esos mismos bytes aun si el mapeo vive cambia. Cada llamada HTTP Core360 queda acotada por `CORE360_COMMERCE_REQUEST_TIMEOUT_MS` (8 s por defecto), con backoff y máximo de intentos configurables. La entrega inmediata posterior al correo es opcional y no modifica Mercado Pago, correos ni DTE cuando falla.
- La proyección de estado conserva `sourceVersion` opaco. Para la misma versión comercial acepta un token fuente distinto si su sondeo comenzó después; una respuesta más antigua que termina tarde no puede pisarlo. Los cursores persistentes `order_status` y `approved_orders` recorren páginas circulares, por lo que ni estado ni reconciliación quedan detenidos en los primeros 50 registros. La relación de estado se consulta en backoffice sólo cuando `POLL=true`, manteniendo compatible la producción previa a la migración candidata.
- La QA nativa más reciente contra PostgreSQL 17 + PostgREST 16.4 aislados aprobó **12/12**: UUID/opacidad, outbox, request congelado, cambio de `sourceVersion` con versión igual, respuesta tardía, lease, recuperación, recorrido mayor a 50, catálogo/stock e imagen privada. El candidato SHA-256 es `edd39ec7be4f7679ac4d3e2842043492c721a8a1b6e02a3368f31eff72258fb5`; sigue sin migración ni SQL remoto.
- La QA HTTP contra Core360 local llegó al control de pago duplicado y el servidor aceptó una segunda orden con la misma referencia de Mercado Pago en vez de devolver `409`. No se relaja esa aserción ni se activan flags: es un bloqueo de aceptación bilateral en Core360, separado del publish seguro de Fullness con todo apagado. El dashboard Supabase solicitado no tenía sesión autenticada y `.env.local` no contiene URL/Service Role; por tanto no se obtuvo respaldo ni se aplicó migración remota desde este equipo.
