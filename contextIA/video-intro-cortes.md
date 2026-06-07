# Video Intro: Cortes Detectados

Este documento registra los dos cortes visibles del video introductorio anterior al hero. La UI actual ya no depende de esos cortes para mostrar contenido largo: los usa como parte del lenguaje tecnologico general, con tags breves apilados a la izquierda que encienden uno a uno con titileo e iluminacion, permanecen y luego se reordenan como piezas del hero.

## Corte 01: Llegada Al Plato

- Momento aproximado del archivo de video: entre 9.35s y 11.20s.
- Momento aproximado dentro de la animacion de 4 segundos: alrededor de 2.5s a 3.0s.
- Percepcion visual: el plato termina de entrar y hay un cambio brusco de composicion/posicion.
- Uso en UI: se sostiene el lenguaje de tags tecnologicos simples, con fondo transparente, borde blanco y texto breve.
- Mensaje visible asociado al sistema actual: `Antiinflamatorio`, `Nutrientes`, `Origen de calidad` y `Energia real`.

## Corte 02: Rebote Del Plato

- Momento aproximado del archivo de video: entre 12.15s y 14.20s.
- Momento aproximado dentro de la animacion de 4 segundos: alrededor de 3.2s a 3.8s.
- Percepcion visual: el plato rebota o se asienta y el movimiento pierde continuidad por un segundo.
- Uso en UI: los tags permanecen durante la animacion y no agregan descripciones extensas sobre el video.
- Al llegar al hero: los mismos conceptos se apilan a la izquierda como bloque estable debajo del boton `Ver mas`, con fondo totalmente transparente.

## Criterio Visual

- Estetica tipo tecnologia editorial simple: una palabra o frase breve dentro de un cuadro blanco lineal.
- En intro, no usar glass templado, blur ni fondo opaco. Los tags deben ser transparentes, mas grandes y ubicados a la izquierda. En hero, fondo 100% transparente.
- Los tags deben empezar despues del segundo 1 y aparecer secuencialmente, con titileo e iluminacion blanca suave. Respetar `prefers-reduced-motion`.
- El boton `Ver mas` debe tener el mismo ancho que los cuadros tecnologicos y debe quedar separado de ellos, sin superposicion.
- Los cuadros del intro deben reordenarse como piezas permanentes del hero al terminar la animacion.
- Desde el hero no se puede volver al video ni al tramo negro con scroll. El regreso intencional se hace solo con el boton `Volver a la animacion`, que reabre y resetea el intro.
- Mantener los overlays como informacion de marca/producto; nunca mostrar notas internas o explicaciones de desarrollo en la UI.
- Si se reemplaza el video por una version sin cortes, revisar si estos overlays siguen aportando o si deben moverse a otro momento.
