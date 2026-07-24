# Herramientas técnicas del backoffice

- Las herramientas de respaldo, R2 y DNS se reservan para perfiles propietarios (`profiles.is_admin = true`).
- Las cuentas operadoras mantienen sólo sus exportaciones operativas y recuperación de contraseñas; no reciben acceso a datos crudos, medios R2 ni DNS.
- Los respaldos de tablas se entregan como CSV independientes y se permiten una vez por tabla y día, usando metadatos de autenticación del propietario para no sumar una tabla de auditoría adicional.
- La exploración de R2 lista sólo metadatos hasta que la persona pide vista previa o descarga. La interfaz trata un archivo a la vez.
- El panel DNS consulta los registros públicos resueltos para el host configurado del sitio mediante DNS sobre HTTPS de Cloudflare.
