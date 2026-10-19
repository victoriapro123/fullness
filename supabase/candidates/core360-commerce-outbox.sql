-- CANDIDATO NO APLICADO. Este archivo no vive en supabase/migrations y no debe
-- enviarse con `supabase db push` hasta aprobar el contrato y hacer preflight
-- contra Produccion. No contiene secretos.

begin;

create table public.core360_product_mappings (
  id uuid primary key default gen_random_uuid(),
  source_menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  core_item_id text not null,
  core_sku text,
  quantity_milli_per_unit integer not null default 1000 check (quantity_milli_per_unit > 0),
  uom_code text not null default 'unit',
  commercial_version text not null,
  gross_unit_price_minor numeric(12, 0) not null check (gross_unit_price_minor > 0),
  tax_bps integer not null check (tax_bps between 0 and 10000),
  availability_version text,
  image_reference text,
  fulfillment_strategy text not null default 'opaque_product'
    check (fulfillment_strategy in ('opaque_product', 'components')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (source_menu_item_id)
);

comment on table public.core360_product_mappings is
  'Mapeo explícito Fullness menu_items -> artículo Core360, con precio bruto, impuesto, UOM y versión comercial. Los planes parten como producto opaco hasta aprobar la estrategia por componentes.';

create table public.core360_commerce_adjustment_mappings (
  adjustment_kind text primary key check (adjustment_kind in ('delivery', 'discount')),
  core_adjustment_id text not null,
  commercial_version text not null,
  tax_bps integer not null check (tax_bps between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.core360_commerce_adjustment_mappings is
  'Ajustes explícitos Core360 para despacho y descuento; sin mapeo una orden Fullness queda bloqueada y no se redondea.';

create table public.core360_commerce_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('web_order.payment_approved')),
  idempotency_key text not null unique,
  schema_version integer not null default 2 check (schema_version >= 1),
  source_catalog_version text,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'accepted', 'retry', 'failed', 'needs_mapping', 'price_reconciliation_required', 'stock_unavailable')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  core_order_id text,
  core_order_version text,
  response_summary jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, event_type)
);

comment on table public.core360_commerce_outbox is
  'Outbox idempotente para pedido web aprobado. No es un evento Mercado Pago ni autorización de emitir DTE.';

create index core360_commerce_outbox_dispatch_idx
  on public.core360_commerce_outbox (status, created_at)
  where status in ('pending', 'retry');

create index core360_commerce_outbox_order_idx
  on public.core360_commerce_outbox (order_id);

create table public.core360_fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  core_order_id text,
  status text not null default 'pending'
    check (status in ('pending', 'issued', 'rejected', 'voided')),
  document_type text,
  folio text,
  artifact_url text,
  provider_payload jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.core360_commerce_sync_cursors (
  stream text primary key check (stream in ('catalog', 'stock', 'order_status')),
  cursor text,
  source_version text,
  last_polled_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.core360_commerce_order_states (
  order_id uuid primary key references public.orders(id) on delete cascade,
  core_order_id text not null,
  source_version text not null,
  commercial_status text not null,
  fulfillment_status text,
  fiscal_status text not null default 'pending',
  fiscal_document_type text,
  fiscal_folio text,
  fiscal_artifact_reference text,
  provider_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.core360_commerce_order_states is
  'Proyección incremental y monotónica de estados Core360 para órdenes Fullness; no concilia Mercado Pago ni sustituye el snapshot local.';

comment on table public.core360_fiscal_documents is
  'Proyección asincrónica del DTE emitido por Core360; accepted no equivale a issued.';

alter table public.core360_product_mappings enable row level security;
alter table public.core360_commerce_adjustment_mappings enable row level security;
alter table public.core360_commerce_outbox enable row level security;
alter table public.core360_fiscal_documents enable row level security;
alter table public.core360_commerce_sync_cursors enable row level security;
alter table public.core360_commerce_order_states enable row level security;

create policy core360_product_mappings_admin_all
on public.core360_product_mappings for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy core360_commerce_outbox_admin_select
on public.core360_commerce_outbox for select
to authenticated
using ((select public.is_admin()));

create policy core360_commerce_adjustment_mappings_admin_all
on public.core360_commerce_adjustment_mappings for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy core360_fiscal_documents_admin_select
on public.core360_fiscal_documents for select
to authenticated
using ((select public.is_admin()));

create policy core360_commerce_sync_cursors_admin_select
on public.core360_commerce_sync_cursors for select
to authenticated
using ((select public.is_admin()));

create policy core360_commerce_order_states_admin_select
on public.core360_commerce_order_states for select
to authenticated
using ((select public.is_admin()));

drop trigger if exists set_core360_product_mappings_updated_at on public.core360_product_mappings;
create trigger set_core360_product_mappings_updated_at
before update on public.core360_product_mappings
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_commerce_adjustment_mappings_updated_at on public.core360_commerce_adjustment_mappings;
create trigger set_core360_commerce_adjustment_mappings_updated_at
before update on public.core360_commerce_adjustment_mappings
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_commerce_outbox_updated_at on public.core360_commerce_outbox;
create trigger set_core360_commerce_outbox_updated_at
before update on public.core360_commerce_outbox
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_fiscal_documents_updated_at on public.core360_fiscal_documents;
create trigger set_core360_fiscal_documents_updated_at
before update on public.core360_fiscal_documents
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_commerce_sync_cursors_updated_at on public.core360_commerce_sync_cursors;
create trigger set_core360_commerce_sync_cursors_updated_at
before update on public.core360_commerce_sync_cursors
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_commerce_order_states_updated_at on public.core360_commerce_order_states;
create trigger set_core360_commerce_order_states_updated_at
before update on public.core360_commerce_order_states
for each row execute function public.set_updated_at();

commit;
