begin;
-- Carlos, 31/10: six/twenty-four components; each week of six allows
-- only one repeated canonical dish (two units), all others distinct;
-- family portions remain ordinary independent products. No stock is reserved.
alter table public.stock_letter_audit add column policy_source text;
alter table public.stock_letter_audit enable row level security;
alter table public.stock_letter_audit alter column actor_id drop not null;
alter table public.stock_letter_audit add constraint stock_letter_audit_authority
 check(actor_id is not null or policy_source='carlos_20261031_six_twentyfour_one_duplicate_weekly');
alter table public.stock_letters add column max_per_meal smallint not null default 2 check(max_per_meal=2);
alter table public.stock_letters add column max_duplicate_dishes_per_week smallint not null default 1 check(max_duplicate_dishes_per_week=1);
alter table public.stock_letters alter column plan_sizes set default array[6,24];
with previous as materialized(select * from public.stock_letters where state='draft' and (plan_sizes<>array[6,24] or family_in_plans)),
 changed as(update public.stock_letters l set plan_sizes=array[6,24],family_in_plans=false,revision=l.revision+1,updated_at=clock_timestamp()
 from previous p where l.id=p.id returning l.*)
insert into public.stock_letter_audit(letter_id,actor_id,policy_source,before_value,after_value)
select c.id,null,'carlos_20261031_six_twentyfour_one_duplicate_weekly',to_jsonb(p),to_jsonb(c) from changed c join previous p using(id);
-- NOT VALID preserves any historical closed letter; every new/updated row is checked.
alter table public.stock_letters add constraint stock_letter_fixed_formats check(plan_sizes=array[6,24] and not family_in_plans) not valid;

create function public.enforce_custom_plan_selection() returns trigger language plpgsql security invoker set search_path='' as $$
declare g jsonb; meal jsonb; n integer; w integer;
begin
 g:=new.product_snapshot->'customPlan';
 if g is null then return new; end if;
 if coalesce(g->>'size','') not in ('6','24') or jsonb_typeof(g->'items') is distinct from 'array'
 then raise exception 'El plan debe tener 6 o 24 mealpreps'; end if;
 for meal in select value from jsonb_array_elements(g->'items') loop
  if coalesce(meal->>'quantity','') !~ '^[1-2]$' or coalesce(meal->>'week','') !~ '^[1-4]$'
    or ((g->>'size')::integer=6 and meal->>'week'<>'1')
    or coalesce(meal->>'menuItemId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   then raise exception 'Máximo 2 unidades del mismo mealprep en una semana válida'; end if;
  if not exists(select 1 from public.menu_items where id=(meal->>'menuItemId')::uuid and product_type='mealprep')
   then raise exception 'Los familiares se compran aparte, no dentro del plan'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(g->'items') x group by x->>'week',x->>'menuItemId' having sum((x->>'quantity')::integer)>2)
 then raise exception 'Máximo 2 unidades del mismo mealprep en una semana'; end if;
 if exists(select 1 from jsonb_array_elements(g->'items') x
   left join public.core360_product_mappings m on m.source_menu_item_id=(x->>'menuItemId')::uuid and m.is_active
   where m.core_item_id is null or coalesce(x->>'coreItemId','')<>m.core_item_id::text)
 then raise exception 'Identidad canónica Core360 no confirmada'; end if;
 if exists(select 1 from jsonb_array_elements(g->'items') x group by x->>'week',x->>'coreItemId' having sum((x->>'quantity')::integer)>2)
 then raise exception 'Máximo 2 unidades de la misma identidad canónica por semana'; end if;
 if exists(select 1 from (select x->>'week' w,x->>'coreItemId' core,sum((x->>'quantity')::integer) qty
   from jsonb_array_elements(g->'items') x group by x->>'week',x->>'coreItemId') q where q.qty=2 group by q.w having count(*)>1)
 then raise exception 'Sólo un plato puede estar duplicado en cada semana'; end if;
 for w in 1..case when (g->>'size')::integer=24 then 4 else 1 end loop
   select sum((x->>'quantity')::integer) into n from jsonb_array_elements(g->'items') x where (x->>'week')::integer=w;
   if n is distinct from 6 then raise exception 'Completa exactamente 6 mealpreps en cada semana'; end if;
 end loop;
 return new;
