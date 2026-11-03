begin;
-- Private configuration only: no product creation, quantity, price or cost ledger.
create table public.mealprep_stock_links (
 id uuid primary key default gen_random_uuid(),recipe_id uuid not null unique references public.meal_library_items(id),
 integration_id uuid not null,core_tenant_id uuid not null,core_company_id uuid not null,
 core_item_id uuid,location_id uuid,unit text check(unit in ('un','UN')),
 equivalence_milli integer not null default 1000 check(equivalence_milli=1000),
 revision bigint not null default 0 check(revision>=0),active boolean not null default false,
 updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now(),
 check(not active or (core_item_id is not null and location_id is not null and unit is not null and revision>0))
);
create unique index stock_links_unique_target on public.mealprep_stock_links(integration_id,core_item_id,location_id) where active;
create table public.mealprep_stock_link_attempts (
 id uuid primary key,request_key uuid not null,source_user_id uuid not null references public.profiles(id),
 recipe_id uuid not null references public.meal_library_items(id),link_id uuid not null references public.mealprep_stock_links(id),
 intent jsonb not null,request_payload jsonb not null,
 state text not null default 'prepared' check(state in ('prepared','reviewed','confirming','result_pending','cancel_requested','linked','cancelled')),
 revision integer not null default 1,core_review_token text,core_receipt jsonb,signed_envelope text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(source_user_id,request_key),check(state not in ('linked','cancelled') or core_receipt is not null)
);
create unique index stock_links_one_pending on public.mealprep_stock_link_attempts(recipe_id) where state not in ('linked','cancelled');
create table public.mealprep_stock_link_events (
 id bigint generated always as identity primary key,attempt_id uuid not null references public.mealprep_stock_link_attempts(id),
 actor_id uuid not null references public.profiles(id),action text not null,revision integer not null,created_at timestamptz not null default now()
);
alter table public.mealprep_stock_links enable row level security;
alter table public.mealprep_stock_link_attempts enable row level security;
alter table public.mealprep_stock_link_events enable row level security;
revoke all on public.mealprep_stock_links,public.mealprep_stock_link_attempts,public.mealprep_stock_link_events from public,anon,authenticated;
grant select,insert,update on public.mealprep_stock_links,public.mealprep_stock_link_attempts to service_role;
grant select,insert on public.mealprep_stock_link_events to service_role;
grant usage,select on sequence public.mealprep_stock_link_events_id_seq to service_role;

