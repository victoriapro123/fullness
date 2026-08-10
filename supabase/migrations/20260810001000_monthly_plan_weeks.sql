begin;

-- The monthly catalog was deliberately removed before this migration. Fail
-- closed if that precondition changes so no historical monthly plan is
-- silently reinterpreted as a different structure.
do $$
begin
  if exists (
    select 1
    from public.menu_items
    where product_type = 'plan'
      and plan_frequency = 'monthly'
  ) then
    raise exception 'La migración espera cero planes mensuales existentes; revisa el respaldo antes de continuar.';
  end if;

  if exists (
    select 1
    from public.menu_items
    where product_type = 'plan'
      and plan_frequency = 'weekly'
      and is_active is true
      and (
        jsonb_typeof(included_items) <> 'array'
        or jsonb_array_length(included_items) <> 6
      )
  ) then
    raise exception 'Hay un plan semanal visible que no tiene exactamente seis mealpreps.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_items_product_type_frequency_consistency'
      and conrelid = 'public.menu_items'::regclass
  ) then
    alter table public.menu_items
      add constraint menu_items_product_type_frequency_consistency
      check (
        (product_type = 'family' and plan_frequency is null)
        or (product_type = 'plan' and plan_frequency in ('weekly', 'monthly'))
      ) not valid;
  end if;
end;
$$;

alter table public.menu_items
  validate constraint menu_items_product_type_frequency_consistency;

create table if not exists public.monthly_plan_weeks (
  id uuid primary key default gen_random_uuid(),
  monthly_plan_id uuid not null
    references public.menu_items(id) on delete cascade,
  weekly_plan_id uuid not null
    references public.menu_items(id) on delete restrict,
  week_position smallint not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint monthly_plan_weeks_week_position_check
    check (week_position between 1 and 4),
  constraint monthly_plan_weeks_month_position_unique
    unique (monthly_plan_id, week_position),
  constraint monthly_plan_weeks_month_week_unique
    unique (monthly_plan_id, weekly_plan_id)
);

create index if not exists monthly_plan_weeks_weekly_plan_id_idx
  on public.monthly_plan_weeks (weekly_plan_id);

create or replace function public.touch_monthly_plan_weeks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_monthly_plan_weeks_updated_at
  on public.monthly_plan_weeks;

create trigger set_monthly_plan_weeks_updated_at
before update on public.monthly_plan_weeks
for each row execute function public.touch_monthly_plan_weeks_updated_at();

create or replace function public.validate_monthly_plan_week_link()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_monthly_type text;
  v_monthly_frequency text;
  v_weekly_type text;
  v_weekly_frequency text;
begin
  if new.monthly_plan_id = new.weekly_plan_id then
    raise exception using
      errcode = '23514',
      message = 'Un plan mensual no puede incluirse a sí mismo.';
  end if;

  select product_type, plan_frequency
    into v_monthly_type, v_monthly_frequency
  from public.menu_items
  where id = new.monthly_plan_id;

  if not found
     or v_monthly_type is distinct from 'plan'
     or v_monthly_frequency is distinct from 'monthly' then
    raise exception using
      errcode = '23514',
      message = 'monthly_plan_id debe ser un plan mensual.';
  end if;

  select product_type, plan_frequency
    into v_weekly_type, v_weekly_frequency
  from public.menu_items
  where id = new.weekly_plan_id;

  if not found
     or v_weekly_type is distinct from 'plan'
     or v_weekly_frequency is distinct from 'weekly' then
    raise exception using
      errcode = '23514',
      message = 'weekly_plan_id debe ser un plan semanal.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_monthly_plan_week_link
  on public.monthly_plan_weeks;

create trigger validate_monthly_plan_week_link
before insert or update on public.monthly_plan_weeks
for each row execute function public.validate_monthly_plan_week_link();

create or replace function public.validate_menu_item_plan_composition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_distinct_meals integer;
  v_active_weeks integer;
