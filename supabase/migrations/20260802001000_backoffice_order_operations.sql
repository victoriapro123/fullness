begin;

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status text,
  next_status text not null,
  source text not null default 'backoffice',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_created_idx
  on public.order_status_events(order_id, created_at desc);

alter table public.order_status_events enable row level security;

drop policy if exists order_status_events_admin_select on public.order_status_events;
create policy order_status_events_admin_select
on public.order_status_events for select
to authenticated
using ((select public.is_admin()));

commit;
