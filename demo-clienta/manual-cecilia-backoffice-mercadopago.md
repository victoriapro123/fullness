# Manual Para Cecilia: Backoffice Fullness Lab

Actualizado: 2026-07-11

Este manual explica como usar el backoffice de Fullness Lab y que se necesita para dejar Mercado Pago listo para operar.

## 1. Acceso Al Backoffice

1. Entrar al sitio.
2. Iniciar sesion con el correo autorizado.
3. Abrir `Backoffice` desde el menu o entrar directo a `/#backoffice`.
4. Si el panel no aparece, cerrar sesion y volver a entrar. La cuenta debe estar marcada como administradora en Supabase (`profiles.is_admin = true`).

## 2. Modulos Del Panel

El panel esta separado en cuatro modulos para trabajar sin mezclar tareas.

### Meal Preps

Sirve para crear, editar, activar o desactivar planes y opciones familiares.

Campos principales:

- `Tipo`: plan o familiar.
- `Frecuencia`: semanal o mensual, solo para planes.
- `Nombre`: titulo visible.
- `Slug`: URL interna del producto. Usar minusculas, sin espacios, por ejemplo `plan-semanal-antinflamatorio`.
- `SKU`: codigo interno opcional.
- `Etiqueta`: frase corta visible, por ejemplo `5 meal preps / 1 semana`.
- `Precio CLP`: precio sin puntos ni simbolo.
- `Orden`: define la posicion en listados.
- `Activo`: si esta encendido, el item queda disponible en el catalogo.

Fotos:

- `Subir principal`: imagen principal del producto.
- `Subir hover`: imagen secundaria para estados visuales.
- Tambien se puede pegar una URL manual en los campos de imagen.

Contenido nutricional:

- `Ingredientes`, `Alergenos`, `Descripcion nutricional`, `Caracteristicas nutricionales`, `Receta resumida`, `Detalle nutricional` y `Pasos` alimentan la ficha del producto.
- `Datos nutricionales JSON` debe mantenerse como JSON valido. Si hay duda, dejar `{}`.

Planes:

- Cuando el tipo es `Plan`, aparece `Platos del plan`.
- Cada plato incluido puede tener nombre, etiqueta, descripcion, fotos, beneficios, ingredientes, descripcion nutricional, alergeno y datos nutricionales.

Para publicar:

1. Completar campos obligatorios.
2. Revisar que `Activo` este encendido.
3. Guardar.
4. Abrir la pagina publica del producto y revisar texto, precio y fotos.

### Tienda

Controla los textos y visuales principales de la pagina de tienda.

Permite editar:

- Hero de tienda: eyebrow, titulo, bajada, imagen y botones.
- Metricas del hero.
- Bloque de suscripcion: titulo, bajada, boton, beneficios y tabla comparativa.

Recomendacion:

- Usar textos breves.
- Revisar en mobile despues de cambiar titulos largos.
- Mantener el tono Fullness: premium, claro, consciente y sin prometer solo rapidez.

### Lightbox

Controla el popup de suscripcion.

Permite editar:

- Activo / inactivo.
- Titulo pequeno.
- Texto grande.
- Bajada.
- Botones.
- Imagen de fondo.

Uso recomendado:

- Activarlo solo cuando haya una campana o llamado importante.
- Mantener el texto corto.
- Usar una imagen con buen contraste para que el texto sea legible.

### Comunidad

Permite agregar actividades visibles de Comunidad Fullness.

Campos:

- Fecha.
- Descripcion.

Nota importante:

- Esta gestion de comunidad todavia es simple y temporal. Actualmente se guarda localmente mientras no exista una tabla Supabase especifica para actividades.

## 3. Checklist Antes De Publicar Cambios

- Revisar que el item este activo.
- Confirmar que el precio esta correcto.
- Revisar fotos principal y hover.
- Abrir el producto desde el sitio publico.
- Probar mobile.
- Si se cambio una campana, revisar tambien el lightbox.

## 4. Mercado Pago: Estado Actual

