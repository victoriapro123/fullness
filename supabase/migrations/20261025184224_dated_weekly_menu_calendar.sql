begin;

create table public.weekly_dispatch_menus (
  week_of date primary key check (extract(isodow from week_of) = 1),
  weekly_plan_id uuid not null references public.menu_items(id) on delete restrict,
  published boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create index weekly_dispatch_menu_plan_idx on public.weekly_dispatch_menus(weekly_plan_id);
alter table public.weekly_dispatch_menus enable row level security;
revoke all on public.weekly_dispatch_menus from public, anon, authenticated;
grant select on public.weekly_dispatch_menus to anon, authenticated;
grant all on public.weekly_dispatch_menus to service_role;
create policy dispatch_calendar_public_read on public.weekly_dispatch_menus for select to anon, authenticated
  using (published and exists(select 1 from public.menu_items m where m.id=weekly_plan_id and m.is_active and m.product_type='plan' and m.plan_frequency='weekly'));

create table public.order_plan_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  delivery_number smallint not null check(delivery_number between 1 and 4),
  week_of date not null check(extract(isodow from week_of)=1),
  dispatch_on date not null check(extract(isodow from dispatch_on) in (2,5)),
  weekly_plan_id uuid references public.menu_items(id) on delete restrict,
  menu_snapshot jsonb,
  calendar_revision integer,
  updated_at timestamptz not null default now(),
  unique(order_item_id,delivery_number),
  check(dispatch_on between week_of and week_of+6),
  check((weekly_plan_id is null and menu_snapshot is null) or (weekly_plan_id is not null and menu_snapshot is not null and jsonb_typeof(menu_snapshot)='object'))
);
create index order_plan_deliveries_week_idx on public.order_plan_deliveries(week_of,dispatch_on);
create index order_plan_deliveries_plan_idx on public.order_plan_deliveries(weekly_plan_id);
alter table public.order_plan_deliveries enable row level security;
revoke all on public.order_plan_deliveries from public,anon,authenticated;
grant all on public.order_plan_deliveries to service_role;

create table public.dispatch_calendar_audit (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  order_delivery_id uuid,
  actor_id uuid,
  action text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);
create index dispatch_calendar_audit_week_idx on public.dispatch_calendar_audit(week_of,created_at);
alter table public.dispatch_calendar_audit enable row level security;
revoke all on public.dispatch_calendar_audit from public,anon,authenticated;
grant select,insert on public.dispatch_calendar_audit to service_role;

