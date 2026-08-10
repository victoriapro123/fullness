# Auditoría tipográfica — correo Cecilia (2026-08-09)

Al contrastar las capturas del correo con la tienda publicada, revisar antes de editar:

## Correcciones objetivas aplicadas

- Usar `SIN ULTRA PROCESADOS` (dos palabras), como en la referencia visual; no `SIN ULTRAPROCESADOS`.
- Corregir tildes de contenido de menús: `ENERGÉTICO`, `PROTEÍNA`, `PROTEÍNAS` y `PURÉ`.
- Escribir el nutriente como `OMEGA-3`, con guion, de manera consistente en etiquetas y fichas.
- Revisar nombres de platos: `Salmón sous vide al jengibre con ensalada de quinoa y lentejas al cilantro y menta` requiere la conjunción `y`.
- En etiquetas largas, conservar separadores entre beneficios para que no se presenten como una frase corrida.

Aplicado el 2026-08-09 en Supabase:

- 6 registros de `menu_items` y sus instantáneas de menú.
- 14 registros reutilizables de `meal_library_items`.
- La definición editorial de beneficio `Omega-3`.

También se corrigieron los valores de desarrollo y semilla para que una carga nueva no reintroduzca tildes, separadores ni formas anteriores.

## Convenciones aprobadas que no se deben corregir por error

- `Mealprep` / `Mealpreps` es el término de marca usado en las referencias.
- `Antinflamatorio` se escribe con una sola `i` tras `anti`.
- `Como es adentro, es afuera.` no requiere tilde en `Como` en ese uso enunciativo.

## Requieren confirmación de Cecilia (no son erratas)

- Métricas de la portada de planes: las referencias muestran 6 proteínas y 6 acompañamientos; una versión local había mostrado 5. La publicación actual muestra 6.
- Titular de landing versus titular de Planes: responden a secciones distintas; no reemplazar uno por otro.
- Cambios en navegación (`Cómo funciona`/`FAQ` versus `Comunidad`/`Backoffice`) son decisiones funcionales, no tipográficas.
