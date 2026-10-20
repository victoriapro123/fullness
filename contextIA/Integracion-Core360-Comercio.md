# Integracion Core360 - Comercio web FullnessLab

Fecha de actualización: 2026-10-20
Estado: migración y nueve mapeos aplicados en Supabase Fullness. Proyecciones de catálogo/stock e imágenes verificadas con SDK y API reales. La activación persistente y la publicación de la aplicación siguen separadas de este cambio de base de datos.

## Cierre de activación autorizado el 2026-10-20

- Infraestructura es el único actor de entorno/corte/despliegue Fullness; BOM centraliza aceptación con Main y Comercio. Sitio Fullness confirmó el cierre de su runtime anterior y entregó el delta de consumo de imágenes `f0dde14`: URL propia versionada, validación de menú/mapeo activos y respaldo editorial, sin publicar referencias privadas Core. La migración aplicada y su documentación quedaron en `ea33d54`; la observabilidad privada del runtime comenzó en `9db6637`.
- Se verificó el proyecto Vercel real `fullness`, equipo `team_M5NCG0lMGjLJRkSI5ZPHZ5s4`, repositorio `victoriapro123/fullness` y productionBranch `main`. Antes del corte el dominio servía `0e286057`, todos los flags Core estaban en false y no había SYNC_FROM. El conector denegó env con 403; el fallback CLI oficial autenticado sí permitió inspeccionar/configurar el mismo proyecto. CRON_SECRET ya existía y debe reutilizarse; su mera presencia no acredita que el deployment anterior lo haya recibido (el probe previo devolvió 503).
- El baseline real conserva 12 pedidos, cero pagos aprobados, cero pagos y outbox vacío. Los nueve UUID/SKU/UOM/precios/IVA/versiones siguen coincidiendo con Core360. No se repitió migración, semilla, conversión de unidad, ajuste de stock ni alta de credenciales Core.
- El cierre corrige un fallo del intento inmediato posterior a la conciliación: el hook entrega `{id,status}` y el worker ahora rehidrata/valida el payload canónico bajo lease antes de enviar. La recuperación conserva la misma solicitud congelada e identidad externa.
- Un Core público exige `live_mode === true` observado por Mercado Pago y conservado en el evento. La recuperación lee ese booleano desde `payments.raw_payload` por alias JSON de PostgREST. TEST, dato desconocido o una configuración MP de pruebas se rechazan antes de encolar o antes de crear cliente/pedido Core; un evento no-live ya persistido queda fallido y no se reintenta automáticamente. Sólo QA loopback explícita admite hechos sintéticos; habilitar TEST_MODE en una URL pública no omite la guarda.
- El endpoint privado de recuperación publica, sólo después de autenticar, SHA/corte/flags, modo de cliente e intención fiscal y presencia/tipo/modos de MP sin valores secretos. `GET .../recover?providerProbe=mercadopago` es opt-in y consulta exclusivamente `/users/me` con el Secret efectivo del deployment: devuelve status/hash de identidad, sin PII y sin ejecutar worker. El cron normal no consulta ese endpoint del proveedor.
- La fuente Fullness del Vault respondió 200 a `/users/me` pero es TEST. Eso no acredita ni permite inferir la clave efectiva de Vercel: las lecturas de Secrets omiten sus valores. Su validez/clase/modo se debe acreditar con el probe privado del deployment; no cambiar credenciales MP ni modos por inferencia. El webhook publicado rechazó una solicitud sin firma con 401 antes de persistir eventos.
- QA nativa ampliada: 14/14 PASS con PostgreSQL 17.11, PostgREST 16.4, SDK real y el espejo Core3083 sellado/ficticio. Run `b21a7e85-aa46-4f29-ac01-39b2775e971b`, terminado `2026-10-20T12:26:11.084Z`. Incluye positivo LIVE simulado persistido/recargado, configuración HTTPS sin bypass con reescritura de red estricta a QA, id-only/replay y rechazo TEST/unknown sin HTTP público. Mercado Pago y Core productivos no participaron de esas mutaciones sintéticas.
- Preflight real de sólo lectura contra Core productivo el 20/10: `2 × 18.800 = 37.600`, pago `unpaid`, sin partner/orden, con disponibilidad observada `0`; una versión opaca obsoleta obtuvo 409. No se creó preferencia ni se llamó a Mercado Pago.
- El corte UTC se genera fresco después de la aceptación del candidato y antes de configurar el entorno del único release Git a main. Se usarán READ/POLL/PREVIEW/MEDIA_PROXY/SYNC/DELIVERY, cliente `identified`, fiscal `pending`, MEDIA_WRITE=false y callback canónico `https://www.fullnesslab.com/api/mercadopago/webhook`; la credencial Core nominal y CRON_SECRET se reutilizan. La activación efectiva se acredita por el recibo del deployment y el smoke autenticado, no por `.env.local`.
- Recibos operativos privados de este cierre: `runtime/fullness-activation-20261020.local/`; la evidencia final se copia a `R:/Entregables-Codex/Fullness/Core360-Activacion-20261020/`. Un worker vacío activo no se presentará como una compra real; no se generarán pedidos, pagos, reembolsos, correos o DTE productivos de prueba.

