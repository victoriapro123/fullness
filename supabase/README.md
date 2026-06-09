# Supabase Fullness Lab

Esta carpeta versiona la base de datos para pasar la demo visual a una base comercial real.

## Estado Revisado

- La app Vite no tenia cliente Supabase ni consultas a base de datos.
- En la base remota existen `orders` y `order_items`, pero incompletas para el flujo pedido.
- Faltan `profiles`, `menu_items`, `carts`, `cart_items`, `payments`, `payment_events` y `customer_addresses`.
- `.env.local` tiene variables publicas y privadas; `SUPABASE_SERVICE_ROLE_KEY` debe usarse solo en backend/API routes, nunca en React.

## Migracion

Archivo principal:

```bash
supabase/migrations/20260606223000_fullness_commerce_schema.sql
```

Cubre:

- Menus vendibles en `menu_items`: foto, descripcion, precio, ingredientes, caracteristicas nutricionales, datos nutricionales y receta/resumen de preparacion para lightbox y pagina individual.
- Clientes y usuarios en `profiles`, con permiso simple `is_admin`.
- Carritos en `carts` y `cart_items`.
- Ventas en `orders` y `order_items`, respetando las columnas existentes `client_id` y `product_id`.
- Pagos Mercado Pago Bricks en `payments` y auditoria webhook en `payment_events`.
- Direcciones de cliente en `customer_addresses`.
- Vistas para panel cliente: `customer_order_history` y `customer_orders_to_receive`.
- Storage bucket publico `menu-photos` con escritura solo para administradores.
- RLS e indices para consultas por cliente, estado, carrito, pedido y pagos.

## Como Aplicarla

Con Supabase CLI vinculada al proyecto:

```bash
npx supabase db push
```

O copia el SQL de la migracion en Supabase SQL Editor y ejecutalo completo.

Despues, opcionalmente carga datos de prueba:

```bash
supabase/seed.sql
```

## Primer Administrador

El permiso es deliberadamente simple: `profiles.is_admin = true`.

Despues de que el usuario exista en Supabase Auth, marca el primer administrador desde SQL Editor:

```sql
update public.profiles
set is_admin = true
where email = 'admin@dominio.cl';
```

Los usuarios normales no pueden elevarse a admin desde la app: un trigger mantiene `is_admin` protegido para roles `anon` y `authenticated`.

## Mercado Pago Bricks

El frontend debe usar la public key de Mercado Pago. El backend/API route debe usar el access token, crear/procesar el pago y escribir:

- `orders`: estado comercial y referencia externa.
- `payments`: resultado del pago.
- `payment_events`: eventos webhook para idempotencia y auditoria.

Variables esperadas para una siguiente etapa:

```env
VITE_MERCADOPAGO_PUBLIC_KEY=pk_test_xxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxx
MERCADOPAGO_WEBHOOK_SECRET=xxx
```
