begin;

-- Editorial availability is an explicit staff declaration, not a second physical
-- stock balance. Quantities, reservations and canonical online prices stay Core360.
create table public.mealprep_availability (
 library_meal_id uuid primary key references public.meal_library_items(id) on delete restrict,
 state text not null default 'unconfirmed' check(state in ('unconfirmed','available','sold_out','paused')),
 starts_on date, ends_on date,
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id),
 check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.mealprep_availability_audit (
 id uuid primary key default gen_random_uuid(),library_meal_id uuid not null references public.meal_library_items(id),
 actor_id uuid not null references public.profiles(id),before_value jsonb,after_value jsonb not null,created_at timestamptz not null default now()
);
create index mealprep_availability_audit_meal_idx on public.mealprep_availability_audit(library_meal_id,created_at desc);
create index mealprep_availability_audit_actor_idx on public.mealprep_availability_audit(actor_id);
create index mealprep_availability_actor_idx on public.mealprep_availability(updated_by);
create table public.local_menu_settings (
 id boolean primary key default true check(id), revision integer not null default 1 check(revision>0),
 document jsonb not null default '{"lunchPrice":13500,"lunchDescription":"","items":[]}',
 published_document jsonb, published_at timestamptz,updated_at timestamptz not null default now(),
 check(jsonb_typeof(document)='object'),check(published_document is null or jsonb_typeof(published_document)='object')
);
create table public.local_menu_versions (
 id uuid primary key default gen_random_uuid(),revision integer not null unique,
 actor_id uuid not null references public.profiles(id),action text not null check(action in ('draft','publish')),
 snapshot jsonb not null,created_at timestamptz not null default now()
);
create index local_menu_versions_actor_idx on public.local_menu_versions(actor_id);
alter table public.mealprep_availability enable row level security;
alter table public.mealprep_availability_audit enable row level security;
alter table public.local_menu_settings enable row level security;
alter table public.local_menu_versions enable row level security;
revoke all on public.mealprep_availability,public.mealprep_availability_audit,public.local_menu_settings,public.local_menu_versions from public,anon,authenticated;
grant select,insert,update on public.mealprep_availability,public.local_menu_settings to service_role;
grant select,insert on public.mealprep_availability_audit,public.local_menu_versions to service_role;
insert into public.local_menu_settings(id) values(true);
insert into public.mealprep_availability(library_meal_id) select id from public.meal_library_items;

create function public.save_mealprep_availability(p_meal_id uuid,p_state text,p_starts_on date,p_ends_on date,p_revision integer,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous public.mealprep_availability; saved public.mealprep_availability;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'Administración requerida' using errcode='42501'; end if;
 if not exists(select 1 from public.meal_library_items where id=p_meal_id and is_active) then raise exception 'Selecciona una receta real y activa'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_meal_id::text,0));
 select * into previous from public.mealprep_availability where library_meal_id=p_meal_id for update;
 if coalesce(previous.revision,0) is distinct from p_revision then raise exception 'La disponibilidad cambió; recarga sin descartar tus cambios' using errcode='40001'; end if;
 if p_state is null or p_state not in ('unconfirmed','available','sold_out','paused') then raise exception 'Estado de disponibilidad inválido'; end if;
 insert into public.mealprep_availability(library_meal_id,state,starts_on,ends_on,revision,updated_by)
 values(p_meal_id,p_state,p_starts_on,p_ends_on,p_revision+1,p_actor)
 on conflict(library_meal_id) do update set state=excluded.state,starts_on=excluded.starts_on,ends_on=excluded.ends_on,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=clock_timestamp()
 returning * into saved;
 insert into public.mealprep_availability_audit(library_meal_id,actor_id,before_value,after_value) values(p_meal_id,p_actor,to_jsonb(previous),to_jsonb(saved));
 return to_jsonb(saved);
end $$;
revoke all on function public.save_mealprep_availability(uuid,text,date,date,integer,uuid) from public,anon,authenticated;
grant execute on function public.save_mealprep_availability(uuid,text,date,date,integer,uuid) to service_role;

