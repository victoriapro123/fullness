# Fotos de mealpreps y hover — 2026-11-04

Carlos pidió intercambiar principal/secundaria en todos los mealpreps y corregir el hover faltante en Arma tu plan.

Datos productivos: SQL único en Supabase Fullness allyjctrrtvibwchjouu, main Production, por sesión existente del navegador interno (MCP SQL sin permiso). Intercambiados photo_url/secondary_photo_url y sus storage_path en las 25 fichas de meal_library_items con ambas fotos. No cambios de precio, disponibilidad ni contenido. Proyección existente al menú mediante trigger. Consulta devolvió 25 filas afectadas; API pública comprobada contra snapshot previo local: los 8 platos publicados tienen ambas URLs exactamente invertidas. No repetir el UPDATE: es una operación reversible que volvería a intercambiarlas.

Código local en checkout existente fullness-autonomy-release-main-20261102/app: CustomPlanBuilder ahora monta ambas fotos en marco 4:3 estable, secundaria con transición al hover de tarjeta y focus-within, sin duplicar imagen cuando falta secundaria; respeta reduced-motion. Antes sólo renderizaba photoUrl aunque API ya entregaba secondaryPhotoUrl.

Validación: build Vite PASS; navegador local con datos públicos, ambas fotos cargadas y secundaria opacity=1 al foco dentro de tarjeta. Inspección visual de tarjetas y marco; hover CSS implementado, sin certificar interacción mousemove automatizada. Avisos preexistentes de bundle/medios runtime. Sin push ni deploy: pendiente publicar la corrección de código. Intercambio de datos sí aplicado. WIP CLI/runtime ajeno preservado. Consulta/importación Cerebro central pendiente según transición local.