end $$;
revoke all on function public.enforce_custom_plan_selection() from public,anon,authenticated;
create trigger enforce_custom_plan_selection before insert on public.order_items for each row execute function public.enforce_custom_plan_selection();

create or replace function public.capture_custom_plan() returns trigger language plpgsql security invoker set search_path='' as $$
declare g jsonb; c public.stock_letters; existing public.order_custom_plans; kind text;
begin
 g:=new.product_snapshot->'customPlan';
 if g is null then
   select product_type into kind from public.menu_items where id=new.product_id;
   if kind='mealprep' or (kind is distinct from 'family' and exists(select 1 from public.custom_plan_settings where enabled))
     then raise exception 'Los mealpreps sólo se compran asignados a planes; los familiares se venden aparte'; end if;
   return new;
 end if;
 if jsonb_typeof(g) is distinct from 'object' or coalesce(g->>'id','')='' or coalesce(g->>'letterId','')=''
   or coalesce(g->>'revision','') !~ '^[1-9][0-9]*$' or coalesce(g->>'size','') not in ('6','24')
   or coalesce(g->>'quantity','') !~ '^[1-9][0-9]*$' or coalesce(g->>'unitTotal','') !~ '^[1-9][0-9]*$'
 then raise exception 'Identidad de plan incompleta'; end if;
 select * into c from public.stock_letters where id=(g->>'letterId')::uuid for share;
 if c.id is null or c.state<>'active' or c.revision<>(g->>'revision')::integer
   or (now() at time zone 'America/Santiago')::date not between c.starts_on and c.ends_on-1
   then raise exception 'La carta cambió o cerró; revisa la selección antes de pagar' using errcode='40001'; end if;
 if not (g->>'size')::integer=any(c.plan_sizes) or new.product_snapshot->>'planStructure'<>'custom_stock_plan_v1'
   or not exists(select 1 from public.stock_letter_items where letter_id=c.id and menu_item_id=new.product_id)
   or not exists(select 1 from public.menu_items where id=new.product_id and product_type='mealprep')
   then raise exception 'Composición fuera de la carta'; end if;
 insert into public.order_custom_plans(id,order_id,letter_id,snapshot)
 values((g->>'id')::uuid,new.order_id,c.id,g) on conflict(id) do nothing;
 select * into existing from public.order_custom_plans where id=(g->>'id')::uuid;
 if existing.order_id<>new.order_id or existing.snapshot<>g then raise exception 'Identidad de plan inconsistente'; end if;
 return new;
end $$;
revoke all on function public.capture_custom_plan() from public,anon,authenticated;
create or replace function public.validate_custom_plan_totals() returns trigger language plpgsql security invoker set search_path='' as $$
declare g jsonb; units bigint; total bigint; part record; actual_units bigint;
begin
 g:=new.product_snapshot->'customPlan'; if g is null then return null; end if;
 select sum(quantity),sum(total_clp) into units,total from public.order_items
 where order_id=new.order_id and product_snapshot->'customPlan'->>'id'=g->>'id';
 if units<>(g->>'size')::integer*(g->>'quantity')::integer or total<>(g->>'unitTotal')::bigint*(g->>'quantity')::integer
 then raise exception 'El plan debe contener todos sus platos y su suma exacta'; end if;
 for part in select (x->>'menuItemId')::uuid as menu_id,sum((x->>'quantity')::integer) as wanted
   from jsonb_array_elements(g->'items') x group by x->>'menuItemId'
 loop
   select coalesce(sum(quantity),0) into actual_units from public.order_items
   where order_id=new.order_id and product_id=part.menu_id and product_snapshot->'customPlan'->>'id'=g->>'id';
   if actual_units<>part.wanted*(g->>'quantity')::integer then raise exception 'Las líneas no coinciden con los platos elegidos'; end if;
 end loop;
 if exists(select 1 from public.order_items oi where oi.order_id=new.order_id and oi.product_snapshot->'customPlan'->>'id'=g->>'id'
   and not exists(select 1 from jsonb_array_elements(g->'items') x where (x->>'menuItemId')::uuid=oi.product_id))
 then raise exception 'Plato no elegido dentro del plan'; end if;
 return null;
end $$;
revoke all on function public.validate_custom_plan_totals() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
