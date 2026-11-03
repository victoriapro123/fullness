begin;
-- Fullness controls its sellable portions. These are NOT physical material or
-- cost balances in another system. No recipe, ingredient, cost or stock seed.
alter table public.custom_plan_settings add column stock_authority text not null default 'core360'
 check(stock_authority in ('core360','fullness_sale_capacity_v1'));
create table public.mealprep_sale_capacity (
 menu_item_id uuid primary key references public.menu_items(id),
 quantity integer check(quantity between 0 and 1000000),
 reserved_quantity integer not null default 0 check(reserved_quantity>=0),
 published boolean not null default false,revision integer not null default 1 check(revision>0),
 updated_by uuid references public.profiles(id),updated_at timestamptz not null default now(),
 check(reserved_quantity<=coalesce(quantity,0))
);
create table public.mealprep_sale_capacity_updates (
 id uuid primary key default gen_random_uuid(),menu_item_id uuid not null references public.menu_items(id),
 actor_id uuid not null references public.profiles(id),request_key uuid not null,
 payload jsonb not null,before_value jsonb,after_value jsonb not null,
 reason text not null default 'modificado en web' check(reason='modificado en web'),
 created_at timestamptz not null default now(),unique(actor_id,request_key)
);
create table public.mealprep_sale_checkouts (
 checkout_key uuid primary key,order_id uuid not null unique references public.orders(id),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 state text not null default 'prepared' check(state in ('prepared','creating','uncertain','ready','paid','cancelled')),
 reservation_state text not null default 'held' check(reservation_state in ('held','committed','released')),
 quantities jsonb not null,revision integer not null default 1,
 preference_id text,preference_result jsonb,gateway_evidence jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(state<>'ready' or (preference_id is not null and preference_result is not null))
);
create table public.mealprep_sale_sync_outbox (
 id uuid primary key default gen_random_uuid(),event_key text not null unique,
 event_type text not null,payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','retry','accepted')),
 reason text not null default 'modificado en web',attempt_count integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index sale_sync_status_idx on public.mealprep_sale_sync_outbox(status,created_at);
create index sale_checkouts_state_idx on public.mealprep_sale_checkouts(state,updated_at);
alter table public.mealprep_sale_capacity enable row level security;
alter table public.mealprep_sale_capacity_updates enable row level security;
alter table public.mealprep_sale_checkouts enable row level security;
alter table public.mealprep_sale_sync_outbox enable row level security;
revoke all on public.mealprep_sale_capacity,public.mealprep_sale_capacity_updates,public.mealprep_sale_checkouts,public.mealprep_sale_sync_outbox from public,anon,authenticated;
grant select,insert,update on public.mealprep_sale_capacity,public.mealprep_sale_checkouts,public.mealprep_sale_sync_outbox to service_role;
grant select,insert on public.mealprep_sale_capacity_updates to service_role;

create function public.save_mealprep_sale_capacity(p_menu_id uuid,p_quantity integer,p_published boolean,p_revision integer,p_request_key uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.mealprep_sale_capacity;prior public.mealprep_sale_capacity_updates;before_json jsonb;payload jsonb;result jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'No tienes permiso para guardar estos cambios' using errcode='42501';end if;
 if p_quantity is null or p_quantity not between 0 and 1000000 or p_published is null or p_request_key is null or p_revision is null or p_revision<0 then raise exception 'Revisa las unidades y la publicación';end if;
 payload:=jsonb_build_object('menuItemId',p_menu_id,'quantity',p_quantity,'published',p_published,'revision',p_revision);
 perform pg_advisory_xact_lock(hashtextextended('sale-save:'||p_actor::text||':'||p_request_key::text,0));
 select * into prior from public.mealprep_sale_capacity_updates where actor_id=p_actor and request_key=p_request_key;
 if prior.id is not null then if prior.payload<>payload then raise exception 'Consulta el guardado anterior antes de cambiar las unidades' using errcode='40001';end if;return prior.after_value;end if;
 perform 1 from public.menu_items where id=p_menu_id and product_type='mealprep' and is_active for share;
 if not found then raise exception 'Este mealprep no está disponible para editar';end if;
 if p_published and not exists(select 1 from public.menu_items where id=p_menu_id and price_clp>0) then raise exception 'Indica el precio del plato antes de publicarlo';end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-capacity:'||p_menu_id::text,0));
 select * into a from public.mealprep_sale_capacity where menu_item_id=p_menu_id for update;
 if coalesce(a.revision,0)<>p_revision then raise exception 'Las unidades cambiaron. Actualiza la lista y revisa tu cantidad' using errcode='40001';end if;
 if p_quantity<coalesce(a.reserved_quantity,0) then raise exception 'Hay % unidades en compras pendientes. La cantidad no puede ser menor',a.reserved_quantity using errcode='40001';end if;
 before_json:=case when a.menu_item_id is null then null else to_jsonb(a) end;
 insert into public.mealprep_sale_capacity(menu_item_id,quantity,published,revision,updated_by)
 values(p_menu_id,p_quantity,p_published,p_revision+1,p_actor)
 on conflict(menu_item_id) do update set quantity=excluded.quantity,published=excluded.published,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into a;
 result:=jsonb_build_object('status','saved','menuItemId',a.menu_item_id,'quantity',a.quantity,'reservedQuantity',a.reserved_quantity,'published',a.published,'revision',a.revision);
 insert into public.mealprep_sale_capacity_updates(menu_item_id,actor_id,request_key,payload,before_value,after_value) values(p_menu_id,p_actor,p_request_key,payload,before_json,result);
 insert into public.mealprep_sale_sync_outbox(event_key,event_type,payload) values('stock:'||p_actor::text||':'||p_request_key::text,'sale_capacity_changed',jsonb_build_object('offer',result,'actorId',p_actor,'reason','modificado en web'));
 return result;
end $$;

create function public.save_mealprep_sale_details(p_menu_id uuid,p_document jsonb,p_revision integer,p_request_key uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cap public.mealprep_sale_capacity;prior public.mealprep_sale_capacity_updates;before_json jsonb;payload jsonb;result jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'No tienes permiso para editar este plato' using errcode='42501';end if;
 if p_revision is null or p_revision<0 or p_request_key is null or jsonb_typeof(p_document) is distinct from 'object' or length(coalesce(p_document->>'name','')) not between 3 and 240 or length(coalesce(p_document->>'description',''))>4000 or length(coalesce(p_document->>'ingredientsText',''))>6000 or coalesce(p_document->>'priceClp','') !~ '^[0-9]{1,7}$' or (p_document->>'priceClp')::integer>1000000 then raise exception 'Revisa el nombre, el precio y la descripción';end if;
 payload:=jsonb_build_object('action','details','menuItemId',p_menu_id,'document',p_document,'revision',p_revision);
 perform pg_advisory_xact_lock(hashtextextended('sale-save:'||p_actor::text||':'||p_request_key::text,0));
 select * into prior from public.mealprep_sale_capacity_updates where actor_id=p_actor and request_key=p_request_key;
 if prior.id is not null then if prior.payload<>payload then raise exception 'Consulta el guardado anterior antes de cambiar la información' using errcode='40001';end if;return prior.after_value;end if;
 select to_jsonb(m) into before_json from public.menu_items m where id=p_menu_id and product_type='mealprep' and is_active for update;
 if before_json is null then raise exception 'No encontramos este plato';end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-capacity:'||p_menu_id::text,0));
 select * into cap from public.mealprep_sale_capacity where menu_item_id=p_menu_id for update;
 if coalesce(cap.revision,0)<>p_revision then raise exception 'El plato cambió. Actualiza la lista antes de guardar' using errcode='40001';end if;
 if cap.published and (p_document->>'priceClp')::integer=0 then raise exception 'Indica un precio antes de publicar el plato';end if;
 update public.menu_items set name=p_document->>'name',description=coalesce(p_document->>'description',''),price_clp=(p_document->>'priceClp')::integer,photo_url=nullif(p_document->>'photoUrl',''),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('ingredientsText',coalesce(p_document->>'ingredientsText',''),'pricingAuthority','fullness'),updated_at=clock_timestamp() where id=p_menu_id;
 insert into public.mealprep_sale_capacity(menu_item_id,revision,updated_by) values(p_menu_id,p_revision+1,p_actor)
 on conflict(menu_item_id) do update set revision=excluded.revision,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into cap;
 result:=jsonb_build_object('status','saved','menuItemId',p_menu_id,'quantity',cap.quantity,'published',cap.published,'revision',cap.revision,'details',p_document);
 insert into public.mealprep_sale_capacity_updates(menu_item_id,actor_id,request_key,payload,before_value,after_value) values(p_menu_id,p_actor,p_request_key,payload,before_json,result);
 insert into public.mealprep_sale_sync_outbox(event_key,event_type,payload) values('details:'||p_actor::text||':'||p_request_key::text,'offer_details_changed',result);
 return result;
end $$;

create function public.prepare_mealprep_sale_checkout(p_key uuid,p_fingerprint text,p_order jsonb,p_lines jsonb)
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
  if cap.menu_item_id is null or not cap.published or cap.quantity is null or cap.quantity-cap.reserved_quantity<demand.q then raise exception 'Un mealprep se agotó. Revisa tu selección' using errcode='40001';end if;
 end loop;
 o:=(p_order->>'id')::uuid;
 insert into public.orders(id,checkout_mode,status,payment_status,delivery_status,subtotal_clp,discount_clp,delivery_fee_clp,total_clp,currency,note,customer_snapshot)
 values(o,p_order->>'checkout_mode','pending_payment','pending','pending',subtotal,0,fee,total,'CLP',p_order->>'note',p_order->'customer_snapshot');
 for l in select value from jsonb_array_elements(p_lines) loop
  insert into public.order_items(order_id,product_id,quantity,unit_price_clp,total_clp,product_name,product_snapshot,ingredients,nutrition_description)
  values(o,(l->>'product_id')::uuid,(l->>'quantity')::integer,(l->>'unit_price_clp')::bigint,(l->>'total_clp')::bigint,l->>'product_name',l->'product_snapshot',array(select jsonb_array_elements_text(coalesce(l->'ingredients','[]'::jsonb))),l->>'nutrition_description');
 end loop;
 for demand in select key::uuid id,value::integer q from jsonb_each_text(quantities) order by key loop
  update public.mealprep_sale_capacity set reserved_quantity=reserved_quantity+demand.q,revision=revision+1,updated_at=clock_timestamp() where menu_item_id=demand.id;
 end loop;
 insert into public.mealprep_sale_checkouts(checkout_key,order_id,fingerprint,quantities) values(p_key,o,p_fingerprint,quantities) returning * into attempt;
 insert into public.mealprep_sale_sync_outbox(event_key,event_type,payload) values('order:'||o::text,'order_created',jsonb_build_object('order',p_order,'items',p_lines));
 return to_jsonb(attempt);
end $$;

create function public.transition_mealprep_sale_checkout(p_key uuid,p_action text,p_revision integer,p_document jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.mealprep_sale_checkouts;d record;source_order_id uuid;
begin
 select order_id into source_order_id from public.mealprep_sale_checkouts where checkout_key=p_key;
 if source_order_id is not null then perform 1 from public.orders where id=source_order_id for update;end if;
 select * into a from public.mealprep_sale_checkouts where checkout_key=p_key for update;
 if a.checkout_key is null then raise exception 'No encontramos esa compra';end if;
 if a.revision is distinct from p_revision then raise exception 'Consulta el estado de esta compra antes de repetir' using errcode='40001';end if;
 if p_action='claim' and a.state='prepared' then a.state:='creating';
 elsif p_action='uncertain' and a.state in ('creating','uncertain') then a.state:='uncertain';
 elsif p_action='preference' and a.state in ('creating','uncertain','ready') then
  if nullif(p_document->>'id','') is null or (p_document->>'external_reference') is distinct from a.order_id::text or nullif(p_document->>'init_point','') is null then raise exception 'No pudimos comprobar el enlace de pago';end if;
  if a.preference_id is not null and a.preference_id<>p_document->>'id' then raise exception 'La compra ya tiene otro enlace de pago';end if;
  a.preference_id:=p_document->>'id';a.preference_result:=p_document;a.state:='ready';
  update public.orders set mercadopago_preference_id=a.preference_id,mercadopago_external_reference=a.order_id::text where id=a.order_id;
 elsif p_action='release' and a.reservation_state='held' then
  if (p_document->>'verifiedNoPayment') is distinct from 'true' or (p_document->>'preferenceExpired') is distinct from 'true' or jsonb_typeof(p_document->'evidence') is distinct from 'object' or exists(select 1 from public.payments where order_id=a.order_id and status in ('approved','authorized','in_process','pending')) then raise exception 'La compra todavía puede recibir un pago';end if;
  for d in select key::uuid id,value::integer q from jsonb_each_text(a.quantities) order by key loop
   perform pg_advisory_xact_lock(hashtextextended('sale-capacity:'||d.id::text,0));
   update public.mealprep_sale_capacity set reserved_quantity=reserved_quantity-d.q,revision=revision+1,updated_at=clock_timestamp() where menu_item_id=d.id and reserved_quantity>=d.q;
   if not found then raise exception 'No pudimos comprobar la disponibilidad';end if;
  end loop;
  a.state:='cancelled';a.reservation_state:='released';a.gateway_evidence:=p_document->'evidence';
  update public.orders set status='cancelled',delivery_status='cancelled' where id=a.order_id and payment_status<>'approved';
 else raise exception 'Consulta el estado de esta compra antes de continuar' using errcode='40001';end if;
 a.revision:=a.revision+1;a.updated_at:=clock_timestamp();
 update public.mealprep_sale_checkouts set state=a.state,reservation_state=a.reservation_state,preference_id=a.preference_id,preference_result=a.preference_result,gateway_evidence=a.gateway_evidence,revision=a.revision,updated_at=a.updated_at where checkout_key=p_key;
 return to_jsonb(a);
end $$;

create function public.commit_mealprep_sale_payment() returns trigger language plpgsql security invoker set search_path='' as $$
declare a public.mealprep_sale_checkouts;d record;
begin
 if (new.customer_snapshot->>'stockAuthority') is distinct from 'fullness_sale_capacity_v1' or new.payment_status is distinct from 'approved' then return new;end if;
 select * into a from public.mealprep_sale_checkouts where order_id=new.id for update;
 if a.checkout_key is null then raise exception 'Falta comprobar la disponibilidad de esta compra';end if;
 if a.reservation_state='committed' then return new;end if;
 if a.reservation_state<>'held' then raise exception 'La compra requiere revisión antes de confirmar la entrega';end if;
 for d in select key::uuid id,value::integer q from jsonb_each_text(a.quantities) order by key loop
  perform pg_advisory_xact_lock(hashtextextended('sale-capacity:'||d.id::text,0));
  update public.mealprep_sale_capacity set quantity=quantity-d.q,reserved_quantity=reserved_quantity-d.q,revision=revision+1,updated_at=clock_timestamp() where menu_item_id=d.id and quantity>=d.q and reserved_quantity>=d.q;
  if not found then raise exception 'No pudimos confirmar las unidades de esta compra';end if;
 end loop;
 update public.mealprep_sale_checkouts set state='paid',reservation_state='committed',revision=revision+1,updated_at=clock_timestamp() where checkout_key=a.checkout_key;
 insert into public.mealprep_sale_sync_outbox(event_key,event_type,payload) values('paid:'||new.id::text,'payment_confirmed',jsonb_build_object('orderId',new.id,'quantities',a.quantities,'totalClp',new.total_clp)) on conflict(event_key) do nothing;
 return new;
end $$;
create trigger commit_mealprep_sale_payment after update of payment_status on public.orders for each row execute function public.commit_mealprep_sale_payment();
-- New Fullness-owned orders use the selected portion UUID, not an external
-- material identity. The historical branch and all composition rules remain.
create or replace function public.enforce_custom_plan_selection() returns trigger language plpgsql security invoker set search_path='' as $$
declare g jsonb;meal jsonb;n integer;w integer;source_owned boolean;
begin
 g:=new.product_snapshot->'customPlan';if g is null then return new;end if;
 if coalesce(g->>'size','') not in ('6','24') or jsonb_typeof(g->'items') is distinct from 'array' then raise exception 'El plan debe tener 6 o 24 mealpreps';end if;
 select coalesce(customer_snapshot->>'operationalAuthority'='fullness' and customer_snapshot->>'stockAuthority'='fullness_sale_capacity_v1',false) into source_owned from public.orders where id=new.order_id;
 for meal in select value from jsonb_array_elements(g->'items') loop
  if coalesce(meal->>'quantity','') !~ '^[1-2]$' or coalesce(meal->>'week','') !~ '^[1-4]$' or ((g->>'size')::integer=6 and meal->>'week'<>'1') or coalesce(meal->>'menuItemId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Revisa las cantidades de cada semana';end if;
  if not exists(select 1 from public.menu_items where id=(meal->>'menuItemId')::uuid and product_type='mealprep') then raise exception 'Los familiares se compran aparte';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(g->'items') x group by x->>'week',x->>'menuItemId' having sum((x->>'quantity')::integer)>2) then raise exception 'Máximo 2 unidades del mismo mealprep en una semana';end if;
 if source_owned then
  if exists(select 1 from(select x->>'week' w,x->>'menuItemId' item,sum((x->>'quantity')::integer) qty from jsonb_array_elements(g->'items') x group by x->>'week',x->>'menuItemId') q where q.qty=2 group by q.w having count(*)>1) then raise exception 'Sólo un plato puede estar duplicado en cada semana';end if;
 else
  if exists(select 1 from jsonb_array_elements(g->'items') x left join public.core360_product_mappings m on m.source_menu_item_id=(x->>'menuItemId')::uuid and m.is_active where m.core_item_id is null or coalesce(x->>'coreItemId','')<>m.core_item_id::text) then raise exception 'No pudimos comprobar los platos de esta compra';end if;
  if exists(select 1 from jsonb_array_elements(g->'items') x group by x->>'week',x->>'coreItemId' having sum((x->>'quantity')::integer)>2) then raise exception 'Máximo 2 unidades del mismo mealprep en una semana';end if;
  if exists(select 1 from(select x->>'week' w,x->>'coreItemId' core,sum((x->>'quantity')::integer) qty from jsonb_array_elements(g->'items') x group by x->>'week',x->>'coreItemId') q where q.qty=2 group by q.w having count(*)>1) then raise exception 'Sólo un plato puede estar duplicado en cada semana';end if;
 end if;
 for w in 1..case when (g->>'size')::integer=24 then 4 else 1 end loop
  select sum((x->>'quantity')::integer) into n from jsonb_array_elements(g->'items') x where (x->>'week')::integer=w;
  if n is distinct from 6 then raise exception 'Completa exactamente 6 mealpreps en cada semana';end if;
 end loop;
 return new;
end $$;
revoke all on function public.save_mealprep_sale_capacity(uuid,integer,boolean,integer,uuid,uuid),public.save_mealprep_sale_details(uuid,jsonb,integer,uuid,uuid),public.prepare_mealprep_sale_checkout(uuid,text,jsonb,jsonb),public.transition_mealprep_sale_checkout(uuid,text,integer,jsonb),public.commit_mealprep_sale_payment() from public,anon,authenticated;
grant execute on function public.save_mealprep_sale_capacity(uuid,integer,boolean,integer,uuid,uuid),public.save_mealprep_sale_details(uuid,jsonb,integer,uuid,uuid),public.prepare_mealprep_sale_checkout(uuid,text,jsonb,jsonb),public.transition_mealprep_sale_checkout(uuid,text,integer,jsonb),public.commit_mealprep_sale_payment() to service_role;
notify pgrst,'reload schema';
commit;
