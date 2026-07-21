# Manual Para Cecilia: Operaciones Fullness Lab

Actualizado: 2026-07-21

Este manual cubre el acceso operativo de Cecilia. Su cuenta no entrega acceso al panel de Supabase ni permite navegar tablas de datos. Desde el backoffice puede descargar los tres listados autorizados y asistir a personas que necesiten restablecer su contraseña.

## 1. Entrar Al Backoffice

1. Entrar al sitio e iniciar sesion con el correo asignado.
2. Abrir `Backoffice` desde el menu o visitar `/#backoffice`.
3. Se abrira directamente el modulo `Operaciones`.

Si no aparece el boton `Backoffice`, cerrar sesion, volver a entrar y confirmar que se esta usando la cuenta asignada.

## 2. Alcance Del Acceso

Cecilia puede:

- Exportar el listado de usuarios suscritos.
- Exportar el listado consolidado de clientes.
- Exportar el historial de ventas.
- Enviar un correo de recuperacion de contraseña a una persona que lo necesite.

El modulo no muestra tablas navegables ni permite editar cuentas, pedidos, pagos, configuracion de Mercado Pago o credenciales.

## 3. Exportar Listados CSV

En `Operaciones` hay tres botones. Cada descarga genera un archivo `.csv`, compatible con Excel, Numbers y Google Sheets.

### Suscritos

Incluye:

- Nombre.
- Correo.
- Telefono.
- Origen de la suscripcion.
- Fecha de alta y eventual baja.

Usarlo para comunicaciones con personas que se registraron en el popup o formulario de suscripcion.

### Clientes

Incluye:

- Nombre, correo y telefono.
- Cantidad de compras.
- Total historico en CLP.
- Primera y ultima compra.
- Fecha de creacion de cuenta cuando exista.

Usarlo para seguimiento comercial, recompra y atencion de clientes.

### Ventas Historicas

Incluye:

- Numero de orden y fecha.
- Estado del pedido, pago y despacho.
- Datos de contacto del cliente.
- Monto y moneda.

Usarlo para conciliacion, seguimiento de ventas y reportes historicos.

### Recomendacion Al Abrir Un CSV

1. Abrir el archivo con Excel, Numbers o Google Sheets.
2. Si Excel pregunta por el formato, elegir `UTF-8` y separador `coma`.
3. No cambiar identificadores de orden ni montos antes de guardar una copia.
4. Guardar el archivo solo en las ubicaciones autorizadas por Fullness Lab.

## 4. Ayudar A Recuperar Una Cuenta

Cuando una persona no logra recuperar su acceso:

1. Ir a `Operaciones`.
2. En `Enviar recuperacion de contrasena`, escribir su correo.
3. Presionar `Enviar recuperacion`.
4. Informar que recibira un enlace seguro para crear una nueva contrasena.

Buenas practicas:

- Confirmar el correo antes de enviarlo.
- No solicitar ni recibir contrasenas por WhatsApp, correo o llamadas.
- No enviar enlaces de recuperacion a un correo que no haya sido confirmado por la persona.
- Si no llega el correo, pedir que revise spam y vuelva a solicitarlo despues de algunos minutos.

El sistema responde de forma segura: no confirma desde el panel si un correo tiene o no una cuenta registrada.

## 5. Mercado Pago

El checkout y las notificaciones de pago se gestionan por los servicios protegidos del sitio. Cecilia puede consultar los estados de pago dentro del CSV de `Ventas historicas`, pero no configura Mercado Pago ni maneja credenciales.

Las credenciales privadas, el webhook y cualquier cambio de configuracion de Mercado Pago corresponden al responsable tecnico o administrador propietario. Nunca se deben compartir access tokens, secretos de webhook ni capturas que los muestren.

## 6. Problemas Frecuentes

### No Puedo Entrar Al Backoffice

- Confirmar que se uso el correo asignado.
- Cerrar sesion y volver a iniciar sesion.
- Abrir `/#backoffice` nuevamente.
- Si persiste, pedir revision al administrador propietario.

### El CSV No Se Descarga

- Revisar la carpeta `Descargas` del navegador.
- Permitir descargas para el sitio si el navegador las bloqueo.
- Recargar la pagina e intentar una vez mas.
- Si persiste, cerrar sesion y volver a entrar.

### La Persona No Recibe La Recuperacion

- Confirmar que el correo fue escrito correctamente.
- Pedir que revise spam, promociones y papelera.
- Solicitar el envio nuevamente despues de algunos minutos.
- No cambiar contrasenas por cuenta propia ni pedir datos sensibles.
