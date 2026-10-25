# Venta de menús y fechas informativas de despacho

## Calendario por fecha — implementación vigente (25/10/2026)

Carlos confirmó: preventa de semanas futuras; nuevos menús programados expresamente por Fullnesslab; sin repetición automática. Autorizó aplicar el flujo y publicarlo, incluyendo configuración en backoffice. El bloqueo de acceso registrado abajo quedó resuelto cuando Carlos abrió la cuenta correcta en Supabase. El conector/CLI mantienen otra identidad: el DDL se aplicó desde el SQL Editor autenticado de Fullness, proyecto `allyjctrrtvibwchjouu`, comprobando el texto completo antes de ejecutar.

- `weekly_dispatch_menus` conserva un único menú por semana (lunes como referencia), publicación y revisión CAS. Arrancó sólo con las cuatro fechas existentes26/10,02/11,09/11,16/11. No duplica, modifica ni fabrica semanas. Los cuatro registros semanales reales mantienen exactamente el hash anterior `efa69bbb5ff0b2dd68119731b339b296e0c4a8096dc2d036a3ca8397ee1cda8e`.
- La compra semanal conserva su fecha futura. Al vencer el jueves17h, un menú antiguo deja de venderse para esa semana: no se lo despacha como si fuera el menú del martes siguiente. El cliente puede elegir una semana futura programada. Cortes lunes17h→martes y jueves17h→viernes; después→martes siguiente, Santiago.
- El mensual es un producto comercial de **cuatro entregas consecutivas**. La primera fecha se calcula al comprar; las otras tres mantienen ese martes o viernes en semanas consecutivas. El servidor asigna el menú del calendario de cada semana. Fechas sin menú se persisten pendientes, nunca se rellenan con Semana1 ni por ciclo. No hay elección de platos. Las relaciones antiguas `monthly_plan_weeks` quedan como archivo de compatibilidad: no gobiernan el nuevo checkout ni se borran pedidos históricos.
- `order_items.product_snapshot.planStructure=dispatch_calendar_v1` congela las cuatro fechas/identidades conocidas. El trigger transaccional crea `order_plan_deliveries` al insertar las líneas, verifica la revisión de calendario y el corte vigente antes de Mercado Pago. Si cambian, la inserción falla y no se genera preferencia. No se crean entregas retroactivas para pedidos anteriores.
- El guardado de calendario asigna automáticamente los menús a las entregas pendientes. Reasignar un menú ya conocido exige una casilla explícita; no modifica entregas completadas/canceladas ni pagos. `dispatch_calendar_audit` conserva actor, valores previos/nuevos y fecha. Core360 mantiene autoridad comercial, stock y operación física: no se cambió su código, flags, recetas/BOM, pedidos, impuestos ni servicios de despacho.
- `monthly_plan_nutrition_tags` ahora deriva tags distintos desde los mealpreps de las semanas del calendario de las próximas cuatro entregas, no desde vínculos estáticos. La UI deriva beneficios/tags sin duplicar y muestra sólo los menús publicados conocidos; las fechas pendientes son explícitas.
- Los sueltos normales/familiares siguen a pedido, con fecha coordinada por Fullnesslab, sin aplicarles cortes de planes. Se mantienen las tarifas por comuna publicadas y WhatsApp para otras comunas; no se cambió la regla de un cargo por pedido.

Backoffice → **Calendario de menús**: seleccionar semana de despacho y plan completo, publicar/preventa, confirmar guardado, ver entregas próximas y últimos cambios. Desde el editor del mensual o Publicación de un plan se llega al calendario sin perder sus borradores. El nuevo formulario respalda su borrador por administradora en este dispositivo; no se anuncia respaldo remoto antes de guardar. Recarga, error y conflicto conservan el borrador; actualizar calendario permite revisarlo contra la versión nueva sin borrarlo. Descartar exige confirmación. No hay cierre accidental por backdrop.

Migraciones aditivas aplicadas por SQL Editor: `20261025184224_dated_weekly_menu_calendar.sql`, `20261025190832_monthly_calendar_nutrition_tags.sql`. No ejecutar `db push` de todos los candidatos pendientes para volver a aplicarlas. Se respaldaron datos public cifrados, la validación de composición y la vista nutricional previas en `R:/Entregables-Codex/Fullness/Calendario-2026-10-25/`. Los scripts de verificación real confirmaron cuatro fechas, cero entregas/pedidos de QA, relaciones PostgREST válidas y tags deduplicados.

