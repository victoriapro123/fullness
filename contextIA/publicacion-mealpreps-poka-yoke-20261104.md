# Publicación de mealpreps: prevención de errores

Carlos pidió corregir la confusión entre Disponible, borrador respaldado y publicación. Alcance local del sitio; no autoriza una nueva publicación por sí solo. No SQL ni cambios productivos de precios/platos/estados, no coordinación externa ni pedidos/pagos/correos.

## Cambios

- Precio válido antes de habilitar Ofrecerlo en Arma tu plan. Agregar precio no activa nada por sí solo. Vaciar/invalidar precio desmarca la intención de publicación; borradores antiguos marcados disponibles sin precio se recuperan en estado seguro, sin perder su contenido.
- Estado actual en la tienda obtenido de la ficha persistida, separado de los cambios del formulario. El respaldo automático dice Borrador/Sin publicar, nunca Guardado a secas. Acciones explícitas Guardar y publicar, Guardar sin publicar o Guardar y ocultar.
- Mensajes de éxito sólo tras respuesta de guardado, con publicación/no publicación diferenciadas. Error conserva borrador y nunca muestra éxito. Precio inválido recibe foco y explicación junto al campo. Formulario bloqueado durante guardado para evitar edición perdida o doble envío.
- Listado con estado no interactivo, Falta precio y acciones separadas Completar precio/Publicar/Ocultar. Completar precio abre/focaliza el campo, sin publicación accidental. Publicar revive el indicador interno is_active si era una ficha antigua inactiva; sigue la misma validación transaccional existente.
- Volver, cerrar administración o cambiar módulo con cambios pendientes requiere decisión: guardar, seguir editando o volver sin aplicar. Diálogo nativo accesible, Escape cancela sin cerrar capas inferiores, sin cierre accidental por fuera. Aviso beforeunload al recargar/salir mientras se edita.
- Selector público se refresca inmediatamente al confirmar guardado/visibilidad en la misma sesión. No altera composición6/24, precios, carrito/pagos ni lectura del inventario.
- Recuperación de borradores bajo detalle desplegable; cabecera y acciones ajustadas a390px. Sin texto vertical/truncado que oculte Sin publicar. Controles/títulos/errores accesibles, foco visible y targets44px.

## Evidencia

PASS test-mealprep-publication y test-mealprep-library-access. Build Vite final PASS (bundle existente grande; avisos de medios runtime conocidos). Navegador app completa en3127 con sesión/REST/API sintéticos: precio inválido no llega a persistencia; precio solo no activa; estado borrador no parece publicado; Escape/salida conservan;503 simulado conserva borrador y no publica; reintento confirma y refresca selector; nutrición original intacta; ocultar/publicar listado; guardar desde diálogo vuelve a biblioteca; borrador antiguo sin precio recuperado desmarcado/deshabilitado.390px y1440px; estado cabecera316×42 sin overflow.404de medios del fixture y503intencional no son fallos productivos.

Capturas y recibo QA en R:/Entregables-Codex/Fullness-Publicacion-Clara-20261103. Revisadas visualmente06-editor-compacto-movil.png,07-borrador-antiguo-protegido.png,03-salida-protegida-movil.png y05-listado-escritorio.png. No se inició sesión como Cecilia en producción ni se publicaron sus borradores. Las capturas son QA, no producción.

Contexto local transitorio, importación central pendiente. WIP de CLI/runtime/sesiones excluido. Commit local de este lote, sin push/deploy hasta autorización explícita.
