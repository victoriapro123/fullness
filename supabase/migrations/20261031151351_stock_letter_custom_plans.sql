begin;

-- Additive transition. Existing menus, calendar deliveries and paid snapshots
-- remain unchanged. No commercial price, Core UUID or stock is invented here.
create table public.stock_letters (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 3 and 160),
 starts_on date not null, ends_on date not null,
 state text not null default 'draft' check(state in ('draft','active','closed')),
 revision integer not null default 1 check(revision>0),
 plan_sizes integer[] not null default '{}',
 family_in_plans boolean not null default false,
 updated_at timestamptz not null default now(),
 check(ends_on>starts_on),
 check(cardinality(plan_sizes) between 0 and 10 and plan_sizes <@ array[2,3,4,5,6,7,8,9,10,12,14,18,21,24,28,30,36,42,48,60]),
 check(state<>'active' or cardinality(plan_sizes)>0)
);
create unique index stock_letters_one_active on public.stock_letters((state)) where state='active';
create table public.stock_letter_items (
 id uuid primary key default gen_random_uuid(),
 letter_id uuid not null references public.stock_letters(id) on delete restrict,
 position smallint not null check(position between 1 and 100),
 title text not null check(length(title) between 3 and 240),
 menu_item_id uuid references public.menu_items(id) on delete restrict,
 library_meal_id uuid references public.meal_library_items(id) on delete restrict,
 unique(letter_id,position), unique(letter_id,menu_item_id)
);
create index stock_letter_items_menu_idx on public.stock_letter_items(menu_item_id);
create index stock_letter_items_library_idx on public.stock_letter_items(library_meal_id);
create table public.stock_letter_audit (
 id uuid primary key default gen_random_uuid(), letter_id uuid not null references public.stock_letters(id),
 actor_id uuid not null references public.profiles(id),
 before_value jsonb, after_value jsonb not null, created_at timestamptz not null default now()
);
create index stock_letter_audit_letter_idx on public.stock_letter_audit(letter_id,created_at);
create index stock_letter_audit_actor_idx on public.stock_letter_audit(actor_id);
create table public.custom_plan_settings (
 id boolean primary key default true check(id),
 enabled boolean not null default false
);
insert into public.custom_plan_settings(id,enabled) values(true,false);
create table public.order_custom_plans (
 id uuid primary key,
 order_id uuid not null references public.orders(id) on delete cascade,
 letter_id uuid not null references public.stock_letters(id) on delete restrict,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 created_at timestamptz not null default now()
);
create index order_custom_plans_order_idx on public.order_custom_plans(order_id);
create index order_custom_plans_letter_idx on public.order_custom_plans(letter_id);
alter table public.stock_letters enable row level security;
alter table public.stock_letter_items enable row level security;
alter table public.stock_letter_audit enable row level security;
alter table public.custom_plan_settings enable row level security;
alter table public.order_custom_plans enable row level security;
revoke all on public.stock_letters,public.stock_letter_items,public.stock_letter_audit,public.custom_plan_settings,public.order_custom_plans from public,anon,authenticated;
grant select,insert,update on public.stock_letters,public.stock_letter_items,public.custom_plan_settings to service_role;
grant delete on public.stock_letter_items to service_role;
grant select,insert on public.stock_letter_audit,public.order_custom_plans to service_role;

-- Mealpreps become commercial component identities, not individually buyable.
alter table public.menu_items drop constraint menu_items_product_type_allowed;
alter table public.menu_items add constraint menu_items_product_type_allowed check(product_type in ('plan','family','mealprep'));
alter table public.menu_items drop constraint menu_items_product_type_frequency_consistency;
alter table public.menu_items add constraint menu_items_product_type_frequency_consistency
 check((product_type in ('family','mealprep') and plan_frequency is null) or (product_type='plan' and plan_frequency in ('weekly','monthly')));