## Migración productiva aplicada el 2026-10-19

- Carlos pidió consultar “Sitio Fullness”, “BOM” y “Comercio” y realizar la migración requerida en Fullness. Se revisaron sus registros locales y las evidencias compartidas: Sitio `019fecf2-a888-7640-ada6-44dc3b4d9a85`, BOM `01a1469a-f724-78b2-ba39-2a96c7cd893d` y Comercio `01a145c8-0079-71c1-a606-c86915ef4f41`. El conector de mensajería entre hilos estaba indisponible; no se atribuyen respuestas nuevas a esos hilos.
- Se auditó mediante la sesión autenticada del SQL Editor el proyecto exacto `allyjctrrtvibwchjouu` de la organización Fullness. Antes había 30 tablas y cuatro vistas public, sin objetos `core360_`; `is_admin()` y `set_updated_at()` existen. Las FK históricas `orders_client_id_fkey` y `order_items_product_id_fkey` siguen `NOT VALID`, sin alteraciones de datos o constraints anteriores.
- El respaldo cifrado nuevo de las 20 tablas comerciales contiene 122 filas y coincide con el snapshot restaurado previamente: SHA-256 canónico `c78f9be0be16eb536138241993561abd1eb3379a823de894ff38617aa94bd5ef`. Se exportaron además columnas, constraints, índices, funciones, vistas, políticas, ACL y triggers vivos. Los snapshots public no son un respaldo de Auth, Storage/R2, Vault, proveedores o base completa.
- Se aplicó `supabase/migrations/20261019001000_core360_commerce_integration.sql`, SHA-256 `d11e13b7491409285d85287cffcd88c140be2f23e917fd22924134ba6ef41408`. Conserva el DDL del candidato `359bfe0a3231c71f58ead71afb4335ad283b30f090a8f9389a2a32249337c447` y agrega preflight, timeouts, advisory lock, registro de versión y ACL explícitas. El candidato histórico se conserva para trazabilidad y no se debe ejecutar además de esta migración.
- La auditoría detectó que el ACL por defecto de Supabase concede EXECUTE de nuevas funciones explícitamente a anon/authenticated. La versión aplicada revoca esos permisos sobre la RPC nueva, además de PUBLIC, y permite ejecutarla únicamente a service_role. Las ocho tablas nuevas tienen RLS, sin privilegios anon, SELECT autenticado sujeto a is_admin y CRUD de mapeos sólo para administradores; service_role conserva la persistencia backend. No se modificaron permisos de objetos previos.
- La versión `20261019001000` quedó registrada en `supabase_migrations.schema_migrations`. La prueba PGlite de esos bytes aprobó siete controles, incluidos permisos heredados, RLS, estados de stock, historial y rechazo de reaplicación; sin llamadas remotas.
- Se revalidó en la API Core360 productiva que los nueve UUID/SKU/UOM/precios/IVA/versiones coinciden con la semilla revisada. Se ejecutó la semilla privada `fullness-mapping-seed.review.sql`, SHA-256 `c8fc6eb09ef999f39e765e5f4a45b0e2ff041a557ec07cd1e9f5362371d28cf4`: nueve vínculos exactos UUID a UUID, UOM `un`, factor `1000`, IVA `1900`, estrategia `opaque_product`, sin editar `menu_items`.
- Se ejecutó una comprobación manual del adaptador con SDK Supabase real y GET Core360: nueve proyecciones de catálogo disponibles, nueve proyecciones de stock basadas en los hechos del producto canónico y nueve metadatos de imagen refrescados. La lectura /stock devolvió cero detalles; no se generaron balances ni movimientos en Core360. READ/POLL se habilitaron sólo dentro del proceso de comprobación, con SYNC/DELIVERY en false, sin persistir flags.
- Después de la comprobación siguen 12 pedidos y cero pagos; outbox, mapeos de clientes, estados de órdenes y documentos fiscales Core360 continúan vacíos. No se crearon pedidos de prueba, preferencias Mercado Pago, correos, DTE ni entregas. No se publicaron cambios ni se activó el worker.
- Evidencias locales privadas: `backups/core360-20261019/`. Copia comprobada en `R:/Entregables-Codex/Fullness/Core360-Migracion-20261019/`. La aplicación de SQL se realizó por el SQL Editor autenticado; el token Management consultado por Vault respondió 403 y no se reutilizó para mutaciones.
- La base de Fullness ya está preparada. La activación del runtime, su corte temporal para excluir históricos, permisos/secretos operativos y la publicación coordinada corresponden al siguiente corte de Sitio Fullness; esta migración no los ejecuta implícitamente.
- Revisión de corte del 2026-10-20 (sólo lectura): el recibo de migración confirma los nueve mapeos, las 122 filas comerciales intactas y el SQL aplicado SHA-256 `d11e13b7491409285d85287cffcd88c140be2f23e917fd22924134ba6ef41408`. Este SQL ya aplicado debe entrar al commit candidato: en este checkout aún es un archivo no rastreado. El informe de gates previo declara `remoteMigrationApplied=false`, por lo que debe regenerarse antes de la publicación y no puede usarse como estado final. No se activaron flags, no se ejecutó SQL ni se efectuó publicación en esta revisión.

