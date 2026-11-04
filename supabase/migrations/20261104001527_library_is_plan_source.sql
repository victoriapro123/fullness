begin;
-- The original library is the only editable source. No recipe is replaced or added.
alter table public.meal_library_items
 add column sale_price_clp bigint check (sale_price_clp between 1 and 1000000),
 add column available_for_plans boolean not null default false,
 add column sale_menu_item_id uuid unique references public.menu_items(id) deferrable initially deferred;

-- Reuse only explicit existing editorial links, never name similarity.
do $$ begin
 if exists(select library_meal_id from public.menu_items where product_type='mealprep' and library_meal_id is not null group by library_meal_id having count(*)>1) then
  raise exception 'Hay fichas con más de un precio vinculado. Revisar antes de continuar';
 end if;
end $$;
update public.meal_library_items l set
 sale_price_clp=nullif(m.price_clp,0), sale_menu_item_id=m.id,
 available_for_plans=l.is_active and m.is_active and m.price_clp>0 and coalesce(c.published,false)
from public.menu_items m left join public.mealprep_sale_capacity c on c.menu_item_id=m.id
where m.library_meal_id=l.id and m.product_type='mealprep';

create function public.validate_library_plan_offer() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and old.sale_menu_item_id is not null and new.sale_menu_item_id is distinct from old.sale_menu_item_id then
  raise exception 'La identidad del plato no se puede cambiar';
 end if;
 if new.available_for_plans and (new.sale_price_clp is null or new.sale_price_clp<=0) then
  raise exception 'Indica el precio del mealprep para dejarlo disponible';
 end if;
 if new.sale_menu_item_id is null then new.sale_menu_item_id:=gen_random_uuid(); end if;
 if exists(select 1 from public.menu_items m where m.id=new.sale_menu_item_id and (m.product_type<>'mealprep' or m.library_meal_id is distinct from new.id)) then
  raise exception 'Esta ficha ya pertenece a otro producto';
 end if;
 return new;
end $$;

create function public.project_library_plan_offer() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.menu_items as m(id,slug,sku,name,tag,description,photo_url,photo_storage_path,
 secondary_photo_url,secondary_photo_storage_path,price_clp,currency,ingredients,
 nutrition_description,nutrition_facts,nutrition_highlights,benefit_tags,benefit_assignments,
 tag_ids,allergens,is_active,product_type,library_meal_id,serving_label,purchase_label,metadata)
 values(new.sale_menu_item_id,'mealprep-biblioteca-'||new.id::text,'MP-'||new.id::text,new.name,new.tag,new.description,
 new.photo_url,new.photo_storage_path,new.secondary_photo_url,new.secondary_photo_storage_path,
 coalesce(new.sale_price_clp,0),'CLP',new.ingredients,new.nutrition_description,new.nutrition_facts,
 new.nutrition_highlights,new.benefit_tags,new.benefit_assignments,new.tag_ids,new.allergens,
 new.is_active,'mealprep',new.id,'1 persona','Elegir en mi plan',
 jsonb_build_object('pricingAuthority','fullness','editorialRecipeId',new.id,'ingredientsText',array_to_string(new.ingredients,', ')))
 on conflict(id) do update set name=excluded.name,tag=excluded.tag,description=excluded.description,
 photo_url=excluded.photo_url,photo_storage_path=excluded.photo_storage_path,
 secondary_photo_url=excluded.secondary_photo_url,secondary_photo_storage_path=excluded.secondary_photo_storage_path,
 price_clp=excluded.price_clp,ingredients=excluded.ingredients,nutrition_description=excluded.nutrition_description,
 nutrition_facts=excluded.nutrition_facts,nutrition_highlights=excluded.nutrition_highlights,
 benefit_tags=excluded.benefit_tags,benefit_assignments=excluded.benefit_assignments,tag_ids=excluded.tag_ids,
 allergens=excluded.allergens,is_active=excluded.is_active,metadata=m.metadata||excluded.metadata;
 return new;
end $$;
revoke all on function public.validate_library_plan_offer() from public,anon,authenticated;
revoke all on function public.project_library_plan_offer() from public,anon,authenticated;
create trigger validate_library_plan_offer before insert or update on public.meal_library_items
 for each row execute function public.validate_library_plan_offer();
create trigger project_library_plan_offer after insert or update on public.meal_library_items
 for each row execute function public.project_library_plan_offer();
-- Allocate technical sale identities, preserving the original library fields and IDs.
update public.meal_library_items set sale_menu_item_id=coalesce(sale_menu_item_id,gen_random_uuid());

