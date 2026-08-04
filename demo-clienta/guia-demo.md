# Guia Para Mostrar La Demo

## 1. Abrir La Web

En desarrollo local:

```bash
npm run dev
```

Luego abrir:

```text
http://localhost:3101
```

Usar siempre este puerto para presentar y revisar la demo local.

## 2. Mostrar La Portada

Puntos a destacar:

- Antes del hero aparece una secuencia cinematográfica vinculada directamente al scroll. Al bajar, los 160 cuadros avanzan de forma continua; al subir, la animación retrocede de manera natural. El sitio no bloquea el desplazamiento y, al terminar la secuencia, el hero y la banda siguiente suben sobre el último cuadro con el mismo fondo negro opaco de la página.
- La misma secuencia de fotogramas funciona en computador y móvil; en el teléfono llena el encuadre para mantener el plato protagonista. El MP4 original sigue resguardado como fuente y respaldo de la animación, sin reproducirse en la interfaz.
- Identidad Fullness Lab con estetica oscura, botanica y editorial.
- Frase madre: `Nutrirse desde la raiz`.
- Mensaje clave: el bienestar comienza desde adentro; no se cuentan calorias, se aprende a nutrirse.
- El boton principal del hero dice `Ver planes` y lleva a la oferta disponible.
- El logo del header y el isotipo de betarraga aparecen con mas protagonismo y tonos marfil/dorado suave.

## 3. Mostrar Plato Food Porn

Bajar a la seccion `Food porn funcional`.

Puntos a destacar:

- Se muestra la referencia visual que gusto a Cecilia.
- El plato se comunica como rico y sensorial, no comida de dieta.
- Se refuerzan atributos: sin gluten, sin lacteos, sin azucar refinada y grasas saludables.

## 4. Mostrar Proposito

Bajar a `Nuestro proposito`.

Puntos a destacar:

- Se usa la betarraga como simbolo de raiz, nutrientes y vida interior.
- El texto explica la idea de bienestar desde adentro sin volver la pagina clinica.
- Se presentan cuatro pilares: nutricion consciente, cocina Antinflamatoria, bienestar integral y ciencia con sabor.

## 5. Mostrar Como Calentar

Bajar a `Como calentar tus platos`.

Puntos a destacar:

- Explica el uso de los platos al vacio.
- No vende ahorro de tiempo como valor diferencial.
- Mantiene el tono de ritual, cuidado e intencion.

## 6. Mostrar Oferta Fullness Lab

Bajar a `Oferta Fullness Lab`.

Puntos a destacar:

- Menus preparados baja a tienda.
- Meal Prep abre WhatsApp porque aun no tiene seccion desarrollada.
- Talleres abre WhatsApp porque aun no tiene seccion desarrollada.

## 7. Mostrar Productos

Bajar hasta la seccion de productos y presionar `Agregar`.

Resultado esperado:

- No se abre el carrito automaticamente.
- Aparece una animacion de producto agregado.
- El contador del carrito sube.

## 8. Mostrar El Carrito

Presionar el icono del carrito en el header.

Resultado esperado:

- Se abre el panel del carrito.
- Se pueden sumar o restar unidades.
- Se muestra el total.

## 9. Mostrar Acceso Miembros

Presionar `Acceso miembros`.

Resultado esperado:

- Se abre el formulario de cuenta.
- Se muestran correo y contrasena para iniciar sesion con Supabase Auth.
- El enlace `Olvide mi contrasena` envia un correo de recuperacion.
- Cuando Supabase devuelve a la app desde confirmacion de correo, se muestra un mensaje de exito. Cuando vuelve desde invitacion o recuperacion, se abre el formulario para crear o actualizar la contrasena.

## 10. Mostrar Nutricion Funcional

Bajar a `Nutricion con fundamento`.

Puntos a destacar:

- Se explican combinaciones funcionales de forma simple.
- La informacion tecnica se presenta con tono editorial y cercano.