QA: suite JS de calendario, cortes, tarifas, Core preflight/adapter/servicio, correo y candidato TEST aislado aprobada; build Node24 aprobado. PostgreSQL17.11 aislado aprobó DDL, RLS, admin, CAS, cuatro entregas, asignación posterior, reasignación explícita y auditoría; fixtures sintéticos, sin tráfico externo. UI con proveedor simulado confirmó borrador tras recarga, no cierre por clic fuera, confirmación y recuperación del conflicto, sin overflow a320/390/768/1440px. Los estilos reales de backoffice se incluyeron en la prueba; reglas secundarias se despliegan por capas y se corrigió contraste del eyebrow. Captura QA explícitamente ficticia en la misma carpeta R. La verificación productiva de cotización y despliegue se añadirá al cerrar la publicación. No se hizo un pago real para QA. Cerebro remoto pendiente; registro local transitorio.

## Aclaración vigente de Carlos — menú único y cortes17h (2026-10-25)

- Fullnesslab produce un menú único para comenzar a despacharlo desde el martes de la semana siguiente. Pedidos de planes hasta lunes17:00 incluido → martes; después hasta jueves17:00 incluido → viernes; pasado ese corte → martes siguiente. Hora de Santiago. Sustituye el corte jueves23:59 de las secciones históricas.
- El mensual compra cuatro entregas; los menús son los que corresponden a las semanas de despacho, no una elección del cliente. La implementación actual todavía vincula y congela cuatro semanas estáticas: **la asignación automática por calendario no está terminada ni publicada**. Se pidió confirmar si las cuatro semanas se repiten o se programan nuevos menús por fecha; también si se mantiene preventa semanal o se asigna siempre el único menú del despacho. No inferir ciclos, inventar menús ni alterar relaciones/recetas reales mientras falta esa decisión.
- Mealpreps sueltos normales y familiares son a pedido; la fecha queda a coordinación de Fullnesslab y no hereda cortes ni promesas automáticas de martes/viernes. Tarifas por comuna permanecen, no se declaró envío gratis.

### Incremento local comprobado, sin publicación

`product-availability.js` comparte cortes lunes/jueves17h, límites de milisegundo y zona Santiago. Los productos que no son plan devuelven despacho automático null. El snapshot por línea conserva `dispatchPolicy=fullness_coordination`, texto propio y weekdays null para sueltos; planes usan weekly_fixed_menu y [2,5]. La orden guarda el conjunto de políticas presentes para que un carrito mixto no aplique fechas fijas a sus sueltos. No se reescribe un pedido existente.

UI: reglas separadas por sección, FAQ sin elección de platos en planes, carrito condicional por los tipos que contiene y editor con fecha sólo referencial para sueltos. Se evita prometer día fijo a un familiar. Revisión React: valores derivados en render, sin efecto/estado duplicado ni dependencia nueva.

QA local: calendario/checkout con cortes verano e invierno, lunes17:00 exacto, jueves16:59:59/17:00:00/17:00:00.001/17:00:01; familias y normales sin fecha automática y persistencia simulada comprobada. Pasan preflight Core, tarifas, servicio Core, checkout TEST aislado, correos simulados y build Node24. Navegador local: carrito semanal muestra jueves17h; carrito sólo familiar muestra coordinación sin regla fija, resumen/CTA cómodos a390px. No se envió checkout ni se guardó administración. La copia local conserva un candidato TEST ajeno a esta publicación; no se debe publicar la rama completa. Medios locales sin credenciales no se usan como evidencia productiva.

Evidencia recortada de UI local: `R:/Entregables-Codex/Fullness/Despachos-2026-10-25/regla-mealpreps-local.png`. No hay push, SQL remoto, nueva configuración Core, pedidos reales, preferencias MP, pagos ni correos. Cerebro central pendiente conforme a su contrato transitorio.

## Antecedente: regla anterior publicada

## Decisión vigente de Carlos (2026-10-25, corrección posterior)

