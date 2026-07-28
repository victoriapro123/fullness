begin;

create table if not exists public.benefit_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon_url text not null,
  icon_storage_path text,
  default_description text not null default '',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint benefit_definitions_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.tag_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tag_definitions_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.meal_library_items
  add column if not exists benefit_assignments jsonb not null default '[]'::jsonb,
  add column if not exists tag_ids uuid[] not null default '{}';

alter table public.menu_items
  add column if not exists benefit_assignments jsonb not null default '[]'::jsonb,
  add column if not exists tag_ids uuid[] not null default '{}',
  add column if not exists library_meal_id uuid references public.meal_library_items(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meal_library_items_benefit_assignments_array'
  ) then
    alter table public.meal_library_items
      add constraint meal_library_items_benefit_assignments_array
      check (jsonb_typeof(benefit_assignments) = 'array') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'menu_items_benefit_assignments_array'
  ) then
    alter table public.menu_items
      add constraint menu_items_benefit_assignments_array
      check (jsonb_typeof(benefit_assignments) = 'array') not valid;
  end if;
end
$$;

create index if not exists benefit_definitions_active_order_idx
  on public.benefit_definitions (is_active, display_order, name);

create index if not exists tag_definitions_active_order_idx
  on public.tag_definitions (is_active, display_order, name);

create index if not exists menu_items_library_meal_id_idx
  on public.menu_items (library_meal_id)
  where library_meal_id is not null;

drop trigger if exists set_benefit_definitions_updated_at on public.benefit_definitions;
create trigger set_benefit_definitions_updated_at
before update on public.benefit_definitions
for each row execute function public.set_updated_at();

drop trigger if exists set_tag_definitions_updated_at on public.tag_definitions;
create trigger set_tag_definitions_updated_at
before update on public.tag_definitions
for each row execute function public.set_updated_at();

