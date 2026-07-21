# Backoffice Operaciones Cecilia

Actualizado: 2026-07-21

## Regla De Acceso

Cecilia opera con `app_metadata.backoffice_role = operator`. No requiere `profiles.is_admin = true` y no debe recibir acceso al panel de Supabase.

## Capacidades Permitidas

- Exportar CSV de suscritos, clientes y ventas historicas.
- Solicitar correos de recuperacion de contrasena para clientes.

## Implementacion

- El frontend muestra solo el modulo `Operaciones` para el rol `operator`.
- `/api/backoffice/exports` valida el token de sesion y prepara los CSV con service role en el servidor.
- `/api/backoffice/password-recovery` valida el token de sesion y solicita a Supabase el correo de recuperacion.
- Las solicitudes sin sesion o sin rol se rechazan.

## Limites

El rol no permite navegar tablas, editar productos, pedidos, pagos, configuracion de Mercado Pago, credenciales ni cuentas de terceros.