create function public.save_stock_letter(p_document jsonb,p_revision integer,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old_row public.stock_letters; next_row public.stock_letters; item jsonb; letter_id uuid;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'Administración requerida' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('fullness_stock_letters'));
 letter_id:=coalesce(nullif(p_document->>'id','')::uuid,gen_random_uuid());
 select * into old_row from public.stock_letters where id=letter_id for update;
 if coalesce(old_row.revision,0) is distinct from p_revision then raise exception 'La carta cambió; recarga sin descartar tu borrador' using errcode='40001'; end if;
 if old_row.state='closed' then raise exception 'Una carta cerrada se conserva como historial; crea una nueva'; end if;
 if p_document->>'state' not in ('draft','active','closed') or jsonb_typeof(p_document->'items') is distinct from 'array'
    or jsonb_array_length(p_document->'items') not between 1 and 100 then raise exception 'Revisa estado y platos de la carta'; end if;
 if p_document->>'state'='active' then
   if (p_document->>'startsOn')::date > (now() at time zone 'America/Santiago')::date
     or (p_document->>'endsOn')::date <= (now() at time zone 'America/Santiago')::date then raise exception 'La carta activa debe estar vigente'; end if;
   if exists(select 1 from jsonb_array_elements(p_document->'items') i
     left join public.menu_items m on m.id=nullif(i->>'menuItemId','')::uuid
     left join public.core360_product_mappings mp on mp.source_menu_item_id=m.id and mp.is_active
     left join public.core360_catalog_projection cp on cp.source_menu_item_id=m.id and cp.core_item_id=mp.core_item_id
     where m.id is null or not m.is_active or m.product_type not in ('mealprep','family')
       or (m.product_type='family' and not coalesce((p_document->>'familyInPlans')::boolean,false))
       or mp.id is null or cp.price_available is distinct from true or cp.core_item_available is distinct from true
       or cp.uom_compatible is distinct from true or cp.factor_compatible is distinct from true or cp.currency<>'CLP' or cp.gross_minor<=0)
     then raise exception 'Cada plato necesita identidad y precio canónico Core360; no se publican vínculos pendientes'; end if;
   -- Closing the previous letter invalidates NEW selections, never historical orders.
   with closed as (update public.stock_letters set state='closed',revision=revision+1,updated_at=clock_timestamp()
     where state='active' and id<>letter_id returning *)
   insert into public.stock_letter_audit(letter_id,actor_id,before_value,after_value)
     select id,p_actor,null,to_jsonb(closed) from closed;
 end if;
 insert into public.stock_letters(id,title,starts_on,ends_on,state,revision,plan_sizes,family_in_plans)
 values(letter_id,p_document->>'title',(p_document->>'startsOn')::date,(p_document->>'endsOn')::date,p_document->>'state',p_revision+1,
   array(select jsonb_array_elements_text(p_document->'planSizes')::integer),coalesce((p_document->>'familyInPlans')::boolean,false))
 on conflict(id) do update set title=excluded.title,starts_on=excluded.starts_on,ends_on=excluded.ends_on,state=excluded.state,
   revision=excluded.revision,plan_sizes=excluded.plan_sizes,family_in_plans=excluded.family_in_plans,updated_at=clock_timestamp()
 returning * into next_row;
 delete from public.stock_letter_items where stock_letter_items.letter_id=next_row.id;
 for item in select value from jsonb_array_elements(p_document->'items') loop
   insert into public.stock_letter_items(letter_id,position,title,menu_item_id,library_meal_id)
   values(next_row.id,(item->>'position')::smallint,item->>'title',nullif(item->>'menuItemId','')::uuid,nullif(item->>'libraryMealId','')::uuid);
 end loop;
 insert into public.stock_letter_audit(letter_id,actor_id,before_value,after_value)
 values(next_row.id,p_actor,to_jsonb(old_row),jsonb_build_object('letter',to_jsonb(next_row),'items',p_document->'items'));
 return to_jsonb(next_row);
