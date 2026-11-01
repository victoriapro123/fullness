# Cierre planes, carta y Fullness Lunch — 01/11/2026

## Autoridad y alcance actual

Carlos ordenó cerrar pendientes con Core360, habilitar armado, probar el flujo y publicar, usando los productos existentes para pruebas; Cecilia gestionará platos y stock. Se conserva semanal6/mensual4×6 y una sola duplicación por semana. Familiares aparte. La propuesta Fullness Club no se implementa. No se crean existencias físicas productivas a partir de recetas editoriales, nombres o cantidades de una fixture.

Comercio/Main/Coordinador Core tienen la autorización acreditada para su release Fullness/0151. Main es único publicador Core y dueño de un CoreQA loopback3151 aún no Ready al registrar esta nota; no levantar otro CoreQA ni sondearlo hasta su aviso. La entrega física se retiró del Bearer: sólo staff/primitivas Core, no plan-actions del sitio. TTL Core por su cron existente, sin afirmar liberación universal en el segundo exacto del vencimiento. El perfil nominal/organización conserva sus barreras.

## Implementado localmente (no equivale a publicado)

- `commerce-plans/1`: perfiles UUID/version, composición/semanas canónicas, preview/totales/hash, outbox existente con solicitud sellada antes de POSTplan-checkouts, held/importe/plazo obligatorio antes de MP; sin fallback plano v1 ni SKU padre. Despacho/familiares como standalone explícitos.
- El sitio consulta stock vigente para el constructor; una proyección de dos minutos no puede fingir disponibilidad actual. Se conserva el veto editorial de disponibilidad/fechas y la reserva canónica global al pagar.
- Preferencia MP vence junto con la reserva. Cancelación/fallo de preferencia encola cancelación CAS; callback rechazado/cancelado del plan intenta liberación sin revertir el pago conciliado. Pago tardío nunca se usa para reactivar stock. TESTMP no se informa como LiveCore. TESTUI sólo staff y familiares, no reserva productiva de planes.
- Backoffice vincula receta real y porción Core explícitamente, sólo `canUseInPlan=true/webSaleMode=plan_only`, precio/impuesto/unidad1000 canónicos. Operación atómica, CAS, actor comprobado, auditoría y conservación de identidad con pedidos históricos. No crea cantidades de stock ni recetas/BOM en Fullness.
- Se pueden quitar entradas del borrador de una carta y consultar otra revisión sin sobrescribir cambios concurrentes. Publicar carta, confirmar disponibilidad y mantener existencias siguen siendo pasos distintos.
- Tienda reemplaza mensajes/precios fijos anteriores por armado y suma de selección. Carrito despliega semanas. `/carta`, Fullness Lunch, borradores/publicación/historial, estados y fechas, FAQ permanecen administrables; no se inventaron cinco opciones iniciales ni stock. Los5prearmados siguen despublicados.

## Base real y configuración

Respaldo específico previo de configuración (no Auth/Storage/clientes): `R:/Entregables-Codex/Fullness/Cierre-Planes-Carta-2026-11-01/configuracion-antes-enlaces.json`, SHA256 d11222078ca59817e3510361f6ec9ebf57ba83c7189d2ea58e1981a6bdd8e83f. Conserva9menuitems/9mapeos/1carta15entradas/25disponibilidades. Respaldo cifrado anterior sigue separado.

Migración `20261101183957_plan_product_links.sql` aplicada en SQL Editor del proyecto allyjctrrtvibwchjouu, coincidencia íntegra del texto comprobada; éxito. Índice parcial por receta/mealprep, auditoría privada y RPCservice-only. Verificación real: RLStrue, anon_tablefalse, anon_rpcfalse, server_rpctrue, links_written0. No se simuló actor Cecilia ni se crearon productos al aplicar DDL.

Migración `20261101190326_plan_checkout_outbox_events.sql` aplicada después de confirmar CHECK real que admitía sólo payment_approved. Ahora admite los cuatro eventos tipados creados/pago/cancelación/reembolso, conserva tabla/identidad/RLS y datos históricos. Éxito del editor; no se agregó un ledger/scheduler ni grants públicos.

Vercel MCP lectura de variables403; fallback CLI59.15.1 con sus credenciales propias válido. Proyecto fullness, prj_XfS4mI7Anz7900kfL7wzGt0R4mNF, team_M5NCG0lMGjLJRkSI5ZPHZ5s4, Vite/Node24, Git productionBranchmain verificados. Se prepararon sólo Production Config FULLNESS_CUSTOM_PLANS_ENABLED=true y CORE360_COMMERCE_ORDER_SYNC_ENABLED=true para el próximo build autorizado; no redeployCLI. No se expusieron secretos ni cambiaron permisos.

