# DIAGNÓSTICO DE RESOLUCIÓN DE LA INTRO MÓVIL

Fecha: 2026-08-30

## Evidencia observada

- La intro móvil usa 160 cuadros WebP de `720×405` en `src/assets/scroll-intro-frames-mobile/`; la secuencia de escritorio usa los mismos 160 cuadros a `1280×720`.
- La variante móvil fue una decisión explícita de memoria: pesa `3,81 MiB` en archivos frente a `8,52 MiB` de escritorio y evita decodificar los cuadros mayores en teléfonos.
- En móviles se pinta un canvas vertical de pantalla completa con `cover`. En una ventana de `390×844`, un cuadro de `720×405` se amplía aproximadamente `2,08×` en alto antes de ser recortado lateralmente.
- El canvas asigna su buffer con `clientWidth` y `clientHeight` sin considerar `devicePixelRatio`. En pantallas retina el compositor debe ampliar además ese buffer, lo que acentúa la suavidad visible.
- El MP4 fuente publicado también es `1280×720` H.264. Exportarlo a un archivo más grande desde esa copia no crearía detalle nuevo.

## Conclusión

No es necesario rehacer el movimiento ni el montaje de la animación. Hay una mejora viable de entrega y renderizado: conservar los mismos 160 cuadros, corregir el canvas para alta densidad y preparar una variante móvil de mayor resolución o encuadre vertical.

Para una mejora realmente nítida en teléfonos de alta densidad se necesita el máster original o el proyecto de render anterior a la exportación `1280×720`. Si sólo existe ese MP4, se puede mejorar bastante el resultado técnico, pero no recuperar detalle real de una fuente 4K inexistente.

## Corrección aplicada

- Los teléfonos hasta `860 px` ahora reutilizan los cuadros existentes de escritorio `1280×720`, no los cuadros reducidos a `720×405`.
- El canvas usa `devicePixelRatio` limitado a `2`, por lo que la imagen se pinta en un buffer de alta densidad en vez de ser ampliada por el compositor.
- Para compensar el mayor tamaño de cada cuadro, el buffer móvil baja a 12 cuadros anteriores y 20 posteriores. La animación conserva sus 160 pasos y su ritmo.

## Límite conocido y siguiente mejora

El arreglo aumenta de manera material la nitidez sin rehacer el movimiento. Para alcanzar detalle nativo de teléfonos retina modernos todavía conviene recuperar el máster anterior a la exportación `1280×720` y reexportar desde allí una variante móvil vertical; nunca escalar los WebP reducidos existentes.