end $$;
revoke all on function public.save_stock_letter(jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function public.save_stock_letter(jsonb,integer,uuid) to service_role;

-- An order retains its exact selected components even after a letter closes.
create function public.capture_custom_plan() returns trigger language plpgsql security invoker set search_path='' as $$
declare g jsonb; c public.stock_letters; existing public.order_custom_plans;
begin
 g:=new.product_snapshot->'customPlan';
 if g is null then
   if exists(select 1 from public.menu_items where id=new.product_id and product_type='mealprep')
     or exists(select 1 from public.custom_plan_settings where enabled)
   then raise exception 'Los mealpreps sólo se compran asignados a planes'; end if;
   return new;
 end if;
 if jsonb_typeof(g) is distinct from 'object' or coalesce(g->>'id','')='' or coalesce(g->>'letterId','')=''
   or coalesce(g->>'revision','') !~ '^[1-9][0-9]*$' or coalesce(g->>'size','') !~ '^[1-9][0-9]*$'
   or coalesce(g->>'quantity','') !~ '^[1-9][0-9]*$' or coalesce(g->>'unitTotal','') !~ '^[1-9][0-9]*$'
 then raise exception 'Identidad de plan incompleta'; end if;
 select * into c from public.stock_letters where id=(g->>'letterId')::uuid for share;
 if c.id is null or c.state<>'active' or c.revision<>(g->>'revision')::integer
   or (now() at time zone 'America/Santiago')::date not between c.starts_on and c.ends_on-1
   then raise exception 'La carta cambió o cerró; revisa la selección antes de pagar' using errcode='40001'; end if;
 if not (g->>'size')::integer=any(c.plan_sizes) or new.product_snapshot->>'planStructure'<>'custom_stock_plan_v1'
   or not exists(select 1 from public.stock_letter_items where letter_id=c.id and menu_item_id=new.product_id)
   then raise exception 'Composición fuera de la carta'; end if;
 insert into public.order_custom_plans(id,order_id,letter_id,snapshot)
 values((g->>'id')::uuid,new.order_id,c.id,g) on conflict(id) do nothing;
 select * into existing from public.order_custom_plans where id=(g->>'id')::uuid;
 if existing.order_id<>new.order_id or existing.snapshot<>g then raise exception 'Identidad de plan inconsistente'; end if;
 return new;
end $$;
revoke all on function public.capture_custom_plan() from public,anon,authenticated;
create trigger capture_custom_plan before insert on public.order_items for each row execute function public.capture_custom_plan();

create function public.validate_custom_plan_totals() returns trigger language plpgsql security invoker set search_path='' as $$
declare g jsonb; units bigint; total bigint;
begin
 g:=new.product_snapshot->'customPlan'; if g is null then return null; end if;
 select sum(quantity),sum(total_clp) into units,total from public.order_items
 where order_id=new.order_id and product_snapshot->'customPlan'->>'id'=g->>'id';
 if units<>(g->>'size')::integer*(g->>'quantity')::integer or total<>(g->>'unitTotal')::bigint*(g->>'quantity')::integer
 then raise exception 'El plan debe contener todos sus platos y su suma exacta'; end if;
 return null;
end $$;
revoke all on function public.validate_custom_plan_totals() from public,anon,authenticated;
create constraint trigger validate_custom_plan_totals after insert on public.order_items
 deferrable initially deferred for each row execute function public.validate_custom_plan_totals();

-- User's first letter, DRAFT only. Exact editorial labels, no fuzzy commercial
-- mapping, prices, quantities or stock seeded from an image.
with letter as (insert into public.stock_letters(title,starts_on,ends_on)
 values('Carta de mealpreps — Octubre / Noviembre 2026','2026-10-31','2026-11-21') returning id)
insert into public.stock_letter_items(letter_id,position,title)
select letter.id,v.position,v.title from letter cross join (values
 (1,'Salmón sous vide con curry de lentejas'),
 (2,'Hamburguesas de pavo Thai con col asada'),
 (3,'Pavo con gravy de damasco y tomillo con puré de camote'),
 (4,'Estofado de carne con papas'),
 (5,'Falafel de betarraga con ensalada tibia de espinaca y peras'),
 (6,'Crepes sin gluten de espinaca rellenos de pastelera, cebolla dorada y tomates cherry confitados'),
 (7,'Pechuga de pollo arvejado con puré de coliflor asada'),
 (8,'Pollo a la King versión Fullness Lab con papas nativas'),
 (9,'Croquetas de garbanzo con pomodoro rústico'),
 (10,'Steak de coliflor sobre hummus con tomates cherry confitados'),
 (11,'Apple Curry Golden Chicken con puré de zanahoria asada'),
 (12,'Risotto de arroz integral y betarraga con salmón sous vide'),
 (13,'Risotto de arroz basmati con merluza austral sous vide'),
 (14,'Merluza austral sous vide con Quinoa Crispy Salad'),
 (15,'Mechada de vacuno con pastelera de choclo y zapallo italiano')
) v(position,title);
notify pgrst,'reload schema';
commit;
