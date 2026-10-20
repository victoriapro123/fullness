-- Fullness/Core360: reviewed additive integration schema.
-- Derived from candidate SHA-256 359bfe0a3231c71f58ead71afb4335ad283b30f090a8f9389a2a32249337c447.
-- Applied independently of runtime flags, workers and historical-order recovery.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select pg_advisory_xact_lock(hashtextextended('fullness-core360-schema-20261019', 0));

do $$
begin
  if to_regprocedure('public.is_admin()') is null
     or to_regprocedure('public.set_updated_at()') is null then
    raise exception 'FULLNESS_SCHEMA_PREREQUISITES_MISSING';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and left(c.relname, 8) = 'core360_') then
    raise exception 'EXISTING_CORE360_SCHEMA_REVIEW_REQUIRED';
  end if;
end;
$$;

create table public.core360_product_mappings (
  id uuid primary key default gen_random_uuid(),
  source_menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  core_item_id text not null,
  core_sku text,
  quantity_milli_per_unit integer not null default 1000 check (quantity_milli_per_unit > 0),
  uom_code text not null,
  commercial_version text not null,
  gross_unit_price_minor numeric(12, 0) not null check (gross_unit_price_minor > 0),
  tax_bps integer not null check (tax_bps between 0 and 10000),
  availability_version text,
  image_reference text,
  image_version text,
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

create table public.core360_customer_mappings (
  external_customer_id uuid primary key,
  core_partner_id uuid not null unique,
  identity_fingerprint text not null,
  source text not null default 'core360-commerce-api',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.core360_customer_mappings is
  'Vínculo explícito Fullness -> cliente Core360. No hace matching ni fusión por email; un cambio de identidad requiere conciliación explícita.';

create table public.core360_catalog_projection (
  source_menu_item_id uuid primary key references public.menu_items(id) on delete cascade,
  core_item_id text not null,
  core_item_available boolean not null,
  core_sku text,
  product_version text,
  gross_minor numeric(12, 0) check (gross_minor > 0),
  currency text not null check (currency = 'CLP'),
  tax_bps integer check (tax_bps between 0 and 10000),
  unit text,
  quantity_milli_per_unit integer not null check (quantity_milli_per_unit > 0),
  uom_compatible boolean,
  factor_compatible boolean,
  reconciliation_reason text,
  price_available boolean not null,
  observed_at timestamptz not null,
  updated_at timestamptz not null default now()
);

comment on table public.core360_catalog_projection is
  'Proyección UUID de precio, SKU, impuesto, UOM y versión Core360. Cuando falta el artículo o cambia UOM/factor queda no disponible, sin conservar una proyección comercial vieja ni sobrescribir textos, fotos o composición editorial de menu_items.';

create table public.core360_stock_projection (
  source_menu_item_id uuid primary key references public.menu_items(id) on delete cascade,
  core_item_id text not null,
  availability_version text,
  available_milli numeric(16, 0),
  inventory_managed boolean not null,
  stock_known boolean not null,
  observed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  check (
    (inventory_managed and stock_known and available_milli is not null and available_milli >= 0)
    or (not stock_known and available_milli is null)
  )
);

comment on table public.core360_stock_projection is
  'Proyección UUID de stock Core360. Sin fila Core o servicio no inventariable se conserva available_milli NULL, nunca cero inferido.';

create table public.core360_commerce_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('web_order.payment_approved')),
  idempotency_key text not null unique,
  schema_version integer not null default 2 check (schema_version >= 1),
  source_catalog_version text,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'accepted', 'retry', 'failed', 'historical_excluded', 'needs_mapping', 'price_reconciliation_required', 'stock_unavailable')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  delivered_at timestamptz,
  core_order_id text,
  core_order_version bigint check (core_order_version >= 0),
  core_request jsonb,
  core_request_hash text,
  response_summary jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, event_type)
);

comment on table public.core360_commerce_outbox is
  'Outbox idempotente para pedido web aprobado. No es un evento Mercado Pago ni autorización de emitir DTE.';

