# Venta de menús y fechas informativas de despacho

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
