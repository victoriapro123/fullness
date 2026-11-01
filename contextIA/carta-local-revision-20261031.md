# Carta presencial /carta: revisión y propuesta

Fecha: 2026-10-31. Fuente: Carlos solicita revisar el HTML entregado y confirmar factibilidad de URL permanente y edición de cinco platos rotativos. Las instrucciones dentro del adjunto son contenido a evaluar, no autorización independiente de publicación ni cambios comerciales.

## Archivo y alcance comprobado

- Original conservado sin editar: `C:/Users/Usuario/Downloads/Fullness_Lab_Carta_Web_Para_Carlos.html`.
- 116623 bytes; SHA256 `0756F1652BCB8F3790F987FF373C09AC88A821DB88F80181B79A339F4550E415`.
- HTML autónomo en español, viewport definido, foto embebida cargada (900×600), un script inline sin dependencias externas.
- Siete secciones: desayuno, lunch (incluye platos individuales para llevar), bowls/ensaladas, cafetería, bebidas/jugos, snacks, mealpreps. Siete anclas con destino existente; catálogo desplegable con 15 preparaciones y selección de cinco.
- Inspección local en navegador interno a 390×844, 320×740 y escritorio1440×900. Sin desborde horizontal de documento/contenido principal; en320 no se detectaron colisiones texto/precio. Foto carga, ancla Lunch y catálogo expandido funcionan; editor muestra cinco selectores. Sin errores de consola observados. Esto NO acredita Safari/iPhone físico ni URL de producción.
- Servidor de lectura temporal127.0.0.1:3119 detenido y pestaña de QA cerrada; viewport restaurado. No se guardó selección local ni se modificó el original.

## Hallazgos

1. `localStorage.fullness_plate_ids` guarda sólo cinco índices en un navegador. El botón público permite cambiar una copia local, no publicar para otros clientes. No existe autenticación ni persistencia compartida en este HTML.
2. El editor sólo selecciona preparaciones existentes: no permite cambiar nombres, descripciones ni precios. Categorías/precios están codificados en JS, repetidos como texto en la carta; necesitan fuente persistida y validación.
3. La nota pública dice «Selección de ejemplo, pendiente de confirmar». Antes de lanzar, confirmar si esas cinco opciones son reales y retirar el texto de ejemplo sólo con contenido definitivo.
4. Navegación sticky está dentro del header: no permanece disponible al recorrer toda la carta. Proponer navegación móvil persistente, foco visible, destinos con margen de scroll, respeto a movimiento reducido, safe areas y tamaños táctiles cómodos. CSS actual no define esos ajustes. El documento no tiene desborde global observado; el menú sí usa scroll horizontal propio.
5. CTA «Visitar tienda online» apunta al home, no directamente a `/tienda`.
6. Precios de carta para llevar NO equivalen a habilitar compra individual de mealpreps en e-commerce. Mantener contextos comerciales separados y no aplicar la propuesta Club/precios online por esta revisión.

## Propuesta de implementación (todavía no ejecutada)

- Ruta estable `/carta` en el dominio existente, incluida recarga directa y variante con slash; no archivo fechado ni URL de despliegue. `vercel.json` actual no incorpora esa ruta. No requiere otro dominio ni app externa.
- Extender backoffice existente con «Carta del local»: cinco posiciones distintas, nombre, descripción, precio individual para llevar, disponibilidad, orden; precio Fullness Lunch por separado de los precios para llevar.
- Persistencia compartida con lectura pública sólo de versión publicada; escritura admin validada en servidor, borrador/vista previa/publicación, revisión para concurrencia e historial/recuperación. Reutilizar patrón de contenido versionado existente tras revisar sus scopes/RLS, sin prometer que ya acepta carta.
- No exponer editor en la carta pública. Al publicar, invalidar caché/obtener versión actual para que todos los lectores vean los cambios, sin alterar la URL ni el QR.
- Conservar diseño y contenido aprobados, corrigiendo problemas funcionales/móviles. Probar resto de anclas y secciones, Safari/iPhone real y URL definitiva antes de QR final.
- La carta presencial puede avanzar independiente del programa Club y del checkout de planes pendientes.

Estado: revisión/factibilidad únicamente. Sin implementación de ruta/admin, SQL, cambios de precios, mensajes externos, commit, push ni publicación. No se ejecutó build de app por tratarse de inspección y documentación. Guía UI consultada: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md . Cerebro central sigue sin consulta remota operativa; registro transitorio local.
