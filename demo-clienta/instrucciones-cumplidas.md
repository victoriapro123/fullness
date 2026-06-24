# Instrucciones De La Clienta Cumplidas

## Identidad y portada

- Se uso una estetica elegante, oscura y natural.
- Se reemplazo el video de portada por la imagen final entregada como fondo.
- Se mantuvo el enfoque visual en comida real, ingredientes frescos y energia natural.
- Se aplico el logo oficial entregado por la clienta.
- El video introductorio anterior al hero muestra el logo Fullness Lab centrado sobre el video. La animacion avanza de forma autonoma y fluida durante 4 segundos cuando el usuario hace click en el logo o intenta bajar; durante ese tramo se bloquea el desplazamiento real del sitio, el video cubre todo el alto visible y el menu permanece oculto hasta aterrizar en el hero.
- Los elementos tecnologicos quedaron como cuatro tags simples apilados a la izquierda, mas grandes, transparentes, solo con borde y texto: `Antinflamatorio`, `Nutrientes`, `Origen de calidad` y `Energia real`. Encienden uno a uno con titileo e iluminacion suave.
- Desde el hero no se puede volver al video ni al tramo negro con scroll; se agrego un boton transparente con icono de video para `Volver a la animacion`, que reabre y resetea el intro.
- El logo del header se aumento y se ajusto a una lectura marfil/dorado suave para no verse blanco ni generico.
- Se agrego isotipo de betarraga como favicon, marca visual de secciones, marca de agua suave y footer.
- El CTA principal del hero ahora dice `Explorar Fullness Lab` y baja a `Nuestro proposito`.
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