## Evidencia focal hasta este hito

PASS: contratos/perfiles/suma/composición/held, outbox versionado; selección6/24 y stock global; SQLvínculos/CAS/auditoría/RLS/históricos y eventosoutbox; carta/Lunch/fechas/publicaciónSQL; adapter/preflight; pago conciliado conservado ante fallo de correo/Core. Checkout completo de plan con proveedores simulados: persistencia→cola→reserva→MP con total/plazo; fallo de preview/reserva/cola evita MP, fallo MP intenta cancelación. No es un pago real.

UI móvil390×844: imágenes reales de ejemplo con selección/stock/precios explícitamente ficticios; una sola duplicación, rechazo de tercera unidad y segunda duplicación, semanal44000, mensual4×6=176000, desglose por semana y sin overflow. Capturas `carrito-semanal-movil-simulado.png`/`carrito-mensual-movil-simulado.png` no se presentan como catálogo ni cobro productivo. Build Vite aprobado antes de los últimos ajustes menores; validar el lote final aislado una vez listo. iPhone físico no probado.

## Publicación pendiente al registrar

No hay commit/push/deployment de este lote todavía. Fuente de desarrollo codex/unify-mobile-menu-typography con35commits previos/WIP, no empujar toda la rama. Aislar el lote en el worktree detached de release ya existente y limpio, conservando corrección familiar d536a73; incluir sólo dependencia comercial/carta/QA terminada. Excluir credenciales/cache/creativos/runtime/otros informes. La aceptación adaptador→CoreAPI real aislada debe seguir al freeze/Ready de Main; no sumar mocks como si acreditaran esa frontera. Datos reales de porciones siguen sin configurar; constructor puede mostrar no-disponibles mientras Cecilia configura. No declarar compra productiva E2E ni MercadoPago pagado por pruebas locales.

Cerebro central aún no dispone de consulta/escritura operativa; ContextIA transitorio y posterior importación pendiente.

## Cierre de aceptación nativa y dependencias del release

Core3151 fue anunciado Ready por Main. El cruce Fullness PG17/PostgREST16/SDK → Core HTTP real terminó PASS9/9; recibo `R:/Entregables-Codex/Fullness/Cierre-Planes-Carta-2026-11-01/aceptacion-core-nativa.json` (ok:true). Semanal reserva antes de preferencia simulada; observación financiera sintética confirma esa misma orden; mensual4×6 y cancelación CAS; mixto con familiar/servicio3990; respuesta perdida después del commit recupera la misma orden sin segunda reserva; fallo de preferencia cancela; entrega por Bearer403. MP fue simulado: no se probó ni efectuó un pago externo. Fixture liberada expresamente a Main para sus comprobaciones finales.

El cruce detectó y corrigió la identidad de /stock: `id` identifica el saldo y `item_id` el producto. Se usa el agregado canónico del catálogo y evidencia de saldos, sin tomar un almacén aislado ni inventar stock. Las regresiones cubren ambos campos, agregado y ausencia de evidencia. No se alteró el contrato congelado de Core.

Se aisló el lote en `runtime/release-familiares-20261101`, conservando el baseline familiar y `styles.css` de producción. Dependencias TEST/unpaid del checkout incluidas de forma completa; no se empujan35commits de la rama fuente. Build Vite del lote aislado aprobado; advertencia de bundle grande ya informada, no error. Pruebas focales de contrato/selección/checkout/outbox/operación/TEST/notificaciones/preflight/availability/rutas/carta aprobadas. Test diagnóstico de recuperación actualizado al contrato que declara configuración sin inferir Live por prefijo de token.

Preflight real detectó que faltaba `checkout_mode` y sesiones privadas. Migración `20261021001000_isolated_mercadopago_test_checkout.sql` aplicada íntegramente en SQL Editor: Success. Antes se probó con PGlite, doble ejecución, histórico LIVE conservado, identidad TEST separada, duplicados rechazados y RLS. Se sustituye el índice antiguo sólo después de crear el nuevo; no se borran pedidos/pagos. El CHECK real de outbox ya admite los cuatro tipos. Recibos Core completados con el índice idempotente de `20261020001000_core360_webhook_receipts.sql`; confirmar resultado del editor al cerrar.