El proyecto ya contempla variables de entorno y tablas para pagos (`orders`, `payments`, `payment_events`), pero el flujo productivo de pago todavia no esta conectado de punta a punta. Hoy el checkout funciona como flujo comercial por WhatsApp.

Para cobrar online en produccion falta conectar API routes server-side que:

- creen una orden,
- creen la preferencia o pago en Mercado Pago,
- registren el resultado en Supabase,
- reciban y validen webhooks,
- actualicen el estado de la orden.

## 5. Mercado Pago: Configuracion Necesaria

Documentacion oficial de referencia:

- [Credenciales Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/credentials)
- [Checkout Bricks](https://www.mercadopago.com.ar/developers/en/docs/checkout-bricks/overview)
- [Panel de desarrollador](https://www.mercadopago.com.ar/developers/en/docs/checkout-bricks/additional-content/your-integrations/dashboard)
- [Webhooks](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks)

### 5.1 Crear Aplicacion

1. Entrar a Mercado Pago Developers.
2. Ir a `Tus integraciones`.
3. Crear una aplicacion para Fullness Lab.
4. Usar credenciales de prueba para validar el flujo.
5. Activar credenciales de produccion cuando el sitio y el checkout esten listos.

### 5.2 Variables De Entorno

En Vercel o el entorno de produccion deben existir:

```bash
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR...
MERCADOPAGO_ACCESS_TOKEN=APP_USR...
MERCADOPAGO_WEBHOOK_SECRET=...
```

Uso correcto:

- `VITE_MERCADOPAGO_PUBLIC_KEY`: puede vivir en frontend. Sirve para inicializar Mercado Pago Bricks.
- `MERCADOPAGO_ACCESS_TOKEN`: privado. Solo backend/API routes.
- `MERCADOPAGO_WEBHOOK_SECRET`: privado. Sirve para validar que los webhooks vienen realmente desde Mercado Pago.

Nunca pegar `MERCADOPAGO_ACCESS_TOKEN` en el codigo frontend, en capturas, en WhatsApp ni en documentos compartidos.

### 5.3 Webhook

Cuando exista la API route final, configurar en Mercado Pago una URL HTTPS similar a:

```text
https://fullnesslab.cl/api/mercadopago/webhook
```

Eventos recomendados:

- `payment`

La API debe:

- validar la firma `x-signature`,
- responder `200` o `201` rapido,
- consultar el pago completo en Mercado Pago,
- guardar el evento en `payment_events`,
- actualizar `payments` y `orders`.

### 5.4 Pruebas

Antes de produccion:

1. Usar credenciales de prueba.
2. Crear compra de prueba.
3. Confirmar que Mercado Pago responde correctamente.
4. Confirmar que Supabase registra orden, pago y evento.
5. Simular webhook.
6. Revisar estados de orden: pendiente, aprobado, rechazado.

### 5.5 Paso A Produccion

1. Activar credenciales de produccion en Mercado Pago.
2. Cargar variables de produccion en Vercel.
3. Confirmar webhook productivo.
4. Hacer una compra real de bajo monto.
5. Revisar Mercado Pago, Supabase y correo/notificacion de confirmacion.

## 6. Problemas Frecuentes

### No Puedo Entrar Al Backoffice

- Confirmar que el correo existe en Supabase Auth.
- Confirmar que `profiles.is_admin` esta en `true`.
- Cerrar sesion y volver a entrar.

### Guarde Un Producto Y No Se Ve

- Revisar que `Activo` este encendido.
- Revisar que el producto tenga precio y nombre.
- Refrescar la pagina publica.

### La Foto No Carga

- Revisar si la URL abre en una pestana.
- Si fue subida desde el backoffice, esperar unos segundos y guardar otra vez.
- Evitar archivos demasiado pesados.

### Mercado Pago No Notifica

- Confirmar que el webhook usa HTTPS.
- Confirmar que la URL configurada corresponde al dominio productivo.
- Revisar que el backend responde `200` o `201`.
- Revisar que `MERCADOPAGO_WEBHOOK_SECRET` coincide con la firma generada en Mercado Pago.