-- Keep all prior checkout/payment settlement functions intact; validate new purchases
-- against the library instead of the retired stock/publication editor.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.prepare_mealprep_sale_checkout(uuid,text,jsonb,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,chr(13),'');
 if position('select * into cap from public.mealprep_sale_capacity where menu_item_id=demand.id for update;' in definition)=0 then
  raise exception 'La validación de compra cambió. Revisar la migración antes de aplicar';
 end if;
 definition:=replace(definition,
  'select * into cap from public.mealprep_sale_capacity where menu_item_id=demand.id for update;'||chr(10)||
  '  if cap.menu_item_id is null or not cap.published then raise exception ''Un mealprep está inactivo. Revisa tu selección'' using errcode=''40001'';end if;',
  'if not exists(select 1 from public.meal_library_items lr join public.menu_items mi on mi.id=lr.sale_menu_item_id and mi.library_meal_id=lr.id where mi.id=demand.id and lr.is_active and lr.available_for_plans and lr.sale_price_clp=mi.price_clp for share of lr) then raise exception ''Un mealprep ya no está disponible. Revisa tu selección'' using errcode=''40001'';end if;');
 if position('not cap.published' in definition)>0 then raise exception 'No se pudo actualizar la validación de disponibilidad';end if;
 -- Lock library rows before technical products, matching the save-trigger order.
 definition:=regexp_replace(definition,'for l in select value from jsonb_array_elements\(p_lines\) loop',
  'perform lr.id from public.meal_library_items lr where lr.sale_menu_item_id in (select (x->>''product_id'')::uuid from jsonb_array_elements(p_lines) x) order by lr.id for share;'||chr(10)||' for l in select value from jsonb_array_elements(p_lines) loop');
 execute definition;
end $migration$;
create or replace function public.capture_custom_plan() returns trigger language plpgsql security invoker set search_path='' as $$
declare g jsonb;c public.stock_letters;existing public.order_custom_plans;kind text;library_owned boolean;
begin
 g:=new.product_snapshot->'customPlan';
 if g is null then
  select product_type into kind from public.menu_items where id=new.product_id;
  if kind='mealprep' or (kind is distinct from 'family' and exists(select 1 from public.custom_plan_settings where enabled)) then
   raise exception 'Los mealpreps se eligen dentro de un plan. Los familiares se compran por separado';
  end if;return new;
 end if;
 if jsonb_typeof(g) is distinct from 'object' or coalesce(g->>'id','')='' or coalesce(g->>'letterId','')=''
  or coalesce(g->>'revision','') !~ '^[1-9][0-9]*$' or coalesce(g->>'size','') not in ('6','24')
  or coalesce(g->>'quantity','') !~ '^[1-9][0-9]*$' or coalesce(g->>'unitTotal','') !~ '^[1-9][0-9]*$' then raise exception 'Revisa los platos del plan';end if;
 select * into c from public.stock_letters where id=(g->>'letterId')::uuid for share;
 select coalesce(customer_snapshot->>'operationalAuthority'='fullness' and customer_snapshot->>'availabilityMode'='active_only',false)
  into library_owned from public.orders where id=new.order_id;
 if c.id is null or c.state<>'active' or c.revision<>(g->>'revision')::integer
  or (not library_owned and (now() at time zone 'America/Santiago')::date not between c.starts_on and c.ends_on-1)
  then raise exception 'Los platos disponibles cambiaron. Revisa tu selección' using errcode='40001';end if;
 if not (g->>'size')::integer=any(c.plan_sizes) or new.product_snapshot->>'planStructure' is distinct from 'custom_stock_plan_v1'
  or not exists(select 1 from public.menu_items where id=new.product_id and product_type='mealprep') then raise exception 'Revisa los platos del plan';end if;
 if library_owned then
  if not exists(select 1 from public.meal_library_items lr join public.menu_items mi on mi.id=lr.sale_menu_item_id and mi.library_meal_id=lr.id
   where mi.id=new.product_id and lr.is_active and lr.available_for_plans and lr.sale_price_clp=new.unit_price_clp) then
   raise exception 'Un mealprep ya no está disponible. Revisa tu selección' using errcode='40001';end if;
 elsif not exists(select 1 from public.stock_letter_items where letter_id=c.id and menu_item_id=new.product_id) then raise exception 'Revisa los platos del plan';end if;
 insert into public.order_custom_plans(id,order_id,letter_id,snapshot) values((g->>'id')::uuid,new.order_id,c.id,g) on conflict(id) do nothing;
 select * into existing from public.order_custom_plans where id=(g->>'id')::uuid;
 if existing.order_id<>new.order_id or existing.snapshot<>g then raise exception 'Identidad de plan inconsistente';end if;
 return new;
end $$;
revoke all on function public.capture_custom_plan() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
