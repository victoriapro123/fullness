begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists is_admin boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  sku text,
  name text not null,
  tag text,
  description text not null,
  photo_url text,
  photo_storage_path text,
  price_clp numeric(12, 0) not null default 0,
  currency text not null default 'CLP',
  ingredients text[] not null default '{}',
  nutrition_description text,
  nutrition_facts jsonb not null default '{}'::jsonb,
  allergens text[] not null default '{}',
  is_active boolean not null default true,
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items
  add column if not exists slug text,
  add column if not exists sku text,
  add column if not exists name text,
  add column if not exists tag text,
  add column if not exists description text,
  add column if not exists photo_url text,
  add column if not exists photo_storage_path text,
  add column if not exists price_clp numeric(12, 0) not null default 0,
  add column if not exists currency text not null default 'CLP',
  add column if not exists ingredients text[] not null default '{}',
  add column if not exists nutrition_description text,
  add column if not exists nutrition_facts jsonb not null default '{}'::jsonb,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists is_active boolean not null default true,
  add column if not exists display_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  label text,
  recipient_name text,
  phone text,
  address_line1 text not null,
  address_line2 text,
  comuna text,
  city text,
  region text,
  instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  session_id text,
  status text not null default 'active',
  currency text not null default 'CLP',
  subtotal_clp numeric(12, 0) not null default 0,
  total_clp numeric(12, 0) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null,
  product_id uuid not null,
  quantity integer not null default 1,
  unit_price_clp numeric(12, 0) not null default 0,
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  cart_id uuid,
  status text not null default 'draft',
  payment_status text not null default 'pending',
  delivery_status text not null default 'pending',
  subtotal_clp numeric(12, 0) not null default 0,
  discount_clp numeric(12, 0) not null default 0,
  delivery_fee_clp numeric(12, 0) not null default 0,
  total_clp numeric(12, 0) not null default 0,
  currency text not null default 'CLP',
  note text,
  delivery_address_id uuid,
  delivery_window_start timestamptz,
  delivery_window_end timestamptz,
  mercadopago_preference_id text,
  mercadopago_external_reference text,
  customer_snapshot jsonb not null default '{}'::jsonb,
  ordered_at timestamptz not null default now(),
  paid_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists client_id uuid,
  add column if not exists cart_id uuid,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists subtotal_clp numeric(12, 0) not null default 0,
  add column if not exists discount_clp numeric(12, 0) not null default 0,
  add column if not exists delivery_fee_clp numeric(12, 0) not null default 0,
  add column if not exists currency text not null default 'CLP',
  add column if not exists delivery_address_id uuid,
  add column if not exists delivery_window_start timestamptz,
  add column if not exists delivery_window_end timestamptz,
  add column if not exists mercadopago_preference_id text,
  add column if not exists mercadopago_external_reference text,
  add column if not exists customer_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists paid_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.orders
  alter column status set default 'draft',
  alter column total_clp set default 0;

update public.orders set status = 'draft' where status is null;
update public.orders set total_clp = 0 where total_clp is null;

alter table public.orders
  alter column status set not null,
  alter column total_clp set not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  product_id uuid,
  quantity integer not null default 1,
  unit_price_clp numeric(12, 0) not null default 0,
  total_clp numeric(12, 0) not null default 0,
  product_name text,
  product_snapshot jsonb not null default '{}'::jsonb,
  ingredients text[] not null default '{}',
  nutrition_description text,
  created_at timestamptz not null default now()
);

alter table public.order_items
  add column if not exists product_id uuid,
  add column if not exists total_clp numeric(12, 0) not null default 0,
  add column if not exists product_name text,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists ingredients text[] not null default '{}',
  add column if not exists nutrition_description text,
  add column if not exists created_at timestamptz not null default now();

alter table public.order_items
  alter column quantity set default 1,
  alter column unit_price_clp set default 0,
  alter column total_clp set default 0;

