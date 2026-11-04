begin;
-- Additive: preserve every recipe, price, photo, legacy plan and pending payment.
alter table public.meal_library_items add column sale_category text check(sale_category in ('Pollo','Pavo','Vacuno','Pescados','Vegetarianos'));
alter table public.orders add column rewards_user_id uuid,
 add column rewards_eligible_units integer not null default 0 check(rewards_eligible_units>=0),
 add column rewards_eligible_subtotal bigint not null default 0 check(rewards_eligible_subtotal>=0),
 add column rewards_kind text check(rewards_kind in ('volume','weekly'));
create index orders_rewards_customer_paid on public.orders(rewards_user_id,paid_at) where checkout_mode='live' and payment_status='approved';

-- The existing order-item trigger must admit free individual purchases without
-- weakening the validation of historical grouped plans.
do $migration$
declare definition text;marker text:=' if g is null then';
begin
 select replace(pg_get_functiondef('public.capture_custom_plan()'::regprocedure),chr(13),'') into definition;
 if position(marker in definition)=0 then raise exception 'La validación de platos cambió. Revisar antes de aplicar';end if;
 definition:=replace(definition,marker,$branch$
 if new.product_snapshot->>'purchaseModel'='mix_v1' and exists(
  select 1 from public.orders where id=new.order_id and customer_snapshot->>'purchaseModel'='mix_v1'
   and customer_snapshot->>'operationalAuthority'='fullness'
 ) then
  select product_type into kind from public.menu_items where id=new.product_id and is_active and price_clp=new.unit_price_clp;
  if kind not in ('mealprep','family') or kind is null or new.product_snapshot->>'productType' is distinct from kind then raise exception 'Revisa los platos de tu selección';end if;
  if kind='mealprep' and not exists(select 1 from public.meal_library_items lr where lr.sale_menu_item_id=new.product_id and lr.is_active and lr.available_for_plans and lr.sale_price_clp=new.unit_price_clp) then raise exception 'Un mealprep ya no está disponible' using errcode='40001';end if;
  return new;
 end if;
 if g is null then$branch$);
 execute definition;
end $migration$;