## Antecedentes de revisión inicial (2026-10-16)

## Alcance y evidencia

- Este documento cubre la tienda web `https://www.fullnesslab.com/tienda`, que cobra con Mercado Pago Checkout Pro.
- No cubre el terminal presencial Transbank ni la emision presencial de boleta. La existencia de ese flujo fue informada por Carlos; no hay integracion Transbank ni Core360 en este repositorio.
- Se revisaron las migraciones, los endpoints y el backend de checkout del checkout actual `2f54e4b` (rama `codex/unify-mobile-menu-typography`).
- En esa revisión inicial no se verificó la forma administrativa de la base: el `.env.local` sólo contenía `VERCEL_OIDC_TOKEN`. La auditoría administrativa y aplicación posteriores están documentadas en el estado vigente anterior.

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
- La QA HTTP contra Core360 local aprobó la unicidad de pago: dos órdenes distintas con la misma referencia Mercado Pago provocan `409`. La alerta anterior era un defecto del mock Fullness: al preparar la segunda entrega reinyectaba el payload original, por lo que sólo repetía la misma `externalOrderId`. El test ahora carga explícitamente el payload duplicado y conserva una traza saneada de ruta, `externalOrderId`, `partnerId`, referencia de pago y código HTTP cuando falla. No hubo API productiva Core360.
- El dashboard Supabase solicitado no tenía sesión autenticada y `.env.local` no contiene URL/Service Role. Posteriormente se usó exclusivamente la credencial privada local `runtime/fullness-production.private.env.local` para generar el respaldo REST cifrado `runtime/fullness-production-20261019/fullness-rest-data-20261019T094453Z.local`: dos lecturas estables tuvieron el hash SHA-256 `c78f9be0be16eb536138241993561abd1eb3379a823de894ff38617aa94bd5ef` y un proceso independiente confirmó descifrado y hash. El manifiesto y el plan de restauración son metadatos locales ignorados por Git; sólo el snapshot contiene datos y está cifrado. Cubre las filas de las 20 tablas `public` indicadas por el manifiesto; no acredita ni contiene DDL, roles/RLS/policies, `auth.users`, Storage/R2, Vault, Vercel ni estado de proveedores. No se aplicó migración remota. El conector Vercel permite publicar, pero deniega listar o crear variables Production (`403 forbidden`); `CRON_SECRET` sigue sin poder provisionarse y el endpoint cron responde `503 recovery_not_configured`. Ninguna flag Core360 fue activada.
- El refuerzo local de proyección y checkout conserva todos los flags en `false` y no se aplicó SQL remoto ni publicación. Cuando en una futura activación controlada coincidan `READ + POLL`, el wakeup refrescará catálogo/stock y metadatos de imagen por separado de la entrega: un artículo Core ausente, inactivo o con UOM/factor distinto se proyecta explícitamente como no disponible, sin conservar un precio antiguo. El `404` de metadata limpia sólo `image_reference` e `image_version` del mapeo Core; el asset editorial de Fullness no se toca. El candidato `supabase/candidates/core360-commerce-outbox.sql` agrega esos hechos comerciales y su SHA-256 actual es `359bfe0a3231c71f58ead71afb4335ad283b30f090a8f9389a2a32249337c447`.
- Antes de una preferencia Mercado Pago, la futura combinación `READ + POLL + PREVIEW` usa `POST /orders/preview` con pago `unpaid`, sin cliente ni orden Core, y congela en `product_snapshot` el UUID, SKU, UOM, factor, versión, impuesto, precio e identidad/version de imagen ya cotizados. Un `409`, desactivación o diferencia de precio/UOM/factor bloquea el checkout antes de insertar la orden Fullness o pedir una preferencia. `scripts/test-core360-commerce-adapter.mjs` y el nuevo `scripts/test-core360-checkout-preflight.mjs` pasan en mocks; `npm run build` pasa. La revalidación nativa de este delta no se ejecutó: aunque existen binarios privados, el runner completa su recorrido contra el servicio compartido `localhost:3083` y puede mutar órdenes/media. Por instrucción de coordinación no se tocó ese servicio ni el fixture; la QA histórica no se presenta como evidencia de este cambio.
- La cotización `POST /orders/preview` valida sólo artículo vendible, UOM, factor, versión, impuesto y precio: los nueve artículos importados pueden tener balance `0` mientras quedan como pedidos pendientes de preparación/entrega. No se inventa saldo ni reserva antes del pago. La operación física posterior en Core360 conserva la autoridad para exigir stock cuando corresponda. La prueba local cubre `2 × $18.800 = $37.600` con `availableMilli = 0` y `fulfillmentStatus = pending_preparation`, sin Mercado Pago, cliente ni orden nueva.
- La vitrina pública trata una respuesta 200 habilitada de `catalog-projection` como autoridad por artículo: si Core retira, desactiva o deja incompatible un UUID, sólo ese producto se oculta y los demás precios canónicos permanecen visibles. Un 5xx, JSON inválido o fallo de transporte en cambio vacía el catálogo y muestra indisponibilidad, sin exponer precio editorial heredado; un catálogo comercialmente vacío sigue siendo distinto de un error y usa sus estados vacíos de sección. `scripts/test-core360-public-catalog-projection.mjs` cubre ambos artículos (uno válido y otro retirado), vacío real/comercial y fallo global.
- El candidato SQL actual fue reejecutado sin mutación remota contra PGlite aislado, Node `v24.19.0`, en `C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/fullness-integration-20261018/fullness-sql-qa/runs/2026-10-19T10-13-47-382Z-34de3ede-b7c9-4832-b062-3c5b810c5024/result.json`: **13/13 PASS**, hash de entrada y salida `359bfe0a3231c71f58ead71afb4335ad283b30f090a8f9389a2a32249337c447`. Confirma DDL, FK, RLS/base, las cuatro combinaciones válidas de stock, unicidades y CAS manual de lease/finish; no acredita Supabase ni Mercado Pago reales. El runner privado fue actualizado sólo para expresar las columnas NOT NULL vigentes del candidato.
- Se revisó sin ejecutar `C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/fullness-production-20261019/fullness-mapping-seed.review.sql`, SHA-256 `c8fc6eb09ef999f39e765e5f4a45b0e2ff041a557ec07cd1e9f5362371d28cf4`. Sus 9 filas tienen UUID, SKU, UOM `un`, factor `1000`, precio bruto positivo, IVA `1900`, versiones opacas y estrategia `opaque_product` únicos. Es compatible con el `image_version` nuevo por ser nullable. El SQL usa transacción + advisory lock y aborta si el catálogo activo, identidad Core, UOM/factor/estrategia o imagen previa no coinciden; no toca campos editoriales. Esas guardas son estáticas hasta un restore/migración autorizado; no se aplicó la semilla.
- El respaldo cifrado REST se volvió a descifrar localmente con éxito: hash de datos `c78f9be0be16eb536138241993561abd1eb3379a823de894ff38617aa94bd5ef`, 20 tablas presentes y 122 filas conforme a su manifiesto. Sus tres archivos (cifrado, manifiesto y plan) coinciden byte a byte con la copia de `R:/Entregables-Codex/Fullness/respaldo-supabase-20261019T094453Z`. Un restore sintético reveló drift histórico: 5 pedidos referencian 1 perfil inexistente y 3 líneas referencian 1 producto inexistente. Las migraciones versionadas ya declaran `orders_client_id_fkey` y `order_items_product_id_fkey` como `NOT VALID`: conservan esos históricos, pero rechazan nuevos huérfanos. No se borró ni reparó una fila, no se desactivó una FK y el esquema vivo aún requiere la sesión Admin de Supabase para su auditoría.
- La evidencia HTTP puntual y no mutante contra el servicio Core360 local quedó en `C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/fullness-production-20261019/checkout-preview-http.json` (2026-10-19T10:14:45.751Z). Vincula el adaptador SHA-256 `d832cab459571ae7f2a1326b3c74e1ae2ba2f09e89d564415ac045bb46f6a2d0`, verifica cotización `2 × $18.800 = $37.600`, ausencia de partner/orden Core, rechazo 409 de versión opaca desactualizada y cero llamadas Mercado Pago. No valida entrega, media ni persistencia Supabase real.
- Se corrigió la agregación de fallas del wakeup: `images.failed` y `orderStates.failed` son arreglos, por lo que un arreglo vacío ya no se interpreta como error. Los errores completos (`failed === true`) y los parciales no vacíos se informan con el stream y código reales. La regresión cubre las tres proyecciones sanas con `wakeupFailures: []`, un fallo total de catálogo `CORE360_CATALOG_SOURCE_TIMEOUT` y un fallo parcial de imagen `CORE360_IMAGE_SOURCE_TIMEOUT`, sin confundir streams ni inventar errores.
- La cohorte nativa final se ejecutó con Node `v24.19.0`, PostgreSQL 17, PostgREST 16.4, `@supabase/supabase-js`, un clúster temporal aislado y la ventana QA autorizada de Core360 local. Recibo privado `runtime/fullness-core360-native-qa-receipt.local`, SHA-256 `d41966fba110522d7fd7c897c0400dd5e8863c3c467b4a47afb8618b455e46ef`, corrida `1c42fc1a-07f8-4553-9951-5eea0cc2c819`: **12/12 PASS** contra el candidato `359bfe0a3231c71f58ead71afb4335ad283b30f090a8f9389a2a32249337c447`. Cubre SDK/PostgREST, persistencia y replay del outbox, cliente Core, estado/versiones, lease concurrente/vencido, recovery/cursor, proyección editorial y media privada. El cluster temporal se eliminó al finalizar; no se usó Supabase ni se publicó.