insert into public.benefit_definitions (
  id,
  slug,
  name,
  icon_url,
  icon_storage_path,
  default_description,
  display_order,
  is_active
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'antiinflamatorio',
    'Antiinflamatorio',
    '/api/media?key=assets%2Fbenefits%2Fantiinflamatorio.webp',
    'assets/benefits/antiinflamatorio.webp',
    'Combina ingredientes con compuestos bioactivos que acompañan una respuesta inflamatoria equilibrada.',
    10,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'energetico',
    'Energético',
    '/api/media?key=assets%2Fbenefits%2Fenergetico.webp',
    'assets/benefits/energetico.webp',
    'Aporta una combinación de nutrientes pensada para sostener la energía durante el día.',
    20,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'digestivo',
    'Digestivo',
    '/api/media?key=assets%2Fbenefits%2Fdigestivo.webp',
    'assets/benefits/digestivo.webp',
    'Incluye ingredientes y fibra que acompañan una digestión amable y el bienestar intestinal.',
    30,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'antioxidante',
    'Antioxidante',
    '/api/media?key=assets%2Fbenefits%2Fantioxidante.webp',
    'assets/benefits/antioxidante.webp',
    'Reúne ingredientes naturalmente ricos en compuestos antioxidantes que ayudan a proteger las células del estrés oxidativo.',
    40,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'alto-en-proteina',
    'Alto en proteína',
    '/api/media?key=assets%2Fbenefits%2Falto-en-proteina.webp',
    'assets/benefits/alto-en-proteina.webp',
    'Entrega una porción relevante de proteína, clave para la mantención muscular y una saciedad duradera.',
    50,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'alto-en-fibra',
    'Alto en fibra',
    '/api/media?key=assets%2Fbenefits%2Falto-en-fibra.webp',
    'assets/benefits/alto-en-fibra.webp',
    'Aporta fibra dietaria que favorece el tránsito intestinal y ayuda a prolongar la saciedad.',
    60,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    'omega-3',
    'Omega 3',
    '/api/media?key=assets%2Fbenefits%2Fomega-3.webp',
    'assets/benefits/omega-3.webp',
    'Incluye fuentes naturales de ácidos grasos omega 3, asociados al cuidado cardiovascular y cerebral.',
    70,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    'equilibrio',
    'Equilibrio',
    '/api/media?key=assets%2Fbenefits%2Fequilibrio.webp',
    'assets/benefits/equilibrio.webp',
    'Combina proteínas, vegetales, grasas saludables y carbohidratos para una comida completa.',
    80,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    'detox',
    'Detox',
    '/api/media?key=assets%2Fbenefits%2Fdetox.webp',
    'assets/benefits/detox.webp',
    'Integra vegetales y fibra que acompañan los procesos naturales de eliminación del organismo.',
    90,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    'inmunidad',
    'Inmunidad',
    '/api/media?key=assets%2Fbenefits%2Finmunidad.webp',
    'assets/benefits/inmunidad.webp',
    'Aporta nutrientes que participan en el funcionamiento normal del sistema inmune.',
    100,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    'salud-cardiovascular',
    'Salud cardiovascular',
    '/api/media?key=assets%2Fbenefits%2Fsalud-cardiovascular.webp',
    'assets/benefits/salud-cardiovascular.webp',
    'Combina grasas saludables, fibra y vegetales que acompañan el cuidado cardiovascular.',
    110,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000012',
    'saciedad',
    'Saciedad',
    '/api/media?key=assets%2Fbenefits%2Fsaciedad.webp',
    'assets/benefits/saciedad.webp',
    'Su combinación de proteína, fibra y grasas saludables ayuda a mantener la saciedad por más tiempo.',
    120,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  icon_url = excluded.icon_url,
  icon_storage_path = excluded.icon_storage_path,
  default_description = excluded.default_description,
  display_order = excluded.display_order;

insert into public.tag_definitions (id, slug, name, display_order, is_active)
values
  ('20000000-0000-4000-8000-000000000001', 'alto-en-proteina', 'Alto en proteína', 10, true),
  ('20000000-0000-4000-8000-000000000002', 'alto-en-fibra', 'Alto en fibra', 20, true),
  ('20000000-0000-4000-8000-000000000003', 'rico-en-omega-3', 'Rico en omega-3', 30, true),
  ('20000000-0000-4000-8000-000000000004', 'fuente-de-antioxidantes', 'Fuente de antioxidantes', 40, true),
  ('20000000-0000-4000-8000-000000000005', 'carbohidratos-complejos', 'Carbohidratos complejos', 50, true),
  ('20000000-0000-4000-8000-000000000006', 'grasas-saludables', 'Grasas saludables', 60, true),
  ('20000000-0000-4000-8000-000000000007', 'proteina-vegetal', 'Proteína vegetal', 70, true),
  ('20000000-0000-4000-8000-000000000008', 'sin-azucar-anadida', 'Sin azúcar añadida', 80, true),
  ('20000000-0000-4000-8000-000000000009', 'sin-gluten', 'Sin gluten', 90, true),
  ('20000000-0000-4000-8000-000000000010', 'sin-lacteos', 'Sin lácteos', 100, true),
  ('20000000-0000-4000-8000-000000000011', 'vegano', 'Vegano', 110, true),
  ('20000000-0000-4000-8000-000000000012', 'ingredientes-naturales', 'Ingredientes naturales', 120, true)
on conflict (slug) do update
set
  name = excluded.name,
  display_order = excluded.display_order;

update public.meal_library_items meal
set benefit_assignments = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'benefitId', benefit.id::text,
        'slug', benefit.slug,
        'name', benefit.name,
        'iconUrl', benefit.icon_url,
        'explanation', ''
      )
      order by benefit.display_order
    ),
    '[]'::jsonb
  )
  from unnest(meal.benefit_tags) legacy(name)
  join public.benefit_definitions benefit
    on lower(benefit.name) = lower(legacy.name)
)
where meal.benefit_assignments = '[]'::jsonb
  and cardinality(meal.benefit_tags) > 0;

update public.meal_library_items meal
set tag_ids = (
  select coalesce(array_agg(tag.id order by tag.display_order), '{}'::uuid[])
  from unnest(meal.nutrition_highlights) legacy(name)
  join public.tag_definitions tag
    on lower(tag.name) = lower(legacy.name)
)
where cardinality(meal.tag_ids) = 0
  and cardinality(meal.nutrition_highlights) > 0;

