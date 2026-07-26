# Estabilidad Del Proyecto Fullness

## Regla de trabajo desde 2026-07-25

- Antes de nuevos cambios visuales, comprobar la pagina y selector afectados en el navegador y localizar la regla CSS final que gobierna esa pieza.
- No agregar nuevas hojas `final`, imports duplicados ni bloques de overrides para resolver una iteracion visual. Consolidar la regla existente o aislar una pagina en una unica hoja dedicada.
- Hacer una sola tarea visual acotada por turno: implementar, verificar en los breakpoints relevantes, compilar y recien despues aceptar otro ajuste.
- No mezclar cambios visuales con modificaciones de datos, backoffice, migraciones o assets no relacionados en un mismo commit.
- Si el hilo repite mensajes de reanudacion o no completa herramientas, detener la iteracion y abrir una tarea limpia con contexto resumido; no continuar agregando cambios sobre estado incierto.
- Para cambios de precio, verificar el recorrido completo: formulario Backoffice -> persistencia Supabase -> recarga de datos publicos -> precio renderizado en tienda.

## Arquitectura consolidada el 2026-07-25

- `src/landing-meal-prep.css` es la unica fuente de estilos para el modulo `#calentar` del landing.
- `src/about-nosotros.css` es la unica fuente de estilos para la pagina Nosotros activa (`about-v2`).
- `src/landing.css` contiene el resto del landing.
- `src/commerce.css` contiene Planes, catalogo, fichas de producto, checkout y comercio.
- `src/community.css` contiene la pagina Comunidad.
- `src/account-backoffice.css` contiene cuenta, administracion y herramientas tecnicas.
- `src/overlays.css` contiene lightboxes y capas modales de campanas/productos.
- `src/faq.css` contiene Preguntas frecuentes.
- `src/styles.css` queda reservado para tokens, reset, header, menu movil, footer y utilidades globales compartidas.
- El orden de imports en `src/main.jsx` define la cascada. No volver a copiar reglas de un modulo al final de `styles.css`.

## Limpieza realizada

- Se retiraron de `src/styles.css` los selectores historicos de cada dominio que ya tiene modulo propio.
- Se eliminaron `about-final.css`, `about-nosotros-final.css`, el componente no utilizado `NosotrosEditorialPage` y la copia `nosotros-direccion-visual-final.md`.
- `contextIA/nosotros-direccion-visual.md` queda como documento unico de direccion visual de Nosotros.
- `src/styles.css` bajo de 22.407 a unas 1.720 lineas.
- Se eliminaron reglas duplicadas, declaraciones anuladas por una regla posterior y selectores confirmados como huerfanos. Las clases de estado construidas dinamicamente (`is-paused`, `is-cancelled`, señales del hero y resultados de pago) se conservaron de forma intencional.
- El bundle CSS de produccion bajo de aproximadamente 365 kB / 65,6 kB gzip a 246 kB / 42,9 kB gzip.
- Los scripts `extract-css-module.mjs`, `prune-css-selectors.mjs`, `prune-duplicate-css-declarations.mjs` y `prune-overridden-css-declarations.mjs` hacen repetible la limpieza mecanica.

## Correcciones funcionales detectadas durante la limpieza

- La tienda puede mostrar planes demo cuando Supabase no entrega planes activos. Esos productos ahora tambien se indexan por slug, de modo que `Ver menu`, el lightbox y `/producto/:slug` siguen funcionando; un producto remoto con el mismo slug reemplaza al fallback.
- El lightbox de producto movil usa una sola superficie de scroll vertical y no crea scroll horizontal interno.
- Menu movil, footer, acceso de miembros y formularios de suscripcion mantienen areas tactiles de al menos 44 px.
- El carrusel familiar movil conserva tarjetas legibles sin provocar overflow del documento.

## Deuda residual controlada

- Landing, comercio, Comunidad y overlays aun conservan `!important` heredados. Estan aislados por dominio y verificados visualmente; no retirarlos de forma masiva. Reducirlos solamente al editar el componente correspondiente y con QA antes/despues.
- `src/main.jsx` sigue siendo grande. La proxima refactorizacion estructural razonable es extraer paginas/componentes React por dominio, sin mezclarla con una solicitud visual del cliente.
