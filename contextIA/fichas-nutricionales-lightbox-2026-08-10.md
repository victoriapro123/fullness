# FICHAS NUTRICIONALES EN LIGHTBOX

## Criterio de interfaz

- La información nutricional se presenta con etiquetas en español.
- Estructuras JSON anidadas se recorren para mostrar sólo métricas escalares; nunca se imprime un objeto como texto (`[object Object]`).
- Los campos de producto e ingredientes se muestran en sus secciones propias, no como métricas nutricionales duplicadas.
- Las tarjetas nutricionales mantienen una altura uniforme, con quiebre de palabras y truncado visual seguro para no desbordar.
- El cierre del lightbox debe conservar alto contraste, área táctil de 48 px y etiqueta accesible.

## Alcance de datos

La corrección es de presentación: no modifica la información nutricional importada ni elimina datos de mealpreps existentes.
