# Instrucciones De La Clienta Cumplidas

## Identidad y portada

- Se uso una estetica elegante, oscura y natural.
- Se reemplazo el video de portada por la imagen final entregada como fondo.
- Se mantuvo el enfoque visual en comida real, ingredientes frescos y energia natural.
- Se aplico el logo oficial entregado por la clienta.
- El video introductorio se convirtió en una secuencia de 160 cuadros WebP ligada al scroll en escritorio y móvil: avanza al bajar y retrocede al subir, sin bloquear la navegación. Una flecha blanca animada indica que hay más secuencia hacia abajo y el botón `Ir a Fullness` permite saltar al hero. Al terminar los cuadros, el último viewport se completa automáticamente para dejar el hero totalmente visible, sin espacio negro intermedio. En el teléfono se usan cuadros optimizados de menor resolución para que el gesto se mantenga fluido; no reproduce el video nativo. El MP4 original se mantiene disponible como fuente y respaldo.
- Las cabeceras principales de Comunidad y Nosotros comparten con el landing la misma escala, grosor y espaciado de eyebrow, título y descripción.
- La ventana `Mealpreps / Editar` se compactó para que sus campos y fotos entren en una retícula legible; solo conserva scroll vertical y apila sus columnas antes de exceder el ancho disponible.
- El menú principal del header se alinea ópticamente con el wordmark del logo horizontal en escritorio. Cuando la cabecera se reduce bajo 2200 px, la navegación pasa al menú hamburguesa antes de montar links, usuario o control de replay.
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
