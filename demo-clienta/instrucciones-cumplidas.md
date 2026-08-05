# Instrucciones De La Clienta Cumplidas

## Identidad y portada

- Se uso una estetica elegante, oscura y natural.
- Se reemplazo el video de portada por la imagen final entregada como fondo.
- Se mantuvo el enfoque visual en comida real, ingredientes frescos y energia natural.
- Se aplico el logo oficial entregado por la clienta.
- El video introductorio se convirtió en una secuencia de 160 cuadros WebP ligada al scroll en escritorio y móvil: avanza al bajar y retrocede al subir, sin bloquear la navegación. Una flecha blanca animada indica que hay más secuencia hacia abajo y el botón `Ir a Fullness` reproduce el tramo pendiente antes de entregar el hero con una transición de dos segundos. En el recorrido manual, el último cuadro queda atrás mientras el hero sube y desaparece exactamente cuando el hero toca el borde superior; recién entonces se activa el ícono para volver a ver la animación. El hero conserva su posición sin apagarse ni repetir una segunda entrada. En teléfono y tablet, los cuadros optimizados se dibujan en un canvas persistente y el avance rellena los saltos entre eventos de scroll; `Ir a Fullness` usa esos mismos cuadros sin cambiar a video. El MP4 original queda reservado a la reproducción automática de computadores.
- Las cabeceras principales de Comunidad y Nosotros comparten con el landing la misma escala, grosor y espaciado de eyebrow, título y descripción.
- La ventana `Mealpreps / Editar` se compactó para que sus campos y fotos entren en una retícula legible; solo conserva scroll vertical y apila sus columnas antes de exceder el ancho disponible.
- El menú principal del header se alinea ópticamente con el wordmark del logo horizontal en escritorio. La navegación pasa al menú hamburguesa según el espacio real que dejan tanto el ancho como la altura del navegador, antes de montar links, usuario o controles; esto no cambia la animación correspondiente al tipo de equipo.
- En el rango iPad, el header incorpora un icono de monitor para forzar la vista de escritorio. La elección se conserva al navegar y el mismo control cambia a una tablet para volver a la vista responsive sin repetir la animación de apertura.
- En escritorio desde 1367 px, el header mide siempre el 20% de la altura útil del sitio y reserva 10% de padding interno arriba y abajo. El logo ocupa el área central disponible y la línea vertical mide 70% del header, siempre centrada. Menú y nombre comienzan al 65% de la altura del logo, y los iconos redondos se centran en el punto medio de esa línea de texto. El menú aumentó 10% de tamaño, usa peso 500 y duplicó la distancia entre sus enlaces; el usuario conserva su plantita y tipografía propia. Su contenedor no tiene caja en reposo y muestra blanco al 20% al pasar el cursor.
- La apertura ya no confunde automáticamente un notebook touch de 11 pulgadas con un iPad: Windows, ChromeOS, macOS y Linux de escritorio conservan la experiencia de computador; iPadOS y Android usan el perfil optimizado de tablet. El menú hamburguesa sigue respondiendo al ancho real para evitar elementos montados.
- El fondo de la cabecera y del menú hamburguesa es completamente opaco y usa el betarraga casi negro `#180611`, recuperado del color original del drawer móvil.
- El lightbox de suscripción ya no recorta ni desplaza contenido dentro de una ventana con altura máxima. En móvil crece con toda la información y deja los cuatro sellos debajo de los botones; en escritorio ensancha el texto hasta la mitad disponible y ubica los sellos abajo a la derecha. Si la altura no alcanza, se desplaza el conjunto completo, nunca el interior del cuadro. El eyebrow recupera el betarraga editorial `#b87878` y queda más próximo al título. Los sellos ahora son más grandes y legibles sobre una superficie negra translúcida al 20%.
- El logo del header se aumento y se ajusto a una lectura marfil/dorado suave para no verse blanco ni generico.
- Se agrego isotipo de betarraga como favicon, marca visual de secciones, marca de agua suave y footer.
- El CTA principal del hero ahora dice `Ver planes` y lleva a la oferta disponible.
- Las transiciones entre secciones usan veladuras organicas cuando ayudan a unir hero, betarraga, tienda y comunidad.

## Texto principal

- El titular quedo alineado al manifiesto aprobado:
  - "El bienestar comienza desde adentro."
- Se incorporaron frases clave de Cecilia:
  - "Nutrirse desde la raiz."
  - "No contamos calorias. Creemos en aprender a nutrirse."
  - "Como es adentro, es afuera."

## Navegacion

Se incluyeron las secciones solicitadas:

- Programas.
- Proposito.
- Oferta Fullness Lab.
- Ingredientes.
- Comunidad.
- Acceso miembros.

Se reforzo la navegacion movil con menu accesible, cierre por Escape y cierre automatico al elegir una seccion.

## Cuenta de usuario

Se creo un modal de cuenta con inicio de sesion por Supabase Auth:

- Correo electronico.
- Contrasena.
- Acceso a backoffice cuando `profiles.is_admin` esta activo para la cuenta.

## Backoffice de menus

Se implemento un backoffice inicial para menus:

- Acceso por `#backoffice` y enlace visible solo para administradores.
- Lectura y escritura protegida por `profiles.is_admin`.
- Creacion, edicion, borrado y activacion/desactivacion de menus.
- Gestion de nombre, slug, SKU, etiqueta, precio, orden, descripcion, foto, ingredientes, alergenos, descripcion nutricional y datos nutricionales JSON.
- Subida de foto al bucket `menu-photos` o uso de URL externa.
- Al guardar o borrar, la tienda publica se actualiza desde `menu_items`.

## Carrito

- Se agrego un carrito funcional.
- Los productos se pueden agregar al carrito.
- El contador del carrito se actualiza.
- El carrito ya no se abre automaticamente al agregar un producto.
- Ahora aparece una animacion/notificacion indicando que el producto llego al carrito.
- El panel del carrito tiene nombre accesible, cierre por Escape y etiquetas especificas para sumar o restar cada producto.

## Productos

Se dejaron productos de ejemplo alineados con la marca:

- Salmon, lentejas y hojas verdes.
- Pollo especiado, camote y hojas verdes.
- Salmon glaseado, arroz verde y palta.

Cada producto tiene foto de muestra servida desde Cloudflare R2, precio, descripcion y boton para agregar al carrito.

## Proposito y oferta

- Se transformo `Nuestra filosofia` en `Nuestro proposito`.
- Se integraron cuatro pilares: nutricion consciente, cocina Antinflamatoria, bienestar integral y ciencia con sabor.
- Se agrego una seccion `Oferta Fullness Lab` con tres caminos:
  - Menus preparados con CTA a tienda.
  - Meal Prep con CTA directo a WhatsApp.
  - Talleres con CTA directo a WhatsApp.
