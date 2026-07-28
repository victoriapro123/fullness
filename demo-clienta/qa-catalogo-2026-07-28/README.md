# QA de catalogo y backoffice - 2026-07-28

## Resultado

QA aprobado contra Supabase y R2 de produccion. Los registros, cuenta e imagen creados para la prueba se eliminaron al finalizar.

## Flujos verificados

- Carga de 12 beneficios ilustrados y 12 tags desde Supabase.
- Creacion y edicion de un plato reutilizable desde la UI.
- Subida real de fotografia a R2.
- Guardado de ingredientes, nutricion JSON, tag, beneficio y explicacion libre.
- Reutilizacion del plato en un producto familiar mediante `library_meal_id`.
- Herencia de fotografia, nutricion, tags y beneficios.
- Precio entero sin redondeo: `$12.345`.
- Edicion reversible del plan semanal: `$58.200 -> $58.201 -> $58.200`.
- Eliminacion desde UI de producto familiar y plato temporal.
- Lightbox de beneficio en escritorio y movil.
- Detalle familiar con informacion nutricional.
- Cards de planes, platos y familiares en escritorio.
- Carruseles tactiles y lightboxes dedicados en 390 x 844.

## Evidencias

- `01` a `05`: tienda y beneficios en escritorio.
- `06` a `09`: planes, platos y beneficio en movil.
- `10`: modulo de Parametros del backoffice.
- `11`: carrusel de familiares en movil.
- `12`: detalle familiar y nutricion en movil.
- `13`: iconos integrados al papel editorial, sin recuadros, en escritorio.
- `14`: lightbox de beneficio sin fondo cuadrado.
- `15`: iconos integrados al papel editorial en movil.
- `16`: lightbox movil sin fondo cuadrado.

## Verificaciones automatizadas

```text
qa:parameters       APROBADO
qa:nutrition-scope  APROBADO
qa:catalog          APROBADO - 4 productos activos
vite build          APROBADO
git diff --check    APROBADO
```