update public.menu_items item
set benefit_assignments = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'benefitId', benefit.id::text,
        'slug', benefit.slug,
        'name', benefit.name,
        'iconUrl', benefit.icon_url,
        'explanation', ''
      )
      order by benefit.display_order
    ),
    '[]'::jsonb
  )
  from unnest(item.benefit_tags) legacy(name)
  join public.benefit_definitions benefit
    on lower(benefit.name) = lower(legacy.name)
)
where item.product_type = 'family'
  and item.benefit_assignments = '[]'::jsonb
  and cardinality(item.benefit_tags) > 0;

update public.menu_items item
set tag_ids = (
  select coalesce(array_agg(tag.id order by tag.display_order), '{}'::uuid[])
  from unnest(item.nutrition_highlights) legacy(name)
  join public.tag_definitions tag
    on lower(tag.name) = lower(legacy.name)
)
where item.product_type = 'family'
  and cardinality(item.tag_ids) = 0
  and cardinality(item.nutrition_highlights) > 0;

alter table public.benefit_definitions enable row level security;
alter table public.tag_definitions enable row level security;

drop policy if exists benefit_definitions_select_active_or_admin on public.benefit_definitions;
create policy benefit_definitions_select_active_or_admin
on public.benefit_definitions for select
to anon, authenticated
using (is_active is true or (select public.is_admin()));

drop policy if exists benefit_definitions_admin_insert on public.benefit_definitions;
create policy benefit_definitions_admin_insert
on public.benefit_definitions for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists benefit_definitions_admin_update on public.benefit_definitions;
create policy benefit_definitions_admin_update
on public.benefit_definitions for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists benefit_definitions_admin_delete on public.benefit_definitions;
create policy benefit_definitions_admin_delete
on public.benefit_definitions for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists tag_definitions_select_active_or_admin on public.tag_definitions;
create policy tag_definitions_select_active_or_admin
on public.tag_definitions for select
to anon, authenticated
using (is_active is true or (select public.is_admin()));

drop policy if exists tag_definitions_admin_insert on public.tag_definitions;
create policy tag_definitions_admin_insert
on public.tag_definitions for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists tag_definitions_admin_update on public.tag_definitions;
create policy tag_definitions_admin_update
on public.tag_definitions for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists tag_definitions_admin_delete on public.tag_definitions;
create policy tag_definitions_admin_delete
on public.tag_definitions for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists meal_library_items_admin_all on public.meal_library_items;
drop policy if exists meal_library_items_select_active_or_admin on public.meal_library_items;
create policy meal_library_items_select_active_or_admin
on public.meal_library_items for select
to anon, authenticated
using (is_active is true or (select public.is_admin()));

create policy meal_library_items_admin_all
on public.meal_library_items for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select on public.benefit_definitions to anon, authenticated;
grant select on public.tag_definitions to anon, authenticated;
grant select on public.meal_library_items to anon, authenticated;
grant insert, update, delete on public.benefit_definitions to authenticated;
grant insert, update, delete on public.tag_definitions to authenticated;

update public.profiles
set is_admin = true
where lower(email) = 'cecilia.prueba@fullnesslab.com';

comment on table public.benefit_definitions is 'Beneficios editoriales reutilizables con iconografia administrable.';
comment on table public.tag_definitions is 'Tags nutricionales reutilizables para platos.';
comment on column public.meal_library_items.benefit_assignments is 'Beneficios seleccionados para el plato y explicación libre por beneficio.';
comment on column public.meal_library_items.tag_ids is 'Tags estandarizados seleccionados para el plato.';
comment on column public.menu_items.benefit_assignments is 'Beneficios directos solo para productos familiares; los planes los heredan de sus platos.';
comment on column public.menu_items.tag_ids is 'Tags directos solo para productos familiares; los planes los heredan de sus platos.';
comment on column public.menu_items.library_meal_id is 'Plato de biblioteca vinculado cuando un producto familiar reutiliza una receta.';

commit;
