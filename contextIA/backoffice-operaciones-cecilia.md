# Acceso Backoffice Cecilia

Actualizado: 2026-07-24

## Regla De Acceso

Cecilia opera como propietaria del backoffice mediante `profiles.is_admin = true` y `app_metadata.backoffice_role = owner`. Tiene acceso completo dentro de la aplicacion publicada, sin acceso al panel de Supabase ni a sus credenciales.

## Capacidades Permitidas

- Gestionar planes, mealpreps, mealpreps familiares, clientes y contenido web. Los mealpreps nuevos de un plan se pueden guardar en su catálogo antes de publicar el plan.
- Consultar suscriptores y ejecutar las operaciones de exportacion y recuperacion de acceso.
- Usar el modulo Respaldo y conexion para exportaciones, recursos de R2 y DNS, dentro de los limites establecidos por la aplicacion.

## Implementacion

- El frontend muestra todos los modulos del backoffice para la cuenta con perfil administrador.
- `/api/backoffice/exports` valida el token de sesion y prepara los CSV con service role en el servidor.
- `/api/backoffice/password-recovery` valida el token de sesion y solicita a Supabase el correo de recuperacion.
- Los endpoints de administracion validan la sesion y el perfil propietario antes de operar.

## Limites

El acceso completo se limita al backoffice de Fullness. No concede entrada al dashboard de Supabase, a credenciales, claves de infraestructura ni a cuentas externas.

## Acceso Publicado Verificado

- La URL publicada canonica es `https://www.fullnesslab.com/`; `https://fullnesslab.com/` redirige alli.
- La entrada directa al panel es `https://www.fullnesslab.com/#backoffice`.
- La taxonomia definitiva del panel es `Mealpreps familiares`, `Planes` y `Mealpreps`, además de `Clientes`, `Parámetros`, `Contenido web`, `Respaldo y conexión` y `Operaciones`.
- La contrasena temporal de la cuenta de prueba se roto el 2026-07-24 y se verifico su inicio de sesion; no registrar contrasenas en este documento.