create index core360_commerce_outbox_dispatch_idx
  on public.core360_commerce_outbox (status, lease_expires_at, created_at)
  where status in ('pending', 'retry', 'sending');

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
  stream text primary key check (stream in ('approved_orders', 'catalog', 'stock', 'image_metadata', 'order_status')),
  cursor text,
  source_version text,
  last_polled_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.core360_commerce_order_states (
  order_id uuid primary key references public.orders(id) on delete cascade,
  core_order_id text not null,
  core_order_version bigint not null check (core_order_version >= 0),
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

-- A later Core version may update the projection. Equal versions can carry a
-- distinct opaque sourceVersion (for example, fulfillment changed without a
-- commerce document-version bump), so their request-start timestamp decides
-- freshness. A slower response from an older poll cannot overwrite it. The
-- sourceVersion is retained verbatim; it is never lexically ordered or parsed.
create or replace function public.project_core360_commerce_order_state(
  p_order_id uuid,
  p_core_order_id text,
  p_core_order_version bigint,
  p_source_version text,
  p_commercial_status text,
  p_fulfillment_status text,
  p_fiscal_status text,
  p_fiscal_document_type text,
  p_fiscal_folio text,
  p_fiscal_artifact_reference text,
  p_provider_payload jsonb,
  p_received_at timestamptz
) returns boolean
language plpgsql
as $$
declare
  stored_order_id uuid;
begin
  insert into public.core360_commerce_order_states (
    order_id, core_order_id, core_order_version, source_version,
    commercial_status, fulfillment_status, fiscal_status,
    fiscal_document_type, fiscal_folio, fiscal_artifact_reference,
    provider_payload, received_at
  ) values (
    p_order_id, p_core_order_id, p_core_order_version, p_source_version,
    p_commercial_status, p_fulfillment_status, p_fiscal_status,
    p_fiscal_document_type, p_fiscal_folio, p_fiscal_artifact_reference,
    coalesce(p_provider_payload, '{}'::jsonb), coalesce(p_received_at, now())
  )
  on conflict (order_id) do update set
    core_order_id = excluded.core_order_id,
    core_order_version = excluded.core_order_version,
    source_version = excluded.source_version,
    commercial_status = excluded.commercial_status,
    fulfillment_status = excluded.fulfillment_status,
    fiscal_status = excluded.fiscal_status,
    fiscal_document_type = excluded.fiscal_document_type,
    fiscal_folio = excluded.fiscal_folio,
    fiscal_artifact_reference = excluded.fiscal_artifact_reference,
    provider_payload = excluded.provider_payload,
    received_at = excluded.received_at
  where excluded.core_order_version > public.core360_commerce_order_states.core_order_version
    or (
      excluded.core_order_version = public.core360_commerce_order_states.core_order_version
      and excluded.received_at > public.core360_commerce_order_states.received_at
    )
    or (
      excluded.core_order_version = public.core360_commerce_order_states.core_order_version
      and excluded.received_at = public.core360_commerce_order_states.received_at
      and excluded.source_version = public.core360_commerce_order_states.source_version
    )
  returning order_id into stored_order_id;

  return stored_order_id is not null;
end;
$$;

comment on table public.core360_fiscal_documents is
  'Proyección asincrónica del DTE emitido por Core360; accepted no equivale a issued.';

alter table public.core360_product_mappings enable row level security;
alter table public.core360_customer_mappings enable row level security;
alter table public.core360_catalog_projection enable row level security;
alter table public.core360_stock_projection enable row level security;
alter table public.core360_commerce_outbox enable row level security;
alter table public.core360_fiscal_documents enable row level security;
alter table public.core360_commerce_sync_cursors enable row level security;
alter table public.core360_commerce_order_states enable row level security;

create policy core360_product_mappings_admin_all
on public.core360_product_mappings for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy core360_customer_mappings_admin_select
on public.core360_customer_mappings for select
to authenticated
using ((select public.is_admin()));

create policy core360_catalog_projection_admin_select
on public.core360_catalog_projection for select
to authenticated
using ((select public.is_admin()));

create policy core360_stock_projection_admin_select
on public.core360_stock_projection for select
to authenticated
using ((select public.is_admin()));

create policy core360_commerce_outbox_admin_select
on public.core360_commerce_outbox for select
to authenticated
using ((select public.is_admin()));

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

revoke all on function public.project_core360_commerce_order_state(
  uuid, text, bigint, text, text, text, text, text, text, text, jsonb, timestamptz
) from public;
grant execute on function public.project_core360_commerce_order_state(
  uuid, text, bigint, text, text, text, text, text, text, text, jsonb, timestamptz
) to service_role;

drop trigger if exists set_core360_product_mappings_updated_at on public.core360_product_mappings;
create trigger set_core360_product_mappings_updated_at
before update on public.core360_product_mappings
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_customer_mappings_updated_at on public.core360_customer_mappings;
create trigger set_core360_customer_mappings_updated_at
before update on public.core360_customer_mappings
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_catalog_projection_updated_at on public.core360_catalog_projection;
create trigger set_core360_catalog_projection_updated_at
before update on public.core360_catalog_projection
for each row execute function public.set_updated_at();

drop trigger if exists set_core360_stock_projection_updated_at on public.core360_stock_projection;
create trigger set_core360_stock_projection_updated_at
before update on public.core360_stock_projection
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

-- Supabase's live default ACL grants new objects to API roles. Constrain only
-- these new integration objects; keep all existing Fullness grants unchanged.
revoke all on table
  public.core360_product_mappings,
  public.core360_customer_mappings,
  public.core360_catalog_projection,
  public.core360_stock_projection,
  public.core360_commerce_outbox,
  public.core360_fiscal_documents,
  public.core360_commerce_sync_cursors,
  public.core360_commerce_order_states
from anon, authenticated;

grant select on table
  public.core360_product_mappings,
  public.core360_customer_mappings,
  public.core360_catalog_projection,
  public.core360_stock_projection,
  public.core360_commerce_outbox,
  public.core360_fiscal_documents,
  public.core360_commerce_sync_cursors,
  public.core360_commerce_order_states
to authenticated;

grant insert, update, delete on table public.core360_product_mappings to authenticated;
grant all on table
  public.core360_product_mappings,
  public.core360_customer_mappings,
  public.core360_catalog_projection,
  public.core360_stock_projection,
  public.core360_commerce_outbox,
  public.core360_fiscal_documents,
  public.core360_commerce_sync_cursors,
  public.core360_commerce_order_states
to service_role;

revoke all on function public.project_core360_commerce_order_state(
  uuid, text, bigint, text, text, text, text, text, text, text, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.project_core360_commerce_order_state(
  uuid, text, bigint, text, text, text, text, text, text, text, jsonb, timestamptz
) to service_role;

insert into supabase_migrations.schema_migrations(version, name, statements)
values ('20261019001000', 'core360_commerce_integration',
  array['Applied through authenticated Fullness SQL Editor. Versioned source: 20261019001000_core360_commerce_integration.sql. Reviewed candidate SHA-256: 359bfe0a3231c71f58ead71afb4335ad283b30f090a8f9389a2a32249337c447. Explicit API-role ACL hardening included.']);

commit;