create function public.transition_stock_link(p_action text,p_document jsonb,p_actor uuid,p_expected_revision integer default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.mealprep_stock_link_attempts;l public.mealprep_stock_links;r uuid;proposed text;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'Administración requerida' using errcode='42501';end if;
 if p_action='prepare' then r:=(p_document->>'recipeId')::uuid;
 else select recipe_id into r from public.mealprep_stock_link_attempts where id=(p_document->>'attemptId')::uuid and source_user_id=p_actor;
 end if;
 if r is null then raise exception 'Intento no encontrado' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('fullness_stock_handoff:'||p_actor::text,0));
 perform pg_advisory_xact_lock(hashtextextended('fullness_stock_recipe:'||r::text,0));
 if p_action='prepare' then
  if not exists(select 1 from public.meal_library_items where id=r) then raise exception 'Preparación inexistente';end if;
  select * into a from public.mealprep_stock_link_attempts where source_user_id=p_actor and request_key=(p_document->>'requestKey')::uuid for update;
  if a.id is not null then
   if a.recipe_id<>r or a.request_payload is distinct from p_document->'payload' then raise exception 'Clave de otra selección' using errcode='40001';end if;
   return to_jsonb(a);
  end if;
  insert into public.mealprep_stock_links(id,recipe_id,integration_id,core_tenant_id,core_company_id,updated_by)
   values((p_document->>'linkId')::uuid,r,(p_document->>'integrationId')::uuid,(p_document->>'tenantId')::uuid,(p_document->>'companyId')::uuid,p_actor) on conflict(recipe_id) do nothing;
  select * into l from public.mealprep_stock_links where recipe_id=r for update;
  if l.id::text<>p_document->>'linkId' or l.integration_id::text<>p_document->>'integrationId' or l.core_tenant_id::text<>p_document->>'tenantId' or l.core_company_id::text<>p_document->>'companyId' then raise exception 'Ámbito incorrecto';end if;
  proposed:=(l.revision+1)::text;
  if (p_document->'intent'->>'linkRevision') is distinct from proposed or (p_document->'intent'->>'expectedLinkRevision') is distinct from (case when l.active then l.revision::text else null end) or p_document->'intent'->>'linkRef'<>l.id::text or p_document->'intent'->>'sourceMealprepId'<>r::text or p_document->'intent'->>'equivalenceMilli'<>'1000' then raise exception 'La revisión cambió' using errcode='40001';end if;
  if exists(select 1 from public.mealprep_stock_handoff_attempts where source_recipe_id=r and kind='count' and state not in ('committed','cancelled')) or exists(select 1 from public.mealprep_stock_integration_attempts where source_recipe_id=r and state not in ('committed','cancelled')) then raise exception 'Cierra el conteo pendiente' using errcode='40001';end if;
  insert into public.mealprep_stock_link_attempts(id,request_key,source_user_id,recipe_id,link_id,intent,request_payload) values((p_document->>'attemptId')::uuid,(p_document->>'requestKey')::uuid,p_actor,r,l.id,p_document->'intent',p_document->'payload') returning * into a;
 else
  select * into a from public.mealprep_stock_link_attempts where id=(p_document->>'attemptId')::uuid and source_user_id=p_actor for update;
  if a.revision is distinct from p_expected_revision then raise exception 'Consulta el intento actualizado' using errcode='40001';end if;
  if p_action='review' and a.state in ('prepared','reviewed') then
   if length(coalesce(p_document->>'reviewToken',''))<10 then raise exception 'Revisión requerida';end if;a.core_review_token:=p_document->>'reviewToken';a.state:='reviewed';
  elsif p_action='confirm' and a.state='reviewed' then
   select * into l from public.mealprep_stock_links where id=a.link_id for update;
   if (a.intent->>'expectedLinkRevision') is distinct from (case when l.active then l.revision::text else null end) then raise exception 'Vínculo cambiado';end if;
   if exists(select 1 from public.mealprep_stock_integration_attempts where source_recipe_id=r and state not in ('committed','cancelled')) or exists(select 1 from public.mealprep_stock_handoff_attempts where source_recipe_id=r and kind='count' and state not in ('committed','cancelled')) then raise exception 'Cierra el conteo pendiente';end if;
   a.state:='confirming';
  elsif p_action='linked' and a.state not in ('linked','cancelled') then
   if jsonb_typeof(p_document->'receipt') is distinct from 'object' or p_document->'receipt'->>'status'<>'linked' then raise exception 'Recibo requerido';end if;
   select * into l from public.mealprep_stock_links where id=a.link_id for update;
   if (a.intent->>'expectedLinkRevision') is distinct from (case when l.active then l.revision::text else null end) then raise exception 'Vínculo cambiado';end if;
   update public.mealprep_stock_links set core_item_id=(a.intent->>'coreItemId')::uuid,location_id=(a.intent->>'locationId')::uuid,unit=a.intent->>'unit',revision=(a.intent->>'linkRevision')::bigint,active=true,updated_by=p_actor,updated_at=clock_timestamp() where id=l.id;
   a.state:='linked';a.core_receipt:=p_document->'receipt';a.signed_envelope:=p_document->>'signedEnvelope';
  elsif p_action='cancelled' and a.state not in ('linked','cancelled') then
   if jsonb_typeof(p_document->'receipt') is distinct from 'object' or p_document->'receipt'->>'status'<>'cancelled' then raise exception 'Cancelación requerida';end if;
   a.state:='cancelled';a.core_receipt:=p_document->'receipt';a.signed_envelope:=p_document->>'signedEnvelope';
  elsif p_action='uncertain' and a.state not in ('linked','cancelled') then a.state:='result_pending';
  elsif p_action='cancel_request' and a.state not in ('linked','cancelled') then a.state:='cancel_requested';
  else raise exception 'Transición no permitida' using errcode='40001';end if;
  a.revision:=a.revision+1;a.updated_at:=clock_timestamp();
  update public.mealprep_stock_link_attempts set state=a.state,revision=a.revision,core_review_token=a.core_review_token,core_receipt=a.core_receipt,signed_envelope=a.signed_envelope,updated_at=a.updated_at where id=a.id;
 end if;
 insert into public.mealprep_stock_link_events(attempt_id,actor_id,action,revision) values(a.id,p_actor,p_action,a.revision);
 return to_jsonb(a);