create function public.dispatch_menu_snapshot(p_plan_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('weeklyPlanId',id,'name',name,'sku',sku,'slug',slug,'mealpreps',included_items,'sourceUpdatedAt',updated_at)
 from public.menu_items where id=p_plan_id and product_type='plan' and plan_frequency='weekly' and is_active
$$;
revoke all on function public.dispatch_menu_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.dispatch_menu_snapshot(uuid) to service_role;

create function public.next_plan_dispatch(p_now timestamptz default now()) returns date
language sql stable security invoker set search_path='' as $$
 select case when local_time <= monday+interval '17 hours' then (monday+1)::date
             when local_time <= monday+interval '3 days 17 hours' then (monday+4)::date
             else (monday+8)::date end
 from (select p_now at time zone 'America/Santiago' as local_time,
              date_trunc('week',p_now at time zone 'America/Santiago')::date as monday) c
$$;
revoke all on function public.next_plan_dispatch(timestamptz) from public,anon,authenticated;
grant execute on function public.next_plan_dispatch(timestamptz) to service_role;

-- Calendar mutations are owner-authorized by the API, then performed in one
-- transaction. No client write policy or SECURITY DEFINER escape hatch.
create function public.save_dispatch_menu(p_week_of date,p_weekly_plan_id uuid,p_published boolean,p_revision integer,p_actor uuid,p_reassign boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare old_row public.weekly_dispatch_menus; new_row public.weekly_dispatch_menus;
  plan public.menu_items; snapshot jsonb; d record; changed integer:=0;
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'Administración requerida' using errcode='42501'; end if;
  if extract(isodow from p_week_of)<>1 or p_week_of < date_trunc('week',now() at time zone 'America/Santiago')::date then
    raise exception 'Selecciona una semana vigente o futura (lunes)'; end if;
  perform pg_advisory_xact_lock(hashtext('fullness_dispatch_calendar'));
  select * into old_row from public.weekly_dispatch_menus where week_of=p_week_of for update;
  if coalesce(old_row.revision,0) is distinct from p_revision then raise exception 'La programación cambió. Recarga antes de guardar' using errcode='40001'; end if;
  select * into plan from public.menu_items where id=p_weekly_plan_id for share;
  if plan.id is null or plan.product_type<>'plan' or plan.plan_frequency<>'weekly' or not plan.is_active
    or coalesce(plan.metadata->'availability'->>'mode','always')='paused'
    or jsonb_typeof(plan.included_items)<>'array' or jsonb_array_length(plan.included_items)<>6 then
    raise exception 'Elige un plan semanal visible y completo de seis mealpreps'; end if;
  if (select count(distinct coalesce(nullif(x->>'libraryMealId',''),nullif(x->>'library_meal_id',''),nullif(x->>'id',''))) from jsonb_array_elements(plan.included_items) x)<>6 then
    raise exception 'Los seis mealpreps deben ser distintos'; end if;
  snapshot:=public.dispatch_menu_snapshot(p_weekly_plan_id);
  for d in select pd.* from public.order_plan_deliveries pd join public.order_items oi on oi.id=pd.order_item_id join public.orders o on o.id=oi.order_id
    where pd.week_of=p_week_of and pd.dispatch_on >= (now() at time zone 'America/Santiago')::date
      and o.status not in ('cancelled','refunded') and o.delivery_status not in ('delivered','cancelled') for update of pd
  loop
    if not p_published then raise exception 'Hay entregas pendientes; reemplaza el menú, no retires su programación'; end if;
    if d.weekly_plan_id is not null and (d.weekly_plan_id<>p_weekly_plan_id or d.menu_snapshot is distinct from snapshot) and not p_reassign then
      raise exception 'Confirma aplicar el cambio a las entregas pendientes'; end if;
  end loop;
  insert into public.weekly_dispatch_menus(week_of,weekly_plan_id,published,revision)
    values(p_week_of,p_weekly_plan_id,p_published,coalesce(old_row.revision,0)+1)
    on conflict(week_of) do update set weekly_plan_id=excluded.weekly_plan_id,published=excluded.published,revision=excluded.revision,updated_at=clock_timestamp()
    returning * into new_row;
  insert into public.dispatch_calendar_audit(week_of,actor_id,action,before_value,after_value)
    values(p_week_of,p_actor,'calendar_saved',to_jsonb(old_row),to_jsonb(new_row));
  if p_published then
    for d in select pd.* from public.order_plan_deliveries pd join public.order_items oi on oi.id=pd.order_item_id join public.orders o on o.id=oi.order_id
      where pd.week_of=p_week_of and pd.dispatch_on >= (now() at time zone 'America/Santiago')::date and o.status not in ('cancelled','refunded') and o.delivery_status not in ('delivered','cancelled')
    loop
      if d.weekly_plan_id is distinct from p_weekly_plan_id or d.menu_snapshot is distinct from snapshot then
        update public.order_plan_deliveries set weekly_plan_id=p_weekly_plan_id,menu_snapshot=snapshot,calendar_revision=new_row.revision,updated_at=clock_timestamp() where id=d.id;
        insert into public.dispatch_calendar_audit(week_of,order_delivery_id,actor_id,action,before_value,after_value)
          values(p_week_of,d.id,p_actor,'delivery_assigned',to_jsonb(d),jsonb_build_object('weeklyPlanId',p_weekly_plan_id,'menu',snapshot,'revision',new_row.revision));
        changed:=changed+1;
      end if;
    end loop;
  end if;
  return jsonb_build_object('calendar',to_jsonb(new_row),'assignedDeliveries',changed);
end $$;
revoke all on function public.save_dispatch_menu(date,uuid,boolean,integer,uuid,boolean) from public,anon,authenticated;
grant execute on function public.save_dispatch_menu(date,uuid,boolean,integer,uuid,boolean) to service_role;

create function public.capture_order_plan_deliveries() returns trigger
language plpgsql security invoker set search_path='' as $$
declare entry jsonb; calendar public.weekly_dispatch_menus; expected_count integer; position integer:=0;
  dispatch_date date; menu_week date; first_date date; new_delivery uuid;
begin
  if new.product_snapshot->>'planStructure' <> 'dispatch_calendar_v1' or new.product_snapshot->>'planStructure' is null then return new; end if;
  if new.product_snapshot->>'productType'<>'plan' then raise exception 'Plan inválido'; end if;
  perform pg_advisory_xact_lock(hashtext('fullness_dispatch_calendar'));
  expected_count:=case when new.product_snapshot->>'planFrequency'='monthly' then 4 else 1 end;
  if jsonb_typeof(new.product_snapshot->'dispatchPlan')<>'array' or jsonb_array_length(new.product_snapshot->'dispatchPlan')<>expected_count then raise exception 'Calendario de entregas incompleto'; end if;
  for entry in select * from jsonb_array_elements(new.product_snapshot->'dispatchPlan') loop
    position:=position+1; dispatch_date:=(entry->>'dispatchOn')::date; menu_week:=(entry->>'weekOf')::date;
    if dispatch_date is null or menu_week is null or (entry->>'deliveryNumber')::integer is distinct from position then raise exception 'Entrega sin fecha o posición'; end if;
    if position=1 then first_date:=dispatch_date; end if;
    if expected_count=4 and (first_date<>public.next_plan_dispatch(clock_timestamp()) or dispatch_date<>first_date+7*(position-1)) then raise exception 'El corte cambió. Revisa el calendario antes de pagar'; end if;
    if expected_count=1 then
      if dispatch_date<public.next_plan_dispatch(clock_timestamp()) or menu_week<>date_trunc('week',dispatch_date::timestamp)::date then raise exception 'El menú ya cerró pedidos'; end if;
    end if;
    select * into calendar from public.weekly_dispatch_menus where week_of=menu_week and published;
    if coalesce(calendar.revision,0)<>coalesce((entry->>'calendarRevision')::integer,0) then raise exception 'El menú programado cambió. Revisa el pedido'; end if;
    if expected_count=1 and (calendar.weekly_plan_id is distinct from new.product_id or calendar.week_of is null) then raise exception 'Este menú no corresponde a la semana'; end if;
    if calendar.weekly_plan_id is not null and public.dispatch_menu_snapshot(calendar.weekly_plan_id) is null then raise exception 'El menú ya no está disponible'; end if;
    insert into public.order_plan_deliveries(order_item_id,delivery_number,week_of,dispatch_on,weekly_plan_id,menu_snapshot,calendar_revision)
      values(new.id,position,menu_week,dispatch_date,calendar.weekly_plan_id,public.dispatch_menu_snapshot(calendar.weekly_plan_id),calendar.revision) returning id into new_delivery;
    insert into public.dispatch_calendar_audit(week_of,order_delivery_id,action,after_value) values(menu_week,new_delivery,'delivery_created',entry);
  end loop;
  return new;
end $$;
revoke all on function public.capture_order_plan_deliveries() from public,anon,authenticated;
grant execute on function public.capture_order_plan_deliveries() to service_role;
create trigger capture_order_plan_deliveries after insert on public.order_items for each row execute function public.capture_order_plan_deliveries();

-- Preserve the weekly six-meal guard and the legacy monthly relation. Only
-- calendar-based monthly products stop requiring four static linked recipes.
do $$ declare definition text; changed text; begin
  definition:=pg_get_functiondef('public.validate_menu_item_plan_composition()'::regprocedure);
  changed:=regexp_replace(definition,'if new.is_active is true then([[:space:]]+)select count\(\*\)',
    'if new.is_active is true and coalesce(new.metadata->>''dispatch_policy'','''') <> ''calendar_v1'' then\1select count(*)');
  changed:=replace(changed,'and monthly.is_active is true','and monthly.is_active is true and coalesce(monthly.metadata->>''dispatch_policy'','''') <> ''calendar_v1''');
  if changed=definition then raise exception 'No se encontró la validación esperada; revisar esquema antes de modificar'; end if;
  execute changed;
end $$;
update public.menu_items set metadata=coalesce(metadata,'{}'::jsonb)||'{"dispatch_policy":"calendar_v1"}'::jsonb where product_type='plan' and plan_frequency='monthly';

-- Bootstrap only existing explicit dates. Never generate a repeat cycle.
insert into public.weekly_dispatch_menus(week_of,weekly_plan_id,published)
select date_trunc('week',(metadata->'availability'->>'starts_on')::date::timestamp)::date,id,true
from public.menu_items where product_type='plan' and plan_frequency='weekly' and is_active
  and metadata->'availability'->>'mode'='scheduled' and metadata->'availability'->>'starts_on' ~ '^\d{4}-\d{2}-\d{2}$';
insert into public.dispatch_calendar_audit(week_of,action,after_value)
select week_of,'initial_explicit_schedule',to_jsonb(c) from public.weekly_dispatch_menus c;

notify pgrst,'reload schema';
commit;
