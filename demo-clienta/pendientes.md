# Pendientes Recomendados

## Nueva Direccion De Marca

La clienta redefinio el foco hacia nutricion emocional, raiz, betarraga, cuerpo y conexion con la naturaleza.

Pendientes:

- Revisar con Cecilia el nuevo hero con `Nutrirse desde la raiz`, `El bienestar comienza desde adentro` y CTA `Explorar Fullness Lab`.
- Validar que el logo aumentado y el isotipo de betarraga tengan suficiente presencia sin sentirse repetitivos.
- Definir si la marca visible sera `Fullness` o `Fullness Lab`.
- Confirmar si `No contamos calorias. Creemos en aprender a nutrirse.` queda solo en hero o tambien debe aparecer en redes/packaging.

## Nueva Estructura Home

Orden deseado por la clienta:

1. Hero.
2. Plato food porn.
3. Nuestro proposito.
4. Como calentar los platos.
5. Oferta Fullness Lab.
6. Tienda.
7. Nutricion con fundamento.
8. Comunidad.

Pendientes:

- Reemplazar la imagen temporal de `Como calentar los platos` por una foto real de plato en bolsa al vacio con pinzas en agua.
- Mejorar las imagenes de productos con fotos finales reales.

## Direccion Visual

Pendientes:

- Cambiar fondo negro puro por tonos verde petroleo, oliva ennegrecido, cacao oscuro o burdeo betarraga profundo.
- Usar franjas claras tipo papel organico, salvia mineral, beige oliva o marfil envejecido.
- Mantener el color dominante desde los platos y no desde fondos chillones.
- Mantener la betarraga como sello editorial, favicon, separador, marca de agua suave y footer.
- Conseguir o generar imagenes mas food porn/editoriales, con vapor, sombra, textura y luz lateral.

## Gmail Real

Para que `Continuar con Gmail` funcione completamente en produccion, se debe crear un OAuth Client ID en Google Cloud y configurarlo en Vercel:

```env
VITE_GOOGLE_CLIENT_ID=tu-client-id-de-google.apps.googleusercontent.com
```

## Checkout Real

El carrito actualmente funciona como demo visual. Ya quedo versionado y aplicado un esquema Supabase para menus, carritos, ordenes, pagos Mercado Pago, clientes y permisos admin simples, pero falta conectar el flujo real.

Pendientes:

- Cargar el menu real en `menu_items`.
- Implementar Mercado Pago Bricks con API routes server-side.
- Registrar pagos en `payments` y webhooks en `payment_events`.
- Persistir carrito y ordenes en Supabase.

## Backoffice

Pendientes:

- Probar backoffice de menus con un usuario real marcado como admin en `profiles.is_admin`.
- Cargar menus reales con foto, descripcion, precio, ingredientes, alergenos y descripcion nutricional.
- Crear backoffice admin para ventas, pagos, clientes y carritos.
- Crear panel cliente solo para compras historicas y compras por recibir.

## Contenido Final

Reemplazar textos y productos de ejemplo por informacion final de la marca:

- Menu real.
- Fotos finales de productos.
- Precios definitivos.
- Condiciones de despacho.
- Informacion nutricional.

## Comunidad

La seccion comunidad puede evolucionar hacia:

- Planes semanales.
- Acceso para miembros.
- Retos.
- Recetas.
- Suscripciones.
