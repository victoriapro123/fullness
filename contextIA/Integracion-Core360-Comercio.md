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

## Contrato V2 preparado localmente (2026-10-19)

- `server/core360-commerce-adapter.mjs` prepara el evento `web_order.payment_approved` versión 2 con `eventId` determinista, `idempotencyKey`, canal `fullness-web`, importes brutos CLP y versión comercial. La entrega sigue apagada por defecto y no hay worker, cron, callback ni llamada de checkout que la habilite.
- Antes de una futura entrega, cada línea exige un mapeo explícito de `menu_items.id` a Core360 que incluya SKU, UOM, versión comercial, precio bruto e impuesto. Un precio o versión distinta queda en `price_reconciliation_required`; un despacho o descuento sin ajuste explícito queda en `needs_mapping`. No hay redondeo, sustitución de monto ni matching por nombre, slug o SKU.
- Los nueve productos actuales preservan mapeos UUID a UUID. Los planes mensual y semanal se mantienen como productos opacos: el contrato no reserva ni descuenta mealpreps componentes automáticamente.
- El enlace desde la conciliación aprobada de Mercado Pago conserva primero el pago local y los correos. Si la escritura opcional del outbox falla, no revierte ni convierte en incierto el pago aprobado. `reconcileMissingCore360ApprovedOrders` permite recuperar manualmente esos casos, vuelve a validar proveedor, referencia, moneda y monto exactos, y depende de la unicidad de la clave idempotente.
- La lectura incrementable de estados de órdenes está separada en `readCore360OrderStates`. Requiere simultáneamente `CORE360_COMMERCE_READ_ENABLED=true` y `CORE360_COMMERCE_POLL_ENABLED=true`; no persiste una proyección ni se ejecuta sola. Catálogo, stock, polling, escritura de outbox y entrega HTTP siguen siendo opt-ins independientes.
- `supabase/candidates/core360-commerce-outbox.sql` continúa como candidato fuera de `supabase/migrations`. Amplía mapeos, ajustes, outbox, cursores y proyección de estados, pero no se aplicó SQL remoto ni se modificó inventario, pedidos, pagos, DTE o correos.
- Validación local: `node scripts/test-core360-commerce-adapter.mjs`, los chequeos sintácticos de ambos módulos, `npm run build` y `npm run qa:checkout-emails` aprobaron. `npm run qa:catalog` requiere una `SUPABASE_SERVICE_ROLE_KEY` local que no está disponible en este checkout. La lectura autenticada no mutante verificó nueve mapeos vigentes y cero filas de stock; ello no acredita saldo físico ni habilita sincronización.
- Para cualquier activación posterior se requiere aprobación explícita separada para migración remota, flags de escritura/entrega y contrato de endpoints de Core360, incluidos imagen privada, ajustes, estados y DTE. Una publicación de código por sí sola no autoriza esas activaciones.

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