«Libera los menús, sólo indica que el despacho será en esas fechas» sustituye la ventana de compra descrita en el antecedente inferior. Los cuatro menús se pueden agregar y comprar simultáneamente, antes o después de su fecha informativa. No se reactiva un producto oculto o pausado manualmente, y no se omite la autoridad canónica de stock/precio Core360.

Carlos añadió y autorizó publicar la regla: pedidos hasta el lunes a las 17:00 se despachan el martes; después, hasta el jueves a las 23:59, el viernes. Confirmó que desde el viernes pasan al martes siguiente. Horario de Santiago. Esto reemplaza el día lunes de despacho anterior.

Se conservan las semanas de referencia 26/10, 02/11, 09/11 y 16/11. Antes de cada corte del lunes, las fechas son 27/10, 03/11, 10/11 y 17/11; tras ese corte pasan a 30/10, 06/11, 13/11 y 20/11. `getDispatchSchedule` calcula el día con calendario/reloj de Santiago: lunes a las 17:00 incluido; jueves 23:59:59 incluido. Una semana futura conserva su preventa, y una semana pasada rueda al próximo despacho válido, sin bloquear su menú. `metadata.availability.mode=scheduled` significa activo con semana de referencia; `ends_on` queda como antecedente sin limitar compra.

Implementación compartida en `getProductAvailability`: las fechas válidas no provocan `upcoming` ni vencimiento. UI y checkout utilizan el mismo resultado. El backoffice cambia a «Venta y despacho», «Activo con fecha de despacho» y un selector «Semana de despacho», sin desactivación por fecha. Al editar fecha/modo se limpia el vencimiento legado. `DISPATCH_RULE_TEXT` comparte la regla en catálogo, carrito, FAQ y backoffice; cada card/ficha usa la fecha calculada y cortes compactos. Las instantáneas nuevas conservan `dispatch` con `dispatchOn`, semana de referencia/efectiva, martes, viernes, regla y zona, además de `weeklyDispatchWeekdays=[2,5]`. El mensual conserva el despacho calculado de cada semana dentro de su snapshot, usando un único reloj de inicio del checkout.

Publicación de este ajuste autorizada por Carlos. Usa las cuatro fechas ya persistidas; no requiere DDL, duplicar productos ni modificar precio/foto/composición. El candidato de tarifas y su bloqueo Core360 queda fuera de la copia limpia de main. No se crea una compra, un pago o un correo real para probarlo.

Pruebas locales actualizadas: cuatro menús disponibles antes/después de sus fechas, cortes de lunes 16:59:59/17:00:00/17:00:01 y jueves 23:59:59/viernes 00:00:00, preventas y semanas pasadas; metadata preservada y checkout simulado aceptado con fecha congelada correcta. Oculto/pausa/fecha inválida siguen protegidos antes de efectos externos. Preflight Core y tarifas locales pasan sin cambios de contrato.

Cerebro central continúa pendiente de consulta/importación remota; registro local transitorio.

## Antecedente histórico: ventana de venta publicada anteriormente

Lo que sigue acredita la implementación y publicación anterior, no la regla comercial vigente solicitada por Carlos. Hasta publicar el ajuste superior, el sitio desplegado aún usa ese comportamiento anterior.

## Decisión y alcance (Carlos, 2026-10-25)

- Los productos visibles pueden estar activos, inactivos o programados para comprar. Ocultar/mostrar sigue siendo `menu_items.is_active`; no reutilizarlo para rotar semanas ni romper el mensual.
- Programación confirmada: Semana 1 desde 2026-10-26 hasta desactivación 2026-11-02; Semana 2 desde 2026-11-02 hasta 2026-11-09; Semana 3 desde 2026-11-09 hasta 2026-11-16; Semana 4 desde 2026-11-16 hasta 2026-11-23. No se repite el ciclo automáticamente.
- Las fechas cambian a las 00:00 de America/Santiago, inicio incluido y desactivación excluida. Los despachos semanales son los lunes. No se inventó un horario de corte, plazo ni promesa adicional de entrega.

## Persistencia y autoridad

Se reutiliza `menu_items.metadata.availability` con `mode` (`always`, `paused`, `scheduled`), `starts_on`, `ends_on` y `time_zone`. No requiere DDL, cron, migración o nuevo recurso. Sólo se guarda la configuración, y el estado se calcula con una misma función del lado público y del servidor. Core360 conserva autoridad de precios, disponibilidad canónica/stock, pedido y operación; esta es la ventana editorial de compra de la tienda y no altera esos hechos.

