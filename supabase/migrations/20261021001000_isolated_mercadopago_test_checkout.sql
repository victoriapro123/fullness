begin;

-- TEST is an explicit operational boundary, not a browser or global runtime
-- flag. Existing commercial records remain live by default.
alter table public.orders
  add column if not exists checkout_mode text not null default 'live';

alter table public.payments
  add column if not exists checkout_mode text not null default 'live';

alter table public.payment_events
  add column if not exists checkout_mode text not null default 'live';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_checkout_mode_allowed') then
    alter table public.orders
      add constraint orders_checkout_mode_allowed
      check (checkout_mode in ('live', 'test')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_checkout_mode_allowed') then
    alter table public.payments
      add constraint payments_checkout_mode_allowed
      check (checkout_mode in ('live', 'test')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_events_checkout_mode_allowed') then
    alter table public.payment_events
      add constraint payment_events_checkout_mode_allowed
      check (checkout_mode in ('live', 'test')) not valid;
  end if;
end;
$$;

alter table public.orders validate constraint orders_checkout_mode_allowed;
alter table public.payments validate constraint payments_checkout_mode_allowed;
alter table public.payment_events validate constraint payment_events_checkout_mode_allowed;

create index if not exists orders_checkout_mode_ordered_idx
  on public.orders (checkout_mode, ordered_at desc);

create index if not exists payments_checkout_mode_order_idx
  on public.payments (checkout_mode, order_id);

create unique index if not exists payments_provider_profile_payment_unique_idx
  on public.payments (provider, checkout_mode, provider_payment_id)
  where provider_payment_id is not null;

drop index if exists public.payments_provider_payment_unique_idx;

do $$
begin
  if exists (
    select 1
    from public.payment_events
    where provider_event_id is not null
    group by provider, checkout_mode, provider_event_id
    having count(*) > 1
  ) then
    raise exception 'PAYMENT_EVENT_PROFILE_DUPLICATES_REVIEW_REQUIRED';
  end if;
end;
$$;

create unique index if not exists payment_events_provider_profile_event_unique_idx
  on public.payment_events (provider, checkout_mode, provider_event_id)
  where provider_event_id is not null;

create table if not exists public.checkout_test_sessions (
  id uuid primary key default gen_random_uuid(),
  authorization_digest text not null,
  merchant_id text not null,
  verification jsonb not null default '{}'::jsonb,
  authorized_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  preference_id text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkout_test_sessions_expiry_valid check (expires_at > authorized_at)
);

alter table public.checkout_test_sessions
  add column if not exists authorization_digest text,
  add column if not exists merchant_id text,
  add column if not exists verification jsonb not null default '{}'::jsonb,
  add column if not exists authorized_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists consumed_at timestamptz,
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists preference_id text,
  add column if not exists provider_payment_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists checkout_test_sessions_authorization_digest_unique_idx
  on public.checkout_test_sessions (authorization_digest);

create index if not exists checkout_test_sessions_order_idx
  on public.checkout_test_sessions (order_id)
  where order_id is not null;

create index if not exists checkout_test_sessions_expiry_idx
  on public.checkout_test_sessions (expires_at)
  where consumed_at is null;

drop trigger if exists checkout_test_sessions_set_updated_at on public.checkout_test_sessions;
create trigger checkout_test_sessions_set_updated_at
before update on public.checkout_test_sessions
for each row execute function public.set_updated_at();

alter table public.checkout_test_sessions enable row level security;

comment on table public.checkout_test_sessions is
  'Autorizaciones de un solo uso para Checkout Pro TEST. Sólo el backend con service role puede crear, consumir o trazar una sesión.';

comment on column public.orders.checkout_mode is
  'Perfil de checkout confirmado por servidor: live o test. TEST queda excluido de operación, correos, Core360 y exportaciones comerciales.';

commit;
