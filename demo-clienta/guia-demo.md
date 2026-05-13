# Guia Para Mostrar La Demo

## 1. Abrir La Web

En desarrollo local:

```bash
npm.cmd run dev
```

Luego abrir:

```text
http://localhost:5173
```

## 2. Mostrar La Portada

Puntos a destacar:

- Fondo visual entregado por la clienta.
- Logo oficial aplicado.
- Titular mas limpio y elegante.
- Boton principal separado de los beneficios.

## 3. Mostrar Productos

Bajar hasta la seccion de productos y presionar `Agregar`.

Resultado esperado:

- No se abre el carrito automaticamente.
- Aparece una animacion de producto agregado.
- El contador del carrito sube.

## 4. Mostrar El Carrito

Presionar el icono del carrito en el header.

Resultado esperado:

- Se abre el panel del carrito.
- Se pueden sumar o restar unidades.
- Se muestra el total.

## 5. Mostrar Acceso Miembros

Presionar `Acceso miembros`.

Resultado esperado:

- Se abre el formulario de cuenta.
- Se muestran campos de usuario, email, telefono y contrasena.
- El boton de Gmail queda preparado para produccion con variable de entorno.
