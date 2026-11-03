begin;
-- Keep previous quantities and reservations for historical pending payments.
create function public.save_mealprep_sale_visibility(p_menu_id uuid,p_published boolean,p_revision integer,p_request_key uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cap public.mealprep_sale_capacity;prior public.mealprep_sale_capacity_updates;payload jsonb;result jsonb;before_json jsonb;
begin
 if p_menu_id is null or p_request_key is null or p_published is null or p_revision is null or p_revision<0 or not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'No tienes permiso para guardar este plato';end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-update:'||p_actor::text||':'||p_request_key::text,0));
 payload:=jsonb_build_object('action','visibility','published',p_published,'revision',p_revision);
 select * into prior from public.mealprep_sale_capacity_updates where actor_id=p_actor and request_key=p_request_key;
 if prior.request_key is not null then if prior.menu_item_id<>p_menu_id or prior.payload<>payload then raise exception 'El cambio ya tiene otro contenido';end if;return prior.after_value;end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-capacity:'||p_menu_id::text,0));
 if not exists(select 1 from public.menu_items where id=p_menu_id and product_type='mealprep' and is_active) then raise exception 'No encontramos ese plato';end if;
 select * into cap from public.mealprep_sale_capacity where menu_item_id=p_menu_id for update;
 if coalesce(cap.revision,0)<>p_revision then raise exception 'El plato cambió. Actualiza la lista' using errcode='40001';end if;
 before_json:=to_jsonb(cap);
 insert into public.mealprep_sale_capacity(menu_item_id,published,revision,updated_by) values(p_menu_id,p_published,p_revision+1,p_actor)
 on conflict(menu_item_id) do update set published=excluded.published,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into cap;
 result:=jsonb_build_object('status','saved','menuItemId',p_menu_id,'published',cap.published,'revision',cap.revision);
 insert into public.mealprep_sale_capacity_updates(menu_item_id,actor_id,request_key,payload,before_value,after_value) values(p_menu_id,p_actor,p_request_key,payload,before_json,result);
 insert into public.mealprep_sale_sync_outbox(event_key,event_type,payload) values('visibility:'||p_actor::text||':'||p_request_key::text,'offer_visibility_changed',result);
 return result;
end $$;
create or replace function public.prepare_mealprep_sale_checkout(p_key uuid,p_fingerprint text,p_order jsonb,p_lines jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare attempt public.mealprep_sale_checkouts;o uuid;l jsonb;m public.menu_items;cap public.mealprep_sale_capacity;
 demand record;quantities jsonb;subtotal bigint:=0;fee bigint;total bigint;
begin
 if p_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 500 then raise exception 'Revisa el carrito antes de pagar';end if;
 if jsonb_typeof(p_order) is distinct from 'object' or not(p_order ?& array['id','checkout_mode','customer_snapshot','delivery_fee_clp','discount_clp','subtotal_clp','total_clp','currency']) then raise exception 'Revisa los datos de la compra';end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-checkout:'||p_key::text,0));
 select * into attempt from public.mealprep_sale_checkouts where checkout_key=p_key for update;
 if attempt.checkout_key is not null then if attempt.fingerprint<>p_fingerprint then raise exception 'La compra cambió. Revisa el carrito antes de continuar' using errcode='40001';end if;return to_jsonb(attempt);end if;
 if not exists(select 1 from public.custom_plan_settings where id and stock_authority='fullness_sale_capacity_v1') then raise exception 'La tienda no pudo comprobar la disponibilidad. Inténtalo nuevamente';end if;
 if coalesce(p_order->>'checkout_mode','') not in ('live','test') or (p_order->'customer_snapshot'->>'operationalAuthority') is distinct from 'fullness' or (p_order->'customer_snapshot'->>'stockAuthority') is distinct from 'fullness_sale_capacity_v1' then raise exception 'Revisa la compra';end if;
 for l in select value from jsonb_array_elements(p_lines) loop
  select * into m from public.menu_items where id=(l->>'product_id')::uuid and is_active for share;
  if m.id is null or m.product_type not in ('mealprep','family') or m.price_clp<=0 or l->>'quantity' is null or (l->>'quantity')::integer not between 1 and 10000 or (l->>'unit_price_clp')::bigint is distinct from m.price_clp::bigint or (l->>'total_clp')::bigint is distinct from m.price_clp::bigint*(l->>'quantity')::integer then raise exception 'Un plato o su precio cambió. Revisa el carrito' using errcode='40001';end if;
  if m.product_type='mealprep' and (jsonb_typeof(l->'product_snapshot'->'customPlan') is distinct from 'object') then raise exception 'Los mealpreps se compran dentro de un plan';end if;
  subtotal:=subtotal+(l->>'total_clp')::bigint;
 end loop;
 fee:=(p_order->>'delivery_fee_clp')::bigint;total:=subtotal+fee;
 if fee is null or fee<0 or (p_order->>'discount_clp')::bigint is distinct from 0::bigint or (p_order->>'subtotal_clp')::bigint is distinct from subtotal or (p_order->>'total_clp')::bigint is distinct from total or (p_order->>'currency') is distinct from 'CLP' then raise exception 'El total cambió. Revisa la compra';end if;
 select coalesce(jsonb_object_agg(id,q),'{}'::jsonb) into quantities from (
  select (x->>'product_id')::uuid id,sum((x->>'quantity')::integer)::integer q from jsonb_array_elements(p_lines) x join public.menu_items mi on mi.id=(x->>'product_id')::uuid where mi.product_type='mealprep' group by 1
 ) wanted;
 if quantities<>'{}'::jsonb and not exists(select 1 from public.custom_plan_settings where id and enabled) then raise exception 'Estamos actualizando los planes. Los familiares siguen disponibles por separado';end if;
 -- Deterministic locks serialize every product across every plan in the cart.
 for demand in select key::uuid id,value::integer q from jsonb_each_text(quantities) order by key loop
  perform pg_advisory_xact_lock(hashtextextended('sale-capacity:'||demand.id::text,0));
  select * into cap from public.mealprep_sale_capacity where menu_item_id=demand.id for update;
  if cap.menu_item_id is null or not cap.published then raise exception 'Un mealprep está inactivo. Revisa tu selección' using errcode='40001';end if;
 end loop;
 o:=(p_order->>'id')::uuid;
 insert into public.orders(id,checkout_mode,status,payment_status,delivery_status,subtotal_clp,discount_clp,delivery_fee_clp,total_clp,currency,note,customer_snapshot)
 values(o,p_order->>'checkout_mode','pending_payment','pending','pending',subtotal,0,fee,total,'CLP',p_order->>'note',(p_order->'customer_snapshot')||jsonb_build_object('availabilityMode','active_only'));
 for l in select value from jsonb_array_elements(p_lines) loop
  insert into public.order_items(order_id,product_id,quantity,unit_price_clp,total_clp,product_name,product_snapshot,ingredients,nutrition_description)
  values(o,(l->>'product_id')::uuid,(l->>'quantity')::integer,(l->>'unit_price_clp')::bigint,(l->>'total_clp')::bigint,l->>'product_name',l->'product_snapshot',array(select jsonb_array_elements_text(coalesce(l->'ingredients','[]'::jsonb))),l->>'nutrition_description');
 end loop;
 -- Active-only purchases do not reserve, consume or release inventory.
 -- Earlier attempts retain their original quantities and settlement rules.
 quantities:='{}'::jsonb;
 insert into public.mealprep_sale_checkouts(checkout_key,order_id,fingerprint,quantities) values(p_key,o,p_fingerprint,quantities) returning * into attempt;
 insert into public.mealprep_sale_sync_outbox(event_key,event_type,payload) values('order:'||o::text,'order_created',jsonb_build_object('order',p_order,'items',p_lines));
 return to_jsonb(attempt);
end $$;
revoke all on function public.save_mealprep_sale_visibility(uuid,boolean,integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_mealprep_sale_visibility(uuid,boolean,integer,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;