end $$;
revoke all on function public.transition_stock_link(text,jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.transition_stock_link(text,jsonb,uuid,integer) to service_role;
-- Command metadata only. Physical stock/reservations remain exclusively Core.
create table public.mealprep_stock_integration_attempts (
 id uuid primary key default gen_random_uuid(),
 request_key uuid not null,source_user_id uuid not null references public.profiles(id),
 source_recipe_id uuid not null references public.meal_library_items(id),
 source_product_id uuid references public.menu_items(id),
 direct_link_id uuid references public.mealprep_stock_links(id),
 integration_id uuid not null,core_tenant_id uuid not null,core_company_id uuid not null,core_item_id uuid not null,
 source_origin text not null,link_revision text not null,
 request_payload jsonb not null check(jsonb_typeof(request_payload)='object'),
 intent jsonb not null check(jsonb_typeof(intent)='object'),
 state text not null default 'prepared' check(state in ('prepared','reviewed','confirming','result_pending','cancel_requested','committed','cancelled')),
 revision integer not null default 1 check(revision>0),
 review jsonb,core_review_token text,core_receipt_id text,core_result jsonb,result_envelope text,fresh_observation jsonb,
 cancellation_proof jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(source_user_id,request_key),
 check((source_product_id is null)<>(direct_link_id is null)),
 check(state<>'committed' or (core_receipt_id is not null and core_result is not null and fresh_observation is not null)),
 check(state<>'cancelled' or cancellation_proof is not null)
);
create unique index stock_integration_one_pending_idx on public.mealprep_stock_integration_attempts(source_user_id,source_recipe_id) where state not in ('committed','cancelled');
create index stock_integration_recipe_idx on public.mealprep_stock_integration_attempts(source_recipe_id);
create index stock_integration_product_idx on public.mealprep_stock_integration_attempts(source_product_id);
create table public.mealprep_stock_integration_events (
 id bigint generated always as identity primary key,
 attempt_id uuid not null references public.mealprep_stock_integration_attempts(id),
 actor_id uuid not null references public.profiles(id),
 action text not null,previous_state text,next_state text not null,revision integer not null,
 created_at timestamptz not null default now()
);
create index stock_integration_events_attempt_idx on public.mealprep_stock_integration_events(attempt_id,id);
create index stock_integration_events_actor_idx on public.mealprep_stock_integration_events(actor_id);
alter table public.mealprep_stock_integration_attempts enable row level security;
alter table public.mealprep_stock_integration_events enable row level security;
revoke all on public.mealprep_stock_integration_attempts,public.mealprep_stock_integration_events from public,anon,authenticated;
grant select,insert,update on public.mealprep_stock_integration_attempts to service_role;
grant select,insert on public.mealprep_stock_integration_events to service_role;
grant usage,select on sequence public.mealprep_stock_integration_events_id_seq to service_role;

create function public.transition_stock_integration(p_action text,p_document jsonb,p_actor uuid,p_expected_revision integer default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.mealprep_stock_integration_attempts; old_state text;
 recipe uuid; product uuid; linked boolean;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'Administración requerida' using errcode='42501'; end if;
 if p_action='prepare' then
  recipe:=(p_document->>'recipeId')::uuid;product:=(p_document->>'productId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('fullness_stock_handoff:'||p_actor::text,0));
  perform pg_advisory_xact_lock(hashtextextended('fullness_stock_recipe:'||recipe::text,0));
  select * into a from public.mealprep_stock_integration_attempts where source_user_id=p_actor and request_key=(p_document->>'requestKey')::uuid for update;
  if a.id is not null then
   if a.source_recipe_id is distinct from recipe or a.source_product_id is distinct from product or a.request_payload is distinct from p_document->'payload'
    then raise exception 'La clave pertenece a otro conteo' using errcode='40001'; end if;
   return to_jsonb(a);
  end if;
  if exists(select 1 from public.mealprep_stock_handoff_attempts where source_user_id=p_actor and source_recipe_id=recipe and kind='count' and state not in ('committed','cancelled'))
   or exists(select 1 from public.mealprep_stock_integration_attempts where source_user_id=p_actor and source_recipe_id=recipe and state not in ('committed','cancelled'))
   then raise exception 'Consulta y cierra el intento anterior antes de otro conteo' using errcode='40001'; end if;
  if p_document->>'directLinkId' is not null then
   select exists(select 1 from public.mealprep_stock_links l where l.id=(p_document->>'directLinkId')::uuid and l.recipe_id=recipe and l.active and l.integration_id::text=p_document->>'integrationId' and l.core_tenant_id::text=p_document->>'tenantId' and l.core_company_id::text=p_document->>'companyId' and l.core_item_id::text=p_document->>'coreItemId' and l.revision::text=p_document->>'linkRevision' and l.location_id::text=p_document->'intent'->>'locationId' and l.unit=p_document->'intent'->>'unit') into linked;
   if exists(select 1 from public.mealprep_stock_link_attempts where recipe_id=recipe and state not in ('linked','cancelled')) then raise exception 'Cierra la configuración pendiente';end if;
  else
  select exists(select 1 from public.menu_items m join public.core360_product_mappings mp on mp.source_menu_item_id=m.id
   where m.id=product and m.library_meal_id=recipe and m.product_type='mealprep' and m.is_active and mp.is_active
    and mp.core_item_id::text=p_document->>'coreItemId' and mp.updated_at=(p_document->>'linkRevision')::timestamptz) into linked;
  end if;
  if not linked then raise exception 'El vínculo de inventario cambió' using errcode='40001'; end if;
  insert into public.mealprep_stock_integration_attempts(id,request_key,source_user_id,source_recipe_id,source_product_id,direct_link_id,integration_id,core_tenant_id,core_company_id,core_item_id,source_origin,link_revision,request_payload,intent)
  values(coalesce((p_document->>'attemptId')::uuid,gen_random_uuid()),(p_document->>'requestKey')::uuid,p_actor,recipe,product,(p_document->>'directLinkId')::uuid,(p_document->>'integrationId')::uuid,(p_document->>'tenantId')::uuid,(p_document->>'companyId')::uuid,(p_document->>'coreItemId')::uuid,p_document->>'sourceOrigin',p_document->>'linkRevision',p_document->'payload',p_document->'intent') returning * into a;
 else
  select * into a from public.mealprep_stock_integration_attempts where id=(p_document->>'attemptId')::uuid and source_user_id=p_actor for update;
  if a.id is null then raise exception 'Intento no encontrado' using errcode='42501'; end if;
  if p_expected_revision is null or a.revision<>p_expected_revision then raise exception 'El intento cambió; consulta su estado' using errcode='40001'; end if;
  old_state:=a.state;
  if p_action='review' and a.state in ('prepared','reviewed') then
   if jsonb_typeof(p_document->'review') is distinct from 'object' or length(coalesce(p_document->>'reviewToken',''))<10 then raise exception 'Revisión canónica incompleta'; end if;
   a.review:=p_document->'review';a.core_review_token:=p_document->>'reviewToken';a.state:='reviewed';
  elsif p_action='confirm' and a.state='reviewed' then
   perform pg_advisory_xact_lock(hashtextextended('fullness_stock_recipe:'||a.source_recipe_id::text,0));
   if a.direct_link_id is not null then
    select exists(select 1 from public.mealprep_stock_links l where l.id=a.direct_link_id and l.recipe_id=a.source_recipe_id and l.active and l.core_item_id=a.core_item_id and l.integration_id=a.integration_id and l.core_tenant_id=a.core_tenant_id and l.core_company_id=a.core_company_id and l.revision::text=a.link_revision and l.location_id::text=a.intent->>'locationId' and l.unit=a.intent->>'unit') into linked;
   else
   select exists(select 1 from public.menu_items m join public.core360_product_mappings mp on mp.source_menu_item_id=m.id
    where m.id=a.source_product_id and m.library_meal_id=a.source_recipe_id and m.product_type='mealprep' and m.is_active and mp.is_active and mp.core_item_id::text=a.core_item_id::text and mp.updated_at=a.link_revision::timestamptz) into linked;
   end if;
   if not linked then raise exception 'El vínculo de inventario cambió' using errcode='40001'; end if;
   a.state:='confirming';
  elsif p_action='observe' and a.state not in ('committed','cancelled') then
   if jsonb_typeof(p_document->'result') is distinct from 'object' or nullif(p_document->>'receiptId','') is null then raise exception 'Recibo canónico requerido'; end if;
   if a.core_receipt_id is not null and (a.core_receipt_id::text<>p_document->>'receiptId' or a.core_result is distinct from p_document->'result') then raise exception 'Recibo inconsistente'; end if;
   a.core_receipt_id:=p_document->>'receiptId';a.core_result:=p_document->'result';a.result_envelope:=coalesce(a.result_envelope,p_document->>'signedEnvelope');a.state:='result_pending';
  elsif p_action='uncertain' and a.state not in ('committed','cancelled') then a.state:='result_pending';
  elsif p_action='commit' and a.state='result_pending' then
   if jsonb_typeof(p_document->'freshObservation') is distinct from 'object' then raise exception 'Falta lectura canónica actualizada'; end if;
   a.fresh_observation:=p_document->'freshObservation';a.state:='committed';
  elsif p_action='cancel_request' and a.state not in ('committed','cancelled') then a.state:='cancel_requested';
  elsif p_action='cancel' and a.state not in ('committed','cancelled') then
   if jsonb_typeof(p_document->'cancellationProof') is distinct from 'object' then raise exception 'Cancelación canónica requerida'; end if;
   a.cancellation_proof:=p_document->'cancellationProof';a.state:='cancelled';
  else raise exception 'Transición no permitida' using errcode='40001'; end if;
  a.revision:=a.revision+1;a.updated_at:=clock_timestamp();
  update public.mealprep_stock_integration_attempts set state=a.state,revision=a.revision,updated_at=a.updated_at,review=a.review,core_review_token=a.core_review_token,core_receipt_id=a.core_receipt_id,core_result=a.core_result,result_envelope=a.result_envelope,fresh_observation=a.fresh_observation,cancellation_proof=a.cancellation_proof where id=a.id;
 end if;
 insert into public.mealprep_stock_integration_events(attempt_id,actor_id,action,previous_state,next_state,revision) values(a.id,p_actor,p_action,old_state,a.state,a.revision);
 return to_jsonb(a);
end $$;
revoke all on function public.transition_stock_integration(text,jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.transition_stock_integration(text,jsonb,uuid,integer) to service_role;
-- Both channels share the existing staff owner lock. This is symmetric: a new
-- staff attempt must not pass while an integration command is still uncertain.
create function public.guard_stock_integration_channels() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='mealprep_stock_handoff_attempts' then
  if new.kind<>'count' then return new; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('fullness_stock_handoff:'||new.source_user_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('fullness_stock_recipe:'||new.source_recipe_id::text,0));
 if exists(select 1 from public.mealprep_stock_link_attempts where recipe_id=new.source_recipe_id and state not in ('linked','cancelled')) then raise exception 'Cierra la configuración pendiente';end if;
 if tg_table_name='mealprep_stock_handoff_attempts' then
  if exists(select 1 from public.mealprep_stock_integration_attempts where source_user_id=new.source_user_id and source_recipe_id=new.source_recipe_id and state not in ('committed','cancelled')) then raise exception 'Consulta y cierra el conteo integrado anterior' using errcode='40001'; end if;
 else
  if exists(select 1 from public.mealprep_stock_handoff_attempts where source_user_id=new.source_user_id and source_recipe_id=new.source_recipe_id and kind='count' and state not in ('committed','cancelled')) then raise exception 'Consulta y cierra el conteo anterior' using errcode='40001'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_stock_integration_channels() from public,anon,authenticated;
grant execute on function public.guard_stock_integration_channels() to service_role;
create trigger guard_staff_vs_integration before insert on public.mealprep_stock_handoff_attempts for each row execute function public.guard_stock_integration_channels();
create trigger guard_integration_vs_staff before insert on public.mealprep_stock_integration_attempts for each row execute function public.guard_stock_integration_channels();
notify pgrst,'reload schema';
commit;