update public.order_items set quantity = 1 where quantity is null;
update public.order_items set unit_price_clp = 0 where unit_price_clp is null;
update public.order_items set total_clp = quantity * unit_price_clp where total_clp is null;

alter table public.order_items
  alter column quantity set not null,
  alter column unit_price_clp set not null,
  alter column total_clp set not null;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  provider text not null default 'mercado_pago',
  provider_payment_id text,
  provider_preference_id text,
  provider_merchant_order_id text,
  status text not null default 'pending',
  status_detail text,
  payment_method_id text,
  payment_type_id text,
  installments integer,
  transaction_amount_clp numeric(12, 0),
  currency text not null default 'CLP',
  payer_email text,
  raw_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercado_pago',
  provider_event_id text,
  event_type text,
  action text,
  resource_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_admin is true
  );
$$;

create or replace function public.owns_cart(target_cart_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.carts
    where id = target_cart_id
      and client_id = (select auth.uid())
  );
$$;

create or replace function public.owns_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id
      and client_id = (select auth.uid())
  );
$$;

create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_admin = false;
    elsif old.is_admin is distinct from new.is_admin then
      new.is_admin = old.is_admin;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        phone = coalesce(public.profiles.phone, excluded.phone),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
before insert or update on public.profiles
for each row execute function public.protect_profile_admin_flag();

drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