create function public.quote_fullness_mix_rewards(p_user uuid,p_units integer,p_subtotal bigint,p_key uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare today timestamp:=(now() at time zone 'America/Santiago');month_start timestamp;week_start timestamp;
 completed integer:=0;prior_completed integer:=0;this_week_units integer:=0;claimed boolean:=false;weekly boolean:=false;rate integer:=0;message text;
begin
 if p_units is null or p_units<0 or p_subtotal is null or p_subtotal<0 then raise exception 'Revisa tu selección';end if;
 month_start:=date_trunc('month',today);week_start:=date_trunc('week',today);
 if p_user is not null then
  -- A week is completed by the sum of paid, non-cancelled individual units,
  -- not by requiring a single order of six. Only this calendar month's payments count.
  select count(*) filter(where units>=6)::integer,
   count(*) filter(where units>=6 and week<week_start)::integer,
   coalesce(sum(units) filter(where week=week_start),0)::integer
  into completed,prior_completed,this_week_units from (
   select date_trunc('week',paid_at at time zone 'America/Santiago') week,sum(rewards_eligible_units) units
   from public.orders where rewards_user_id=p_user and checkout_mode='live' and payment_status='approved'
    and coalesce(status,'') not in ('cancelled','refunded')
    and (paid_at at time zone 'America/Santiago')>=month_start
    and (paid_at at time zone 'America/Santiago')<month_start+interval '1 month'
   group by 1
  ) weeks;
  select exists(select 1 from public.orders o left join public.mealprep_sale_checkouts a on a.order_id=o.id
   where o.rewards_user_id=p_user and o.rewards_kind='weekly' and o.checkout_mode='live'
    and o.payment_status in ('pending','in_process','approved') and o.status not in ('cancelled','refunded')
    and date_trunc('month',o.ordered_at at time zone 'America/Santiago')=month_start
    and (p_key is null or a.checkout_key is distinct from p_key)) into claimed;
  weekly:=prior_completed=3 and this_week_units<6 and this_week_units+p_units>=6 and not claimed and p_units>0;
 end if;
 rate:=case when weekly then 35 when p_units>=24 then 10 else 0 end;
 message:=case when weekly then '¡Tu constancia tiene recompensa! Disfruta de un 35% de descuento en tu cuarta semana.'
  when completed>=4 then '¡Completaste tus cuatro semanas Fullness Rewards!'
  when claimed then 'Tu beneficio está asociado a una compra pendiente o ya realizada. Revisa esa compra antes de comenzar otra.'
  when completed=3 then '¡Te queda una semana para disfrutar tu beneficio!'
  when completed=2 then '¡Vas por la mitad! Ya completaste 2 de tus 4 semanas.'
  when completed=1 then '¡Comenzaste tu camino Fullness Rewards! Llevas 1 de 4 semanas.'
  else 'Elige tus favoritos y comienza tu camino Fullness Rewards.' end;
 return jsonb_build_object('rate',rate,'discount',round(p_subtotal*rate/100.0)::bigint,'kind',case when rate=35 then 'weekly' when rate=10 then 'volume' end,'completedWeeks',completed,'currentWeekUnits',this_week_units,'weeklyEligible',weekly,'message',message);
end $$;
revoke all on function public.quote_fullness_mix_rewards(uuid,integer,bigint,uuid) from public,anon,authenticated;
grant execute on function public.quote_fullness_mix_rewards(uuid,integer,bigint,uuid) to service_role;

-- Retain the previous callable implementation for old carts and exact retries.
alter function public.prepare_mealprep_sale_checkout(uuid,text,jsonb,jsonb) rename to prepare_library_plan_checkout;
create function public.prepare_mealprep_sale_checkout(p_key uuid,p_fingerprint text,p_order jsonb,p_lines jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.mealprep_sale_checkouts;m public.menu_items;lr public.meal_library_items;l jsonb;o uuid;
 subtotal bigint:=0;eligible bigint:=0;units integer:=0;reward jsonb;discount bigint;user_id uuid;
begin
 if p_order->'customer_snapshot'->>'purchaseModel' is distinct from 'mix_v1' then
  return public.prepare_library_plan_checkout(p_key,p_fingerprint,p_order,p_lines);
 end if;
 if p_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Revisa tu selección';end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-checkout:'||p_key::text,0));
 select * into a from public.mealprep_sale_checkouts where checkout_key=p_key for update;
 if a.checkout_key is not null then
  if a.fingerprint<>p_fingerprint then raise exception 'La compra cambió. Revisa tu selección' using errcode='40001';end if;return to_jsonb(a);
 end if;
 if not exists(select 1 from public.custom_plan_settings where id and stock_authority='fullness_sale_capacity_v1')
  or p_order->>'checkout_mode' not in ('live','test') or p_order->'customer_snapshot'->>'operationalAuthority' is distinct from 'fullness'
  or p_order->'customer_snapshot'->>'stockAuthority' is distinct from 'fullness_sale_capacity_v1' then raise exception 'No pudimos comprobar esta compra';end if;
 user_id:=nullif(p_order->>'rewards_user_id','')::uuid;
 if user_id is not null then perform pg_advisory_xact_lock(hashtextextended('fullness-rewards:'||user_id::text,0));end if;
 for l in select value from jsonb_array_elements(p_lines) order by value->>'product_id' loop
  select * into m from public.menu_items where id=(l->>'product_id')::uuid and is_active for share;
  if m.id is null or m.product_type not in ('mealprep','family') or m.price_clp<=0
   or l->>'quantity' is null or (l->>'quantity')::integer not between 1 and 1000 or (l->>'unit_price_clp')::bigint is distinct from m.price_clp::bigint
   or (l->>'total_clp')::bigint is distinct from m.price_clp::bigint*(l->>'quantity')::integer
   or l->'product_snapshot'->>'purchaseModel' is distinct from 'mix_v1'
   or l->'product_snapshot'->>'productType' is distinct from m.product_type then raise exception 'Un plato o su precio cambió. Revisa tu selección' using errcode='40001';end if;
  if m.product_type='mealprep' then
   select * into lr from public.meal_library_items where sale_menu_item_id=m.id and id=m.library_meal_id for share;
   if lr.id is null or not lr.is_active or not lr.available_for_plans or lr.sale_price_clp is distinct from m.price_clp
    or not exists(select 1 from public.custom_plan_settings where id and enabled) then raise exception 'Un plato ya no está disponible. Revisa tu selección' using errcode='40001';end if;
   units:=units+(l->>'quantity')::integer;eligible:=eligible+(l->>'total_clp')::bigint;
  end if;
  subtotal:=subtotal+(l->>'total_clp')::bigint;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_lines) x group by x->>'product_id' having sum((x->>'quantity')::integer)>1000) then raise exception 'Revisa las cantidades de tu selección';end if;
 reward:=public.quote_fullness_mix_rewards(case when p_order->>'checkout_mode'='live' then user_id end,units,eligible,p_key);
 discount:=(reward->>'discount')::bigint;
 if (p_order->>'discount_clp')::bigint is distinct from discount or (p_order->>'delivery_fee_clp')::bigint is distinct from 0::bigint
  or (p_order->>'subtotal_clp')::bigint is distinct from subtotal or (p_order->>'total_clp')::bigint is distinct from subtotal-discount
  or p_order->>'currency' is distinct from 'CLP' then raise exception 'El total cambió. Revisa tu selección' using errcode='40001';end if;
 o:=(p_order->>'id')::uuid;
 insert into public.orders(id,checkout_mode,status,payment_status,delivery_status,subtotal_clp,discount_clp,delivery_fee_clp,total_clp,currency,note,customer_snapshot,rewards_user_id,rewards_eligible_units,rewards_eligible_subtotal,rewards_kind)
 values(o,p_order->>'checkout_mode','pending_payment','pending','pending',subtotal,discount,0,subtotal-discount,'CLP',p_order->>'note',p_order->'customer_snapshot'||jsonb_build_object('availabilityMode','active_only','rewards',reward),user_id,units,eligible,reward->>'kind');
 for l in select value from jsonb_array_elements(p_lines) loop
  insert into public.order_items(order_id,product_id,quantity,unit_price_clp,total_clp,product_name,product_snapshot,ingredients,nutrition_description)
  values(o,(l->>'product_id')::uuid,(l->>'quantity')::integer,(l->>'unit_price_clp')::bigint,(l->>'total_clp')::bigint,l->>'product_name',l->'product_snapshot',array(select jsonb_array_elements_text(coalesce(l->'ingredients','[]'::jsonb))),l->>'nutrition_description');
 end loop;
 insert into public.mealprep_sale_checkouts(checkout_key,order_id,fingerprint,quantities) values(p_key,o,p_fingerprint,'{}') returning * into a;
 insert into public.mealprep_sale_sync_outbox(event_key,event_type,payload) values('order:'||o::text,'order_created',jsonb_build_object('order',p_order,'items',p_lines));
 return to_jsonb(a);
end $$;
revoke all on function public.prepare_mealprep_sale_checkout(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_mealprep_sale_checkout(uuid,text,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
