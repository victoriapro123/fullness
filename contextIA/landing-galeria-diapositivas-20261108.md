# Galería de diapositivas del local — 8 de noviembre de 2026

Carlos pidió sustituir la presentación de fotos por una galería profesional de diapositivas. Esta orden actualiza la diagramación anterior del local, sin autorizar publicación. El instructivo de Cecilia definía exterior principal y complementarias en escritorio y permitía galería deslizable en móvil. Las seis fotos corresponden al encargo posterior de Carlos y se conservan sin alterar.

## Implementación

Checkout Fullness existente: `C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/fullness-autonomy-release-main-20261102/app`. Se conserva el checkout actual, sin crear ramas ni chats.

`LocalGallery` ahora presenta una diapositiva protagonista, miniaturas, contador, flechas y ampliación en diálogo. El recorrido es circular; admite flechas de teclado, Inicio/Fin y Escape con recuperación del foco. El desplazamiento horizontal es nativo, con scroll-snap, y respeta movimiento reducido. Las fotos principales y ampliadas se muestran completas mediante object-fit: contain. Las miniaturas tienen recorte visual; no se modifican archivos originales.

En escritorio las miniaturas forman una tira lateral. En móvil pasan debajo de la foto y la altura se limita según la pantalla. Las flechas quedan al comienzo del pie para evitar el botón flotante de WhatsApp. Se usan fuentes y variables cromáticas originales, sin dependencias nuevas. Se retiró el CSS del mosaico anterior para evitar reglas enfrentadas.

El backoffice sigue usando el mismo repositorio y la misma tabla; su vista previa utiliza el componente nuevo. Se actualizó la explicación de la foto de apertura. No hay cambios de autenticación, permisos, contrato de datos, SQL ni fotografías. No se publica y no se modifica la tienda.

## Validación y límites

- Build Vite final PASS con Node 24. Advertencia preexistente del tamaño del bundle; sin cambios de dependencias/configuración.
- Navegador interno, aplicación local y seis fotos reales: miniaturas, flechas, recorrido circular, Inicio/Fin, ampliación, cierre con Escape y retorno del foco PASS.
- Anchos efectivos observados: escritorio 1265 px y móvil 375 px dentro del marco de 390 px con scrollbar. Ningún desbordamiento horizontal. No se atribuye al intento de viewport override una dimensión que el DOM no confirmó; se restableció el override.
- Editor real contra PostgreSQL aislado: ordenar, quitar la foto activa, vista previa, guardar y recargar PASS. Sin escrituras productivas.
- Componente con 0, 1 y 12 fotos PASS. Miniaturas de 12 con scroll interno y altura de foto constante. Una foto oculta controles redundantes; cero fotos no presenta un recuadro vacío.
- No se repitieron pruebas previas de RLS/carga, cuyo contrato no cambió. No se certifica Safari ni gesto táctil en un teléfono físico; la galería usa desplazamiento horizontal nativo.
- Capturas y recibo de comprobaciones: `R:/Entregables-Codex/Fullness-Landing-Cecilia-20261107/Galeria-diapositivas-20261108/`.

El servidor local 3150 y las vistas de escritorio/móvil quedan disponibles para Carlos. El backend de QA aislado 3149 se detiene al cerrar las pruebas. No push, CI remoto, deploy ni publicación. WIP excluido: contexto previo de hover, supabase/.temp, runtime y .playwright-cli.

Cerebro: se revalidó el contrato local de transición, que declara consulta central no operativa. Se conserva este registro transitorio, sin afirmar importación central.
