# Disponibilidad comercial por fechas

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
