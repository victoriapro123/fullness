# Inventario de venta administrado desde Fullness

## Decisión humana vigente

Carlos solicita que Cecilia ingrese unidades y publique los mealpreps desde Fullness, sin segunda sesión, vínculos físicos ni motivo obligatorio. La integración externa no debe bloquear inventario, precio, armado de planes, carrito o pago. Los ingredientes son texto libre. El motivo interno queda fijo en `modificado en web`. Se retiran instrucciones de IA y explicaciones técnicas de las pantallas operativas.

Esta decisión sustituye el modelo de inventario físico requerido por las notas `stock-integrado-sin-popup-20261102.md` y `stock-integrado-publicacion-main-20261102.md`. No modifica movimientos históricos ni permite inventar existencias. Las 24 unidades de la foto no se ingresan en producción. Main prepara las 15 identidades comerciales explícitas, separadas de las 25 recetas históricas, con cantidades pendientes hasta que Cecilia las indique.

## Implementación candidata

- UI: listado de platos, cantidad, mostrar/ocultar y guardar. Información opcional desplegable: nombre, precio con IVA, descripción, foto e ingredientes escritos libremente. Borradores conservados y consulta de resultados ante pérdida de respuesta.
- Base: capacidad de venta, reservas, intentos de compra y bandeja de integración privada; RPC sólo para servicio, comprobación de administradora real y versiones concurrentes. Motivo de auditoría fijo. No se asocia inventario de ingredientes.
- Compra: reglas actuales 6 / 4×6, máximo dos del mismo plato y sólo un tipo duplicado por semana. Suma de precios de cada plato. Familiares aparte. Reserva y orden atómicas, clave estable, una solicitud de enlace de pago por intento. Una respuesta incierta se consulta, no se vuelve a emitir.
- Confirmación: pago verificado descuenta una sola vez; reintentos no duplican. Vencimiento por sí solo no libera reservas: se comprueba también el estado del pago. No se reintegra stock automáticamente por reembolso.
- Pedidos nuevos usan autoridad Fullness. Pedidos históricos conservan sus reglas. La bandeja de sincronización no es un requisito para vender. La adaptación externa se coordina después de publicar, según instrucción humana.
- Migración candidata: `20261103011537_mealprep_sales_capacity.sql`. Main es el único ejecutor de SQL, configuración y publicación. No se aplica desde el worktree de autoría.

## Evidencia local y límites

`scripts/test-mealprep-sale-checkout.mjs` PASS con SQL real en PGlite: composición sin vínculos externos, cotización sin escrituras, integración desconectada con cero llamadas, una preferencia por clave, respuesta perdida recuperada sin otro POST, consumo una sola vez y liberación sólo tras comprobación. Pagos y cantidades de prueba sintéticos; cero compras, cobros o movimientos reales.

Build candidato `npm run build`: PASS. Avisos conocidos de recursos de imagen resueltos en ejecución y tamaño de bundle; no fallos de compilación. Revisión de componentes según guía UI/React: controles etiquetados, foco, botones táctiles, borradores y mensajes comprensibles.

QA visual del componente real con transporte de prueba: 15 platos, guardar cantidad/publicación, pérdida de respuesta y consulta sin otra escritura. Anchuras 320 y 390 sin desbordamiento horizontal. Ningún campo de motivo ni texto Core360/ContextIA/prompt visible. Capturas separadas de producción, en el paquete R de inventario web. No equivale a sesión real de Cecilia, a Mercado Pago Live ni a aceptación productiva.

## Publicación y mantenimiento

El candidato parte del e5 local de Main y no incluye WIP del checkout principal. Main debe converger el hotfix de mantenimiento `6dfd974d3160249a1ed7d7d9570f0f5e167d0723`, preservando compras bloqueadas hasta autorización de reapertura. El fin de estas pruebas no autoriza levantar mantenimiento. Infra es dueña de la pausa global; Main publica. Push, Ready, dominio, migración y reapertura son evidencias distintas.

Main verificó el SQL final SHA256 `f99fa6b4f53c87a0ffa9d6191acde628844af737794de8dd177cb8c54f2fd6b1`: Native 15/15 PASS, run `18a890b7-c4ed-44fb-937a-01141f693201`, finalizado y detenido. Incluye última unidad, CAS/replay, composición Source sin vínculos externos, precio e ingredientes libres sin alterar unidades, administradora revocada, edición concurrente, liberación/pago con bloqueo coherente, pedido familiar histórico y cantidades cero/NULL. Recibo: `R:/Entregables-Codex/Fullness-Inventario-Integrado-20261102/Main/Source-Capacity-Native-Verification.json`. Reutilizar esta evidencia si no cambia SQL.

Pendientes al entregar: SQL/bootstrap productivos autorizados, integración del delta y verificación del despliegue. Main confirmó que el hotfix de mantenimiento está READY/Production, deployment `dpl_9S7siXNVxMcPndf1cQHb6qNfGvV2`, con ambos dominios; no incluye este candidato. La programación editorial de cartas conserva sus fechas: no se inventan nuevas fechas, ciclos, cantidades ni disponibilidad. Este lote simplifica inventario; no declara implementado Fullness Club.

Registro local transitorio; no acredita importación remota a Cerebro.
