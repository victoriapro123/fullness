begin;

alter table public.menu_items
  add column if not exists product_type text not null default 'family',
  add column if not exists plan_frequency text,
  add column if not exists secondary_photo_url text,
  add column if not exists secondary_photo_storage_path text,
  add column if not exists benefit_tags text[] not null default '{}',
  add column if not exists included_items jsonb not null default '[]'::jsonb,
  add column if not exists serving_label text,
  add column if not exists purchase_label text;

update public.menu_items
set product_type = 'family'
where product_type is null;

update public.menu_items
set included_items = '[]'::jsonb
where included_items is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'menu_items_product_type_allowed') then
    alter table public.menu_items
      add constraint menu_items_product_type_allowed
      check (product_type in ('plan', 'family')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'menu_items_plan_frequency_allowed') then
    alter table public.menu_items
      add constraint menu_items_plan_frequency_allowed
      check (plan_frequency is null or plan_frequency in ('weekly', 'monthly')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'menu_items_included_items_array') then
    alter table public.menu_items
      add constraint menu_items_included_items_array
      check (jsonb_typeof(included_items) = 'array') not valid;
  end if;
end $$;

create index if not exists menu_items_product_type_display_idx
  on public.menu_items (product_type, plan_frequency, display_order, name)
  where is_active is true;

comment on column public.menu_items.product_type is 'Tipo comercial del catálogo: plan o family.';
comment on column public.menu_items.plan_frequency is 'Frecuencia del plan meal prep: weekly o monthly.';
comment on column public.menu_items.secondary_photo_url is 'Segunda imagen pública para hover.';
comment on column public.menu_items.benefit_tags is 'Tags de beneficio visibles, por ejemplo Antioxidante, Energético o Detox.';
comment on column public.menu_items.included_items is 'Platos incluidos en un plan meal prep con foto, descripción, nutrición y tags propios.';
comment on column public.menu_items.serving_label is 'Texto breve de porciones o duración.';
comment on column public.menu_items.purchase_label is 'Texto breve para el botón de compra.';

commit;