La programación de las cuatro filas reales se aplicó con UUID verificados y CAS sobre `updated_at`. `scripts/configure-weekly-availability.mjs` tiene dry-run por defecto y exige `--apply`. Respaldo previo de las cuatro filas y recibo posterior verificado en `R:/Entregables-Codex/Fullness/Disponibilidad-Semanal-2026-10-25T14-25-32-567Z/`. Se compararon todos los campos salvo metadata de disponibilidad y updated_at: no cambió visibilidad, texto, precio, fotos, composición ni vínculo mensual. La lectura posterior confirmó las cuatro ventanas.

## UI y checkout

- Backoffice → editor del plan/producto → Publicación permite Activo sin fechas, Inactivo hasta nuevo aviso o Programado por fechas. Las fechas opcionales permiten apertura sin vencimiento cuando la administradora la elige explícitamente.
- Listado de planes, selector y slots del mensual, cards, detalle, mealpreps y carrito muestran estado/fechas. Un mensual puede seguir vendiéndose con sus cuatro semanas futuras; no hereda la restricción individual de compra semanal.
- El botón de compra se deshabilita si no está disponible. El guard de agregar y la comprobación previa al envío del carrito vuelven a verificarlo. Se refresca el cálculo cada 30 segundos y al recuperar la pestaña.
- El servidor reconsulta la fila real y rechaza fuera de fecha con HTTP 409 antes de órdenes, Core360, correo o preferencia MP. La instantánea de pedido conserva disponibilidad y weekday=1 para semanales. No se modifica ningún pago existente.
- Los borradores nuevos conservan la programación. Al restaurar un borrador anterior sin esos campos, se recupera la programación de la fila actual, no se convierte automáticamente en activo permanente.

## Verificación

`scripts/test-product-availability.mjs` aprobó límites de Santiago (02:59:59Z vs 03:00:00Z), cuatro semanas exclusivas, fechas inválidas, pausa, apertura sin vencimiento y conservación de metadata. El checkout simulado fuera de fecha produjo 409 con cero escrituras o llamadas Core/MP. Preflight Core, catálogo real de nueve productos, QA de checkout TEST y correo pasaron. Build aprobado con Node 24.

Navegador local con catálogo real leído mediante clave pública: hoy las cuatro semanas aparecen próximas; reloj simulado al lunes 26 a las 00:00:01 habilita sólo Semana 1, mientras mensual/familiares permanecen sin cambios. Cards/fechas sin overflow horizontal a 320, 390, 768 y 1440 px. Las imágenes `/api/media` no están configuradas en ese servidor local; no se presentó esa limitación como problema de producción. No se inició sesión ni guardó un formulario administrador durante esa prueba visual.

Carlos autorizó publicar al finalizar las pruebas. La publicación debe trasladar sólo este cambio a main, sin incluir checkout TEST ni migraciones candidatas de otras tareas. Consulta/importación Cerebro central pendiente conforme al contrato transitorio; no se declara registro online.

## Publicación confirmada

El 25/10 se trasladaron únicamente `8ef6f93` y `32005b2` a la copia limpia de main, resolviendo dos conflictos para conservar el checkout productivo (sin importar ni habilitar el candidato TEST). Las pruebas de calendario y preflight Core y el build de esa copia aprobaron. Se realizó un solo push a main: `c0341f88d998922b0aaeab0863b30cbb77ac2365`.

Vercel `fullness`, equipo `team_M5NCG0lMGjLJRkSI5ZPHZ5s4`, deployment `dpl_2LG4bc9Jsb9N6gLziBpQ4sfHDyn4`, confirmó Production/READY y alias `www.fullnesslab.com`. El dominio sirve `/assets/index-COOBAy17.css`. Navegador público a fecha 25/10: las cuatro semanas próximas, fechas 26/10, 02/11, 09/11, 16/11 y compra semanal deshabilitada. El reloj simulado al 26/10 habilita únicamente Semana 1; se restauró después la fecha actual para la lectura final. Consola pública: cero errores, una advertencia de preload de poster no usado. No se crearon pedidos ni preferencias, ni se realizaron cobros, correos o llamadas de prueba a MP.
