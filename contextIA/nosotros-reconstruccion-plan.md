# Reconstruccion Controlada De Nosotros

## Objetivo

Reconstruir la pagina `/quienes-somos` como una pieza editorial coherente con Fullness Lab, a partir de las fotografias e ilustraciones finales entregadas por Cecilia. La prioridad es composicion, lectura y comportamiento responsive; no reinterpretar ni generar imagenes nuevas.

## Insumos Esperados

- Retrato principal de Cecilia para el hero.
- Fotografia de Cecilia cocinando para el bloque de origen.
- Ilustracion botanica transparente para el lado izquierdo del hero.
- Ilustracion de betarraga transparente para el extremo derecho del bloque claro.

Los assets entregados se usan tal cual, preservando proporcion y transparencia. No crear mascaras, recortes artificiales ni fondos generados si la pieza original ya tiene alfa real.

## Composicion A Implementar

1. Hero oscuro: retrato de Cecilia al lado derecho; copy a la izquierda; gradiente de luz/sombra que conecte fotografia y copy; una sola ilustracion botanica tenue a la izquierda. No usar ilustracion en el costado derecho.
2. Bloque claro de origen: foto de cocina en una columna; relato de origen en la otra; betarraga transparente al extremo derecho, atras del copy y sin invadir lectura.
3. Pilares y relato: conservar el contenido aprobado, con una jerarquia tipografica editorial y ancho de lectura controlado.

## Responsive

- Desktop: dos columnas claras y capas decorativas subordinadas al contenido.
- Tablet: conservar la relacion imagen/copy, reduciendo primero escala y opacidad de ilustraciones.
- Movil: apilar foto y copy; ilustraciones solo en bordes, con menor opacidad; ningun elemento funcional o texto puede quedar bajo una capa decorativa ni generar scroll horizontal.
- Validar siempre 1440 px, 1024 px, 768 px y 390 px antes de aprobar.

## Protocolo De Implementacion

- No sumar otra hoja CSS final. Consolidar el estilo de Nosotros en una unica hoja dedicada y una sola importacion.
- Eliminar o archivar reglas incompatibles antes de aplicar la composicion final: actualmente existen capas heredadas que apuntan a clases `about-portrait-*` mientras el componente activo usa `about-editorial-*`.
- Mantener el texto aprobado sin reescrituras; los cambios son visuales y estructurales.
- Hacer build y revision visual antes de commit/push. No publicar hasta que se revisen los assets finales integrados.

## Implementacion Vigente

- La pagina se reconstruye con el bloque `about-v2` en `src/main.jsx` y una unica hoja canonica: `src/about-nosotros.css`.
- Los PNG originales con transparencia se copian a `src/assets/about/` y se usan sin reconstruir fondos, bordes ni mascaras.
- Las hojas experimentales anteriores de Nosotros no se importan en la aplicacion; se conservan fuera del flujo hasta que se apruebe la version definitiva.
- El hero ilumina de forma calida y contenida la zona del copy. No aplicar una veladura adicional sobre Cecilia: la fotografia conserva su exposicion natural y el contraste para la lectura se resuelve desde el lado del copy.
- El retrato activo del hero es `src/assets/cecilia-salas-fullness-hero-v2.png`: una edicion horizontal 1672 x 941 generada a partir de la fotografia entregada, preservando a Cecilia y la escena, con espacio editorial a la izquierda. La version anterior se conserva como respaldo y no se sobrescribe.
- En el bloque claro de origen, la betarraga se mantiene al extremo derecho y se eleva 50% respecto de su anclaje inferior inicial para acompañar visualmente el titular sin invadir el copy.
