# DETALLE MENSUAL Y PALETA DE E-COMMERCE

Fecha: 2026-08-12

## Vista de usuario

- Al abrir un plan mensual, la experiencia muestra sus cuatro semanas cerradas y los seis mealpreps de cada una: 24 platos visibles en total.
- Cada plato abre únicamente su ficha de detalle. El usuario sigue comprando el plan mensual completo; no puede combinar platos entre semanas.
- La organización semanal se mantiene visible para que el origen de cada plato sea trazable.
- Cada semana presenta seis imágenes parejas (3×2 en escritorio y 2×3 en móvil), sin etiquetas nutricionales ni títulos permanentes. El nombre aparece sólo en hover o foco, alineado al borde superior para conservar visible el inicio de nombres extensos; el alcance del estilo incluye el lightbox montado fuera de la ruta de tienda. El CTA `Ir a la semana` queda debajo de los seis platos como la siguiente capa de navegación, con fondo oscuro de la paleta y texto claro.

## Paleta y header

- El header de escritorio y móvil usa el mismo fondo ciruela opaco de la paleta de Cecilia: `#2A1422`.
- Ningún fondo usa negro absoluto: las superficies oscuras de tienda, landing, comunidad, FAQ, overlays y footer usan el negro operativo `#151515` o una transparencia de ese mismo color.
- Los enlaces textuales del footer usan el mismo palo de rosa `#A98880` de la navegación; el hover conserva el eucalipto. En móvil, los fondos oscuros de `main` y sus secciones heredan explícitamente `#151515`, evitando los valores casi negros heredados.