begin
  if new.product_type = 'plan'
     and new.plan_frequency = 'weekly'
     and new.is_active is true then
    if jsonb_typeof(new.included_items) <> 'array'
       or jsonb_array_length(new.included_items) <> 6 then
      raise exception using
        errcode = '23514',
        message = 'Un plan semanal visible debe contener exactamente seis mealpreps.';
    end if;

    -- Do not enforce a live library foreign key here: a verified legacy weekly
    -- plan has one missing library record, but its embedded meal snapshot is
    -- still real and must remain intact.
    select count(
      distinct coalesce(
        nullif(meal.value ->> 'libraryMealId', ''),
        nullif(meal.value ->> 'library_meal_id', ''),
        nullif(meal.value ->> 'id', '')
      )
    )
    into v_distinct_meals
    from jsonb_array_elements(new.included_items) as meal(value);

    if v_distinct_meals <> 6 then
      raise exception using
        errcode = '23514',
        message = 'Los seis mealpreps de un plan semanal visible deben ser distintos.';
    end if;
  end if;

  if new.product_type = 'plan'
     and new.plan_frequency = 'monthly' then
    if jsonb_typeof(new.included_items) <> 'array'
       or jsonb_array_length(new.included_items) <> 0 then
      raise exception using
        errcode = '23514',
        message = 'Un plan mensual no guarda mealpreps directos; debe vincular cuatro semanas.';
    end if;

    if new.is_active is true then
      select count(*)
      into v_active_weeks
      from public.monthly_plan_weeks link
      join public.menu_items weekly
        on weekly.id = link.weekly_plan_id
      where link.monthly_plan_id = new.id
        and weekly.product_type = 'plan'
        and weekly.plan_frequency = 'weekly'
        and weekly.is_active is true;

      if v_active_weeks <> 4 then
        raise exception using
          errcode = '23514',
          message = 'Un plan mensual visible debe contener cuatro planes semanales visibles.';
      end if;
    end if;
  end if;

  -- A visible month cannot silently lose one of its public weeks.
  if tg_op = 'UPDATE'
     and old.product_type = 'plan'
     and old.plan_frequency = 'weekly'
     and exists (
       select 1
       from public.monthly_plan_weeks link
       join public.menu_items monthly
         on monthly.id = link.monthly_plan_id
       where link.weekly_plan_id = old.id
         and monthly.product_type = 'plan'
         and monthly.plan_frequency = 'monthly'
         and monthly.is_active is true
     )
     and (
       new.product_type is distinct from 'plan'
       or new.plan_frequency is distinct from 'weekly'
       or new.is_active is not true
     ) then
    raise exception using
      errcode = '23514',
      message = 'Oculta primero los planes mensuales que contienen esta semana.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_menu_item_plan_composition
  on public.menu_items;

create trigger validate_menu_item_plan_composition
before insert or update on public.menu_items
for each row execute function public.validate_menu_item_plan_composition();

alter table public.monthly_plan_weeks enable row level security;

drop policy if exists monthly_plan_weeks_select_visible_or_admin
  on public.monthly_plan_weeks;

create policy monthly_plan_weeks_select_visible_or_admin
on public.monthly_plan_weeks
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.menu_items monthly
    where monthly.id = monthly_plan_weeks.monthly_plan_id
      and monthly.product_type = 'plan'
      and monthly.plan_frequency = 'monthly'
      and (
        monthly.is_active is true
        or (select public.is_admin())
      )
  )
);

revoke all on public.monthly_plan_weeks from public, anon, authenticated;
grant select on public.monthly_plan_weeks to anon, authenticated;

