begin;

create table if not exists public.meal_library_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text,
  description text not null default '',
  photo_url text,
  photo_storage_path text,
  secondary_photo_url text,
  secondary_photo_storage_path text,
  benefit_tags text[] not null default '{}',
  ingredients text[] not null default '{}',
  nutrition_description text,
  nutrition_highlights text[] not null default '{}',
  nutrition_facts jsonb not null default '{}'::jsonb,
  allergens text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  plan_id uuid references public.menu_items(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  frequency text not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  next_delivery_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_subscriptions_frequency_check check (frequency in ('weekly', 'monthly')),
  constraint customer_subscriptions_status_check check (status in ('active', 'paused', 'cancelled'))
);

create index if not exists meal_library_items_active_name_idx
  on public.meal_library_items (is_active, name);

create index if not exists customer_subscriptions_status_frequency_idx
  on public.customer_subscriptions (status, frequency, next_delivery_at);

create index if not exists customer_subscriptions_customer_email_idx
  on public.customer_subscriptions (customer_email);

drop trigger if exists set_meal_library_items_updated_at on public.meal_library_items;
create trigger set_meal_library_items_updated_at
before update on public.meal_library_items
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_subscriptions_updated_at on public.customer_subscriptions;
create trigger set_customer_subscriptions_updated_at
before update on public.customer_subscriptions
for each row execute function public.set_updated_at();

alter table public.meal_library_items enable row level security;
alter table public.customer_subscriptions enable row level security;

drop policy if exists meal_library_items_admin_all on public.meal_library_items;
create policy meal_library_items_admin_all
on public.meal_library_items for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists customer_subscriptions_admin_all on public.customer_subscriptions;
create policy customer_subscriptions_admin_all
on public.customer_subscriptions for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select, insert, update, delete on public.meal_library_items to authenticated;
grant select, insert, update, delete on public.customer_subscriptions to authenticated;

comment on table public.meal_library_items is 'Biblioteca reutilizable de platos para incorporarlos a varios meal prep.';
comment on table public.customer_subscriptions is 'Suscripciones de clientes para seguimiento operativo por frecuencia y estado.';

commit;