QA carta/Lunch320px: sin overflow de página, cinco opciones simuladas, borrador aumenta revisión sin publicar; confirmación separada publica y conserva URL. Valores simulados no se cargaron en producción. Nuevos estados de carga/error impiden mostrar transitoriamente el modelo de suscripción antiguo.

Readback SQL real final: order_modes3, order_statetrue, sessions_rlstrue, test_sessionstrue, core_receipt_indextrue, historical_nonlive0. Los históricos siguen LIVE. legacy_plans_active0, portion_products0, confirmed_availability0, active_letters0, local_menu_publishedfalse. Esto describe configuración humana pendiente, no un error técnico que deba resolverse inventando datos.

Mercado Pago: lectura oficial `/users/me` con ambos perfiles privados ya autorizados: LIVE200/test_userfalse/MLC y TEST200/test_usertrue/MLC. No se basó en prefijo del token. Se añadió exclusivamente a Production del proyecto Fullness la Secret `MERCADOPAGO_PRODUCTION_ACCESS_TOKEN` verificada, para que el nuevo checkout LIVE no use por accidente la credencial TEST heredada. Firma webhook existente conservada; no se crearon usuarios, pagos ni preferencias externas. No se volcaron credenciales en Git ni en entregables.

## Publicación iniciada (registro posterior al checkpoint)

Main acreditó Core Production Ready: dc4bd3ed0950304ed8b0910e8cc420f1f7cc7290, deployment dpl_66ZGDqSwftmm8tkUVBmjv5oAa9D7, core.prof3sional.com,0151 aplicada/checksum/replay vacío. Core CI41345321022 separada, inicialmente queued. Perfiles reales se configuran por Main con actor staff; sus UUID/version no se anticipan.

Fullness checkpoint aislado `0ce19ea023ba8627eea032951e2d39e8be4a573d`,75archivos, build final exit0 y árbol de release limpio. Push único `HEAD:main` confirmado desde d536a73; no se publicó la rama de35commits ni se creó buildCLI. Vercel detectó el SHA exacto en Production/main: dpl_FsEJpXdER4nZQshRAVBLxs8YRL4G, inicialmente BUILDING. Recibo Ready/dominio/smoke se registra al terminar en Entregables-Codex, no se atribuye Ready por el deploy anterior.

Fullness nuevo deployment READY verificado por API Vercel: Production/main/SHA exacto0ce19ea, proyecto prj_XfS4mI7Anz7900kfL7wzGt0R4mNF, aliasErrornull, www.fullnesslab.com/fullnesslab.com. Smoke público14/14PASS: /tienda,/carta,/preguntas-frecuentes200 y bundle nuevo; APIstockletterenabledtrue sin carta inventada; cartaLocal200 no publicada; cuatro endpointsowner401/403 y cuatrowebhook/preferences405. Ningún pedido/preferencia/pago creado. GitHub Actions para ese SHA devolvió0corridas: no afirmar CIverde.

Main confirmó perfiles reales únicos/v1/activos/TTL900: semanal057f05aa-e708-4bd7-a05a-5f2a749cb9a0 (1×6), mensual797cfd7f-066f-4a79-8b95-9ff7010c7647 (4×6); ambosmax2/una duplicación. RecibosCore `R:/Entregables-Codex/Core360-Fullness-Planes-API-20261101/Main/Production-Profiles.json`. Sin artículos/stock ficticios. TTL900 es decisión inicial de implementación coherente con el contrato probado, no se atribuye a elección expresa de Carlos.

### Hotfix de cierre visual (lote distinto, no redeploy duplicado)

El postflight visual real de0ce19ea detectó logo roto: `/assets/brand/fullness-lab-horizontal-contrast-2026.png` devuelve404, mientras el mismo objeto por `/api/media?key=assets%2Fbrand%2Ffullness-lab-horizontal-contrast-2026.png` devuelve200/imagePNG/56675bytes. `.vercelignore` excluye public/assets; el build local tenía esa imagen pero producción no la servía estática. Se corrige únicamente la referencia del logo de header/footer al almacenamiento ya existente. No se genera otra imagen ni se sube un objeto duplicado. Es un hotfix concreto detectado después de publicar, con nueva validación mínima y un push propio; no un segundo buildCLI del mismo lote. Recibo final debe usar SHA del hotfix Ready, conservando0ce19ea como checkpoint funcional.