drop trigger if exists set_carts_updated_at on public.carts;
create trigger set_carts_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_addresses_client_id_fkey'
      and conrelid = 'public.customer_addresses'::regclass
  ) then
    alter table public.customer_addresses
      add constraint customer_addresses_client_id_fkey
      foreign key (client_id) references public.profiles(id) on delete cascade not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'carts_client_id_fkey'
      and conrelid = 'public.carts'::regclass
  ) then
    alter table public.carts
      add constraint carts_client_id_fkey
      foreign key (client_id) references public.profiles(id) on delete set null not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_cart_id_fkey'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_cart_id_fkey
      foreign key (cart_id) references public.carts(id) on delete cascade not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_product_id_fkey'
      and conrelid = 'public.cart_items'::regclass
  ) then
    alter table public.cart_items
      add constraint cart_items_product_id_fkey
      foreign key (product_id) references public.menu_items(id) on delete restrict not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_client_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_client_id_fkey
      foreign key (client_id) references public.profiles(id) on delete set null not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_cart_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_cart_id_fkey
      foreign key (cart_id) references public.carts(id) on delete set null not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_delivery_address_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_delivery_address_id_fkey
      foreign key (delivery_address_id) references public.customer_addresses(id) on delete set null not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_order_id_fkey'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete cascade not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_product_id_fkey'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_product_id_fkey
      foreign key (product_id) references public.menu_items(id) on delete restrict not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_order_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete cascade not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'menu_items_price_nonnegative') then
    alter table public.menu_items
      add constraint menu_items_price_nonnegative check (price_clp >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'menu_items_currency_clp') then
    alter table public.menu_items
      add constraint menu_items_currency_clp check (currency = 'CLP') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'carts_status_allowed') then
    alter table public.carts
      add constraint carts_status_allowed check (status in ('active', 'converted', 'abandoned')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cart_items_quantity_positive') then
    alter table public.cart_items
      add constraint cart_items_quantity_positive check (quantity > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_status_allowed') then
    alter table public.orders
      add constraint orders_status_allowed check (status in ('draft', 'pending_payment', 'paid', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_payment_status_allowed') then
    alter table public.orders
      add constraint orders_payment_status_allowed check (payment_status in ('pending', 'approved', 'authorized', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_delivery_status_allowed') then
    alter table public.orders
      add constraint orders_delivery_status_allowed check (delivery_status in ('pending', 'scheduled', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'order_items_quantity_positive') then
    alter table public.order_items
      add constraint order_items_quantity_positive check (quantity > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_provider_allowed') then
    alter table public.payments
      add constraint payments_provider_allowed check (provider in ('mercado_pago')) not valid;
  end if;
end $$;

create unique index if not exists menu_items_slug_unique_idx on public.menu_items (slug);
create unique index if not exists menu_items_sku_unique_idx on public.menu_items (sku) where sku is not null;
create index if not exists menu_items_active_display_idx on public.menu_items (display_order, name) where is_active is true;
create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin is true;
create index if not exists customer_addresses_client_id_idx on public.customer_addresses (client_id);
create index if not exists carts_client_status_idx on public.carts (client_id, status, updated_at desc);
create index if not exists carts_session_status_idx on public.carts (session_id, status) where session_id is not null;
create unique index if not exists carts_one_active_client_idx on public.carts (client_id) where status = 'active' and client_id is not null;
create unique index if not exists carts_one_active_session_idx on public.carts (session_id) where status = 'active' and session_id is not null;
create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);
create unique index if not exists cart_items_cart_product_unique_idx on public.cart_items (cart_id, product_id);
create index if not exists orders_client_status_idx on public.orders (client_id, status, ordered_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_delivery_status_idx on public.orders (delivery_status);
create index if not exists orders_cart_id_idx on public.orders (cart_id);
create unique index if not exists orders_mercadopago_external_reference_idx on public.orders (mercadopago_external_reference) where mercadopago_external_reference is not null;
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_status_idx on public.payments (status);
create unique index if not exists payments_provider_payment_unique_idx on public.payments (provider, provider_payment_id) where provider_payment_id is not null;
create index if not exists payment_events_provider_event_idx on public.payment_events (provider, provider_event_id) where provider_event_id is not null;

alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles for update
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()))
with check (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists menu_items_select_active_or_admin on public.menu_items;
create policy menu_items_select_active_or_admin
on public.menu_items for select
to anon, authenticated
using (is_active is true or (select public.is_admin()));

drop policy if exists menu_items_admin_insert on public.menu_items;
create policy menu_items_admin_insert
on public.menu_items for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists menu_items_admin_update on public.menu_items;
create policy menu_items_admin_update
on public.menu_items for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists menu_items_admin_delete on public.menu_items;
create policy menu_items_admin_delete
on public.menu_items for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists customer_addresses_select_own_or_admin on public.customer_addresses;
create policy customer_addresses_select_own_or_admin
on public.customer_addresses for select
to authenticated
using (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists customer_addresses_insert_own_or_admin on public.customer_addresses;
create policy customer_addresses_insert_own_or_admin
on public.customer_addresses for insert
to authenticated
with check (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists customer_addresses_update_own_or_admin on public.customer_addresses;
create policy customer_addresses_update_own_or_admin
on public.customer_addresses for update
to authenticated
using (client_id = (select auth.uid()) or (select public.is_admin()))
with check (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists carts_select_own_or_admin on public.carts;
create policy carts_select_own_or_admin
on public.carts for select
to authenticated
using (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists carts_insert_own_or_admin on public.carts;
create policy carts_insert_own_or_admin
on public.carts for insert
to authenticated
with check (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists carts_update_own_or_admin on public.carts;
create policy carts_update_own_or_admin
on public.carts for update
to authenticated
using (client_id = (select auth.uid()) or (select public.is_admin()))
with check (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists cart_items_select_own_cart_or_admin on public.cart_items;
create policy cart_items_select_own_cart_or_admin
on public.cart_items for select
to authenticated
using ((select public.owns_cart(cart_id)) or (select public.is_admin()));

drop policy if exists cart_items_insert_own_cart_or_admin on public.cart_items;
create policy cart_items_insert_own_cart_or_admin
on public.cart_items for insert
to authenticated
with check ((select public.owns_cart(cart_id)) or (select public.is_admin()));

drop policy if exists cart_items_update_own_cart_or_admin on public.cart_items;
create policy cart_items_update_own_cart_or_admin
on public.cart_items for update
to authenticated
using ((select public.owns_cart(cart_id)) or (select public.is_admin()))
with check ((select public.owns_cart(cart_id)) or (select public.is_admin()));

drop policy if exists cart_items_delete_own_cart_or_admin on public.cart_items;
create policy cart_items_delete_own_cart_or_admin
on public.cart_items for delete
to authenticated
using ((select public.owns_cart(cart_id)) or (select public.is_admin()));

drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin
on public.orders for select
to authenticated
using (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists orders_insert_own_or_admin on public.orders;
create policy orders_insert_own_or_admin
on public.orders for insert
to authenticated
with check (client_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update
on public.orders for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists order_items_select_own_order_or_admin on public.order_items;
create policy order_items_select_own_order_or_admin
on public.order_items for select
to authenticated
using ((select public.owns_order(order_id)) or (select public.is_admin()));

drop policy if exists order_items_admin_write on public.order_items;
create policy order_items_admin_write
on public.order_items for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists payments_select_own_order_or_admin on public.payments;
create policy payments_select_own_order_or_admin
on public.payments for select
to authenticated
using ((select public.owns_order(order_id)) or (select public.is_admin()));

drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write
on public.payments for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists payment_events_admin_read on public.payment_events;
create policy payment_events_admin_read
on public.payment_events for select
to authenticated
using ((select public.is_admin()));

drop view if exists public.customer_order_history;
create view public.customer_order_history
with (security_invoker = true)
as
select
  id,
  status,
  payment_status,
  delivery_status,
  total_clp,
  currency,
  ordered_at,
  paid_at,
  received_at
from public.orders
where status in ('delivered', 'cancelled', 'refunded')
   or delivery_status = 'delivered';

drop view if exists public.customer_orders_to_receive;
create view public.customer_orders_to_receive
with (security_invoker = true)
as
select
  id,
  status,
  payment_status,
  delivery_status,
  total_clp,
  currency,
  ordered_at,
  delivery_window_start,
  delivery_window_end
from public.orders
where status in ('paid', 'preparing', 'ready', 'out_for_delivery')
  and delivery_status <> 'delivered';

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_cart(uuid) to authenticated;
grant execute on function public.owns_order(uuid) to authenticated;

grant select on public.menu_items to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, update, delete on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select on public.payment_events to authenticated;
grant select on public.customer_order_history to authenticated;
grant select on public.customer_orders_to_receive to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-photos',
  'menu-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists menu_photos_public_read on storage.objects;
create policy menu_photos_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'menu-photos');

drop policy if exists menu_photos_admin_insert on storage.objects;
create policy menu_photos_admin_insert
on storage.objects for insert
to authenticated
with check (bucket_id = 'menu-photos' and (select public.is_admin()));

drop policy if exists menu_photos_admin_update on storage.objects;
create policy menu_photos_admin_update
on storage.objects for update
to authenticated
using (bucket_id = 'menu-photos' and (select public.is_admin()))
with check (bucket_id = 'menu-photos' and (select public.is_admin()));

drop policy if exists menu_photos_admin_delete on storage.objects;
create policy menu_photos_admin_delete
on storage.objects for delete
to authenticated
using (bucket_id = 'menu-photos' and (select public.is_admin()));

comment on table public.menu_items is 'Menus/productos vendibles de Fullness Lab para la tienda y backoffice.';
comment on column public.menu_items.ingredients is 'Lista simple de ingredientes visibles en backoffice y producto.';
comment on column public.menu_items.nutrition_description is 'Descripcion nutricional editorial/comercial del menu.';
comment on table public.payments is 'Pagos procesados por Mercado Pago Bricks u otro flujo Mercado Pago del backend.';
comment on table public.payment_events is 'Eventos webhook de Mercado Pago para auditoria e idempotencia.';
comment on column public.profiles.is_admin is 'Permiso simple de administracion: true o false.';

commit;