create function public.save_local_menu(p_document jsonb,p_revision integer,p_publish boolean,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.local_menu_settings; item jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'Administración requerida' using errcode='42501'; end if;
 if p_publish is null or jsonb_typeof(p_document) is distinct from 'object' or jsonb_typeof(p_document->'items') is distinct from 'array' then raise exception 'Formato de carta inválido'; end if;
 if jsonb_array_length(p_document->'items')>100 or jsonb_typeof(p_document->'lunchPrice') is distinct from 'number' or coalesce(p_document->>'lunchPrice','') !~ '^[0-9]+$'
 or (p_document->>'lunchPrice')::numeric not between 1 and 1000000 or jsonb_typeof(p_document->'lunchDescription') is distinct from 'string' or length(p_document->>'lunchDescription')>1000 then raise exception 'Revisa precio y descripción de Lunch'; end if;
 for item in select value from jsonb_array_elements(p_document->'items') loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'id','') !~ '^[-a-zA-Z0-9_]{1,80}$'
    or jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name')) not between 3 and 240
    or jsonb_typeof(item->'description') is distinct from 'string' or length(item->>'description')>2000
    or coalesce(item->>'section','') not in ('individuales','bowls','ensaladas','desayuno','cafeteria','jugos','snacks')
    or jsonb_typeof(item->'price') is distinct from 'number' or coalesce(item->>'price','') !~ '^[0-9]+$' or (item->>'price')::numeric not between 1 and 1000000
    or coalesce(item->>'state','') not in ('unconfirmed','available','sold_out','paused') then raise exception 'Revisa cada producto de la carta'; end if;
  if nullif(item->>'startsOn','') is not null then perform (item->>'startsOn')::date; end if;
  if nullif(item->>'endsOn','') is not null then perform (item->>'endsOn')::date; end if;
  if nullif(item->>'startsOn','') is not null and nullif(item->>'endsOn','') is not null and (item->>'endsOn')::date<(item->>'startsOn')::date then raise exception 'Fechas de producto invertidas'; end if;
  if nullif(item->>'libraryMealId','') is not null and not exists(select 1 from public.meal_library_items where id=(item->>'libraryMealId')::uuid and is_active) then raise exception 'La receta vinculada no está activa'; end if;
  if item->'lunchSlot' is not null and item->'lunchSlot'<>'null'::jsonb then
   if jsonb_typeof(item->'lunchSlot') is distinct from 'number' or coalesce(item->>'lunchSlot','') !~ '^[1-5]$' or item->>'section'<>'individuales' or nullif(item->>'libraryMealId','') is null then raise exception 'Lunch requiere posiciones1a5 y recetas reales'; end if;
  end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_document->'items') i group by i->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p_document->'items') i where i->'lunchSlot'<>'null'::jsonb group by i->>'lunchSlot' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p_document->'items') i where i->'lunchSlot'<>'null'::jsonb group by i->>'libraryMealId' having count(*)>1)
 then raise exception 'Productos o posiciones de Lunch repetidos'; end if;
 update public.local_menu_settings set document=p_document,revision=revision+1,updated_at=clock_timestamp(),
 published_document=case when p_publish then p_document else published_document end,
 published_at=case when p_publish then clock_timestamp() else published_at end
 where id and revision=p_revision returning * into saved;
 if saved.id is null then raise exception 'La carta cambió; recarga sin descartar tu borrador' using errcode='40001'; end if;
 insert into public.local_menu_versions(revision,actor_id,action,snapshot) values(saved.revision,p_actor,case when p_publish then 'publish' else 'draft' end,p_document);
 return jsonb_build_object('revision',saved.revision,'publishedAt',saved.published_at);
end $$;
revoke all on function public.save_local_menu(jsonb,integer,boolean,uuid) from public,anon,authenticated;
grant execute on function public.save_local_menu(jsonb,integer,boolean,uuid) to service_role;
notify pgrst,'reload schema';
commit;
