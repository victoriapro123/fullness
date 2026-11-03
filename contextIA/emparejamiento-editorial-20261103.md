# Emparejamiento editorial de mealpreps

Carlos autorizó emparejar coincidencias, incluir diferencias menores y publicar esas preparaciones desde este chat, sin coordinar con Core360 ni crear ramas/hilos. Se trabaja sobre el checkout existente del sitio publicado, conservando íntegro el WIP del directorio canónico. No se crea ninguna rama nueva; destino autorizado main/Fullness Production.

## Datos aplicados y verificados

Ocho vínculos explícitos de producto y referencia de carta a biblioteca: 01 salmón/curry de lentejas, 02 hamburguesas pavo Thai, 04 estofado, 07 pollo arvejado, 08 pollo a la King, 09 croquetas de garbanzo, 11 Apple Curry y 14 merluza/Quinoa Crispy. Apple utiliza la ficha e1286918-9d09-4f64-95a7-781181977948 cuya descripción corresponde al puré de zanahoria; el duplicado anterior se conserva sin editar.

Se copian como contenido editorial actual fotos, descripción, ingredientes y alérgenos. La FK se persiste en menu_items y stock_letter_items. No se copian cantidades por envase, valores nutricionales ni tamaños de porción. No se declara sincronización automática futura entre los dos editores: se conserva el vínculo y se identifica la versión editorial utilizada. Los precios y el inventario pertenecen al producto vendible, no a la biblioteca.

Se mantienen ocultos siete productos: 03,05,06,10,12,13,15. Los que no tienen receta no se inventan; falafel con peperonata no se equipara a ensalada de pera, crepe vegetal no se equipara a salmón/feta, coliflor vegetariana no hereda pavo y pastelera de choclo no se confunde con zapallo/albahaca. Todos conservan sus datos y existencias.

Aplicación vía API administrativa propia, con lectura fresca, comparaciones de versión/updated_at/cantidades/reservas, intención durable privada y registro de cada efecto. Motivo fijo modificado en web, ejecutor técnico service_role, sin actor humano inventado. No se modifica la biblioteca, no se cambian nombres/precios, no se escriben cantidades ni reservas. Resultado: 8 vinculados/publicados, 7 ocultos, total de 325 porciones conservado, reservas 0; 175 porciones corresponden a los 8 publicados.

Backup focal, intención, pasos y comprobante: R:/Entregables-Codex/Fullness-Emparejamiento-20261103/681557bb-be91-4449-967e-5edf3e0ee377/Plan.json, Journal.json, After.json y Receipt.json. No se repite el intento de escritura: ante duda se reconcilia la lectura. Helper local de autoría en el proyecto canónico scripts/pair-mealprep-editorial.mjs.

## Ajuste de aplicación y validación

La API pública omite productos ocultos; la administración conserva los 15. Los identificadores de receta devueltos son los persistidos, ya no un null fijo. Un producto publicado sin stock sigue apareciendo como agotado, sin habilitar compra.

Prueba focal scripts/test-sale-editorial-visibility.mjs PASS: identidad editorial, exclusión pública de ocultos, agotados y conservación del inventario administrativo completo. Build PASS 2.34s, sólo aviso conocido de tamaño de bundle. No nueva migración/esquema ni revisión de QA histórico/Core. Despliegue y comprobación pública se acreditan en el recibo final, no por este documento.