create or replace function public.replace_monthly_plan_weeks(
  p_monthly_plan_id uuid,
  p_weekly_plan_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly_type text;
  v_monthly_frequency text;
  v_monthly_active boolean;
  v_distinct_weeks integer;
  v_valid_weeks integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Sólo una administradora puede asignar semanas a un plan mensual.';
  end if;

  if coalesce(array_ndims(p_weekly_plan_ids), 0) <> 1
     or coalesce(cardinality(p_weekly_plan_ids), 0) <> 4 then
    raise exception using
      errcode = '23514',
      message = 'Debes seleccionar exactamente cuatro planes semanales.';
  end if;

  select product_type, plan_frequency, is_active
    into v_monthly_type, v_monthly_frequency, v_monthly_active
  from public.menu_items
  where id = p_monthly_plan_id
  for update;

  if not found
     or v_monthly_type is distinct from 'plan'
     or v_monthly_frequency is distinct from 'monthly' then
    raise exception using
      errcode = '23514',
      message = 'El destino debe ser un plan mensual existente.';
  end if;

  select count(distinct input.weekly_plan_id)
    into v_distinct_weeks
  from unnest(p_weekly_plan_ids) as input(weekly_plan_id);

  if v_distinct_weeks <> 4 then
    raise exception using
      errcode = '23514',
      message = 'No puedes repetir una semana dentro del mismo plan mensual.';
  end if;

  perform 1
  from public.menu_items weekly
  where weekly.id = any(p_weekly_plan_ids)
  order by weekly.id
  for update;

  select count(*)
    into v_valid_weeks
  from public.menu_items weekly
  where weekly.id = any(p_weekly_plan_ids)
    and weekly.product_type = 'plan'
    and weekly.plan_frequency = 'weekly'
    and (
      v_monthly_active is not true
      or weekly.is_active is true
    );

  if v_valid_weeks <> 4 then
    raise exception using
      errcode = '23514',
      message = 'Las cuatro selecciones deben ser planes semanales; si el mensual está visible, también deben estar visibles.';
  end if;

  delete from public.monthly_plan_weeks
  where monthly_plan_id = p_monthly_plan_id;

  insert into public.monthly_plan_weeks (
    monthly_plan_id,
    weekly_plan_id,
    week_position,
    created_by,
    updated_by
  )
  select
    p_monthly_plan_id,
    input.weekly_plan_id,
    input.week_position::smallint,
    auth.uid(),
    auth.uid()
  from unnest(p_weekly_plan_ids) with ordinality
    as input(weekly_plan_id, week_position);
end;
$$;

revoke all on function public.replace_monthly_plan_weeks(uuid, uuid[]) from public;
grant execute on function public.replace_monthly_plan_weeks(uuid, uuid[]) to authenticated;

-- Tags are derived at read time from the canonical mealprep library. The
-- embedded plan data is used only as a compatibility fallback for the one
-- verified legacy library reference, so no tag needs to be copied or repeated.
drop view if exists public.monthly_plan_nutrition_tags;
drop view if exists public.weekly_plan_nutrition_tags;

create view public.weekly_plan_nutrition_tags
with (security_invoker = true)
as
select
  weekly.id as weekly_plan_id,
  coalesce(
    (
      select array_agg(distinct definition.id order by definition.id)
      from jsonb_array_elements(
        case
          when jsonb_typeof(coalesce(weekly.included_items, '[]'::jsonb)) = 'array'
            then weekly.included_items
          else '[]'::jsonb
        end
      ) as meal(value)
      left join public.meal_library_items library
        on library.id::text = coalesce(
          nullif(meal.value ->> 'libraryMealId', ''),
          nullif(meal.value ->> 'library_meal_id', '')
        )
      cross join lateral jsonb_array_elements_text(
        case
          when library.id is not null then to_jsonb(library.tag_ids)
          when jsonb_typeof(meal.value -> 'tagIds') = 'array'
            then meal.value -> 'tagIds'
          when jsonb_typeof(meal.value -> 'tag_ids') = 'array'
            then meal.value -> 'tag_ids'
          else '[]'::jsonb
        end
      ) as inherited_tag(tag_id)
      join public.tag_definitions definition
        on definition.id::text = inherited_tag.tag_id
    ),
    '{}'::uuid[]
  ) as tag_ids
from public.menu_items weekly
where weekly.product_type = 'plan'
  and weekly.plan_frequency = 'weekly';

create view public.monthly_plan_nutrition_tags
with (security_invoker = true)
as
select
  link.monthly_plan_id,
  coalesce(
    array_agg(distinct weekly_tag.tag_id order by weekly_tag.tag_id)
      filter (where weekly_tag.tag_id is not null),
    '{}'::uuid[]
  ) as tag_ids
from public.monthly_plan_weeks link
left join public.weekly_plan_nutrition_tags weekly
  on weekly.weekly_plan_id = link.weekly_plan_id
left join lateral unnest(coalesce(weekly.tag_ids, '{}'::uuid[]))
  as weekly_tag(tag_id)
  on true
group by link.monthly_plan_id;

revoke all on public.weekly_plan_nutrition_tags, public.monthly_plan_nutrition_tags from public;
grant select on public.weekly_plan_nutrition_tags, public.monthly_plan_nutrition_tags to anon, authenticated;

comment on table public.monthly_plan_weeks is 'Relación ordenada y trazable de cuatro planes semanales por plan mensual; no duplica mealpreps.';
comment on view public.weekly_plan_nutrition_tags is 'Tags nutricionales únicos heredados desde mealpreps de cada semana.';
comment on view public.monthly_plan_nutrition_tags is 'Tags nutricionales únicos heredados desde las cuatro semanas de cada mensual.';

notify pgrst, 'reload schema';

commit;
