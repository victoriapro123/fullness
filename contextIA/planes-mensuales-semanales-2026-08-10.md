# Planes mensuales compuestos por semanas — 2026-08-10

## Decisión vigente

Esta decisión reemplaza cualquier instrucción anterior que permitía armar un plan mensual copiando mealpreps desde un plan semanal.

- Un plan **mensual** está compuesto por exactamente **4 planes semanales** ordenados.
- Un plan **semanal** contiene exactamente **6 mealpreps** distintos.
- El mensual no guarda ni duplica los 24 mealpreps en `menu_items.included_items`; los muestra por lectura desde sus semanas vinculadas.
- Los planes semanales existentes son datos reales. No se deben reescribir para migrar la estructura mensual.

## Persistencia y trazabilidad

- Las migraciones aplicadas son `20260810001000_monthly_plan_weeks.sql` y `20260810002000_harden_weekly_plan_nutrition_tags.sql`.
- `monthly_plan_weeks` registra `monthly_plan_id`, `weekly_plan_id`, `week_position` (1 a 4), fechas y autoría de creación/actualización. Una semana no puede repetirse dentro del mismo mes.
- La RPC administrativa `replace_monthly_plan_weeks(uuid, uuid[])` reemplaza las cuatro relaciones de manera atómica. No hay política RLS de escritura directa desde cliente.
- Los triggers impiden publicar una semana con una cantidad distinta de seis mealpreps, publicar un mensual con menos de cuatro semanas visibles o ocultar una semana usada por un mensual visible.
- La visibilidad usa el campo existente `menu_items.is_active`: en la interfaz se comunica como **Visible** u **Oculto**. El backoffice conserva ambos estados; la tienda pública sólo lee los visibles.
- Antes de aplicar la migración se generó un respaldo de esquema y datos en `backups/`, ignorado por Git, y se comprobaron sus checksums. Los scripts de respaldo y preflight quedan en `scripts/`.

## Nutrición, tags y beneficios

- La ficha nutricional, alérgenos, retermalización, tags y beneficios pertenecen al mealprep de biblioteca y al snapshot de cada semana, no al mensual.
- `weekly_plan_nutrition_tags` y `monthly_plan_nutrition_tags` deduplican tags al leer. Primero usan la ficha canónica de `meal_library_items`; si falta la referencia de una semana histórica, usan el snapshot embebido como compatibilidad.
- La vista semanal tolera una semana borrador heredada con `included_items` JSON no-array tratándola como composición vacía; no modifica ni borra ese dato.
- El mensual agrega beneficios y tags desde sus cuatro semanas sin guardar una copia propia.

## Experiencia de backoffice

- El editor de mensual tiene cuatro slots ordenables para asignar, quitar o reordenar semanas existentes.
- Desde un mensual se puede abrir `Crear plan semanal` como capa hija. Al guardarlo, la nueva semana queda asignada al mensual padre; al volver sin guardar, ambos borradores quedan protegidos.
- Los borradores usan la protección existente: copia inmediata local y copia remota en `backoffice_drafts` cuando hay sesión administrativa. Un mensual incompleto (0 a 3 semanas) permanece como borrador y no se publica ni se persiste como relación parcial.
- Las capas de edición no se cierran por click fuera. La alta rápida de tag/beneficio también bloquea el backdrop y detiene la propagación hacia la capa padre; X, Cancelar y Escape siguen siendo acciones explícitas.

## Experiencia pública y checkout

- La tienda segmenta el catálogo en **Mensual**, **Semanal** y **Familiar**.
- La primera capa de una card muestra sólo foto, descripción capitalizada, iconos de beneficios compactos sin texto, porciones, precio oscuro, `Ver menú` y el CTA del formato.
- La navegación pública sigue el orden mensual → semana → mealprep, con regreso a la capa anterior.
- El carrito y Mercado Pago guardan una instantánea trazable del mensual: sus cuatro semanas, posición, identificadores, nombres y mealpreps; no una lista plana duplicada.
- Los títulos se presentan en mayúsculas con locale `es-CL`; los eyebrows también; las descripciones se muestran capitalizadas sin modificar el dato de origen.
- El ajuste aprobado del hero de Planes (caja levemente a la izquierda y brócoli/asset botánico saliendo hacia la derecha) se conserva sin duplicar estilos.

## Evidencia de validación

- Preflight remoto: 0 mensuales existentes y 4 semanales activos válidos de seis mealpreps.
- Post-migración remoto: tabla, RPC y ambas vistas de tags disponibles; ningún plan semanal fue modificado.
- `npm run qa:catalog`, `npm run qa:parameters`, `npm run qa:nutrition-scope` y `npm run build` aprobaron durante esta implementación.
- Se recorrió en navegador local el flujo Mensual → Semana 1 → Mealprep → volver a Semana → volver a Mensual, además de los tres segmentos del catálogo.
- Para QA REST, confirmar que la fuente runtime del Vault apunta al URL de Fullness. Una fuente de gestión puede aportar el token DDL correcto pero tener variables runtime de otro proyecto; nunca mezclar ambas al validar catálogo.
