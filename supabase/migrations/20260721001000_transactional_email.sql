begin;

create table if not exists public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text not null,
  source text not null default 'subscription-lightbox',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_key text not null unique,
  kind text not null,
  recipient_email text not null,
  subscriber_id uuid references public.email_subscribers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_deliveries_order_id_idx
  on public.email_deliveries(order_id);

drop trigger if exists set_email_subscribers_updated_at on public.email_subscribers;
create trigger set_email_subscribers_updated_at
before update on public.email_subscribers
for each row execute function public.set_updated_at();

drop trigger if exists set_email_deliveries_updated_at on public.email_deliveries;
create trigger set_email_deliveries_updated_at
before update on public.email_deliveries
for each row execute function public.set_updated_at();

commit;
