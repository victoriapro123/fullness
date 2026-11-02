begin;
-- Coordination metadata only. These tables never represent an inventory balance.
create table public.mealprep_stock_bindings (
 id uuid primary key default gen_random_uuid(),source_user_id uuid not null,
 core_tenant_id uuid not null,core_company_id uuid not null,core_actor_id uuid not null,
 state text not null check(state in ('active','revocation_pending','revoked')),
 revision bigint not null default 1 check(revision>0),
 proof text not null check(length(proof) between 1 and 65536),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(source_user_id,core_tenant_id,core_company_id)
);
create table public.mealprep_stock_handoff_attempts (
 id uuid primary key default gen_random_uuid(),request_key uuid not null,source_user_id uuid not null,
 kind text not null check(kind in ('binding','count')),
 core_tenant_id uuid not null,core_company_id uuid not null,
 source_recipe_id uuid references public.meal_library_items(id) on delete restrict,
 source_product_id uuid references public.menu_items(id) on delete restrict,
 core_item_id uuid,link_revision timestamptz,
 binding_id uuid references public.mealprep_stock_bindings(id) on delete restrict,
 binding_revision bigint,core_actor_id uuid,
 source_origin text not null,consumer_id text not null check(consumer_id in ('fullness.mealprep-list.stock.v1','fullness.mealprep-detail.stock.v1')),
 requested_payload jsonb not null check(jsonb_typeof(requested_payload)='object'),
 nonce text not null unique default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
 state text not null default 'prepared' check(state in ('prepared','claimed','cancel_requested','result_pending','committed','cancelled','expired','rejected','conflict')),
 revision bigint not null default 1 check(revision>0),
 signed_intent text,intent_digest text,claim_id uuid,claimed_at timestamptz,
 core_outcome text check(core_outcome in ('committed','cancelled','rejected')),
 core_receipt_id text,result_proof text,observation_digest text,
 expires_at timestamptz not null default now()+interval '10 minutes',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(source_user_id,request_key),
 check(kind='binding' or (source_recipe_id is not null and source_product_id is not null and core_item_id is not null and link_revision is not null and binding_id is not null and binding_revision is not null and core_actor_id is not null)),
 check(signed_intent is null or length(signed_intent) between 1 and 65536),
 check(result_proof is null or length(result_proof) between 1 and 65536),
 check(intent_digest is null or intent_digest~'^[a-f0-9]{64}$'),
 check(observation_digest is null or observation_digest~'^[a-f0-9]{64}$')
);
create index stock_handoff_binding_inflight_idx on public.mealprep_stock_handoff_attempts(binding_id,state) where state in ('claimed','cancel_requested');
create index stock_handoff_user_updated_idx on public.mealprep_stock_handoff_attempts(source_user_id,updated_at desc);
create index stock_handoff_recipe_idx on public.mealprep_stock_handoff_attempts(source_recipe_id);
create index stock_handoff_product_idx on public.mealprep_stock_handoff_attempts(source_product_id);
create index stock_handoff_prepared_expiry_idx on public.mealprep_stock_handoff_attempts(expires_at) where state='prepared';
create table public.mealprep_stock_handoff_events (
 id uuid primary key default gen_random_uuid(),attempt_id uuid references public.mealprep_stock_handoff_attempts(id) on delete restrict,
 binding_id uuid references public.mealprep_stock_bindings(id) on delete restrict,
 source_user_id uuid not null,action text not null,before_state text,after_state text,revision bigint,created_at timestamptz not null default now()
);
create index stock_handoff_event_attempt_idx on public.mealprep_stock_handoff_events(attempt_id,created_at);
create index stock_handoff_event_binding_idx on public.mealprep_stock_handoff_events(binding_id,created_at);
create index stock_handoff_event_actor_idx on public.mealprep_stock_handoff_events(source_user_id,created_at);
alter table public.mealprep_stock_bindings enable row level security;
alter table public.mealprep_stock_handoff_attempts enable row level security;
alter table public.mealprep_stock_handoff_events enable row level security;
revoke all on public.mealprep_stock_bindings,public.mealprep_stock_handoff_attempts,public.mealprep_stock_handoff_events from public,anon,authenticated;
grant select,insert,update on public.mealprep_stock_bindings,public.mealprep_stock_handoff_attempts to service_role;
grant select,insert on public.mealprep_stock_handoff_events to service_role;

-- Only the authenticated backend may invoke this. It verifies Source auth or a
-- Core-signed proof BEFORE calling. No external HTTP or crypto runs under locks.
create function public.transition_mealprep_stock_handoff(p_action text,p_document jsonb,p_actor uuid,p_expected_revision bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 a public.mealprep_stock_handoff_attempts;
 b public.mealprep_stock_bindings;
 prior_state text;
 linked boolean;
 next_state text;
 kind_value text;
begin
 if p_actor is null then raise exception 'Identidad requerida' using errcode='42501'; end if;
 -- Reconciliation may arrive after revocation. Keep a verified Core outcome;
 -- revocation prevents NEW claims, not recording an already executed action.
 if p_action not in ('record_result','complete','inspect') and not exists(select 1 from public.profiles where id=p_actor and is_admin) then
  raise exception 'Administración requerida' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('fullness_stock_handoff:'||p_actor::text,0));
 if p_action='revoke_binding' then
  select * into b from public.mealprep_stock_bindings where id=(p_document->>'bindingId')::uuid and source_user_id=p_actor for update;
  if b.id is null then raise exception 'Vínculo no encontrado' using errcode='42501'; end if;
  if b.state='revoked' then return to_jsonb(b); end if;
  if p_expected_revision is distinct from b.revision then raise exception 'El vínculo cambió' using errcode='40001'; end if;
  next_state:=case when exists(select 1 from public.mealprep_stock_handoff_attempts where binding_id=b.id and state in ('claimed','cancel_requested')) then 'revocation_pending' else 'revoked' end;
  prior_state:=b.state;
  update public.mealprep_stock_bindings set state=next_state,revision=revision+1,updated_at=now() where id=b.id returning * into b;
  insert into public.mealprep_stock_handoff_events(binding_id,source_user_id,action,before_state,after_state,revision)values(b.id,p_actor,p_action,prior_state,b.state,b.revision);
  return to_jsonb(b);
 end if;
 if p_action in ('prepare','binding_prepare') then
  kind_value:=case when p_action='prepare' then 'count' else 'binding' end;
  select * into a from public.mealprep_stock_handoff_attempts where source_user_id=p_actor and request_key=(p_document->>'requestKey')::uuid for update;
  if a.id is not null then
   if a.kind<>kind_value or a.requested_payload is distinct from p_document->'payload' or a.core_tenant_id is distinct from (p_document->>'tenantId')::uuid or a.core_company_id is distinct from (p_document->>'companyId')::uuid
    or a.source_origin is distinct from p_document->>'sourceOrigin' or a.consumer_id is distinct from p_document->>'consumerId'
    or a.source_recipe_id is distinct from nullif(p_document->>'recipeId','')::uuid or a.core_item_id is distinct from nullif(p_document->>'coreItemId','')::uuid
    or a.link_revision is distinct from nullif(p_document->>'linkRevision','')::timestamptz then
    raise exception 'La clave corresponde a otro intento; consulta su resultado antes de repetir' using errcode='40001';
   end if;
   return to_jsonb(a);
  end if;
  if kind_value='count' then
   select * into b from public.mealprep_stock_bindings where source_user_id=p_actor and core_tenant_id=(p_document->>'tenantId')::uuid and core_company_id=(p_document->>'companyId')::uuid and state='active' for update;
   if b.id is null then raise exception 'Conecta tu propia cuenta Core360 antes de contar' using errcode='42501'; end if;
   select exists(select 1 from public.menu_items m join public.core360_product_mappings mp on mp.source_menu_item_id=m.id
    where m.id=(p_document->>'productId')::uuid and m.library_meal_id=(p_document->>'recipeId')::uuid and m.product_type='mealprep' and m.is_active
    and mp.is_active and mp.core_item_id=p_document->>'coreItemId' and mp.updated_at=(p_document->>'linkRevision')::timestamptz) into linked;
   if not linked then raise exception 'El vínculo del mealprep cambió o no corresponde a una porción' using errcode='40001'; end if;
  end if;
  insert into public.mealprep_stock_handoff_attempts(request_key,source_user_id,kind,core_tenant_id,core_company_id,source_recipe_id,source_product_id,core_item_id,link_revision,binding_id,binding_revision,core_actor_id,source_origin,consumer_id,requested_payload)
  values((p_document->>'requestKey')::uuid,p_actor,kind_value,(p_document->>'tenantId')::uuid,(p_document->>'companyId')::uuid,
   nullif(p_document->>'recipeId','')::uuid,nullif(p_document->>'productId','')::uuid,nullif(p_document->>'coreItemId','')::uuid,nullif(p_document->>'linkRevision','')::timestamptz,
   b.id,b.revision,b.core_actor_id,p_document->>'sourceOrigin',p_document->>'consumerId',p_document->'payload')returning * into a;
 else
  select * into a from public.mealprep_stock_handoff_attempts where id=(p_document->>'attemptId')::uuid and source_user_id=p_actor for update;
  if a.id is null then raise exception 'Intento no encontrado' using errcode='42501'; end if;
  if p_action='inspect' then return to_jsonb(a); end if;
  if p_action='seal' and a.signed_intent is not null then return to_jsonb(a); end if;
  if p_action='binding_result' and a.kind='binding' and a.state='committed' and a.nonce=p_document->>'nonce' and a.core_actor_id=(p_document->>'coreActorId')::uuid and a.core_receipt_id=p_document->>'receiptId' then return to_jsonb(a); end if;
  if p_action='record_result' and a.core_receipt_id=p_document->>'receiptId' and a.core_outcome=p_document->>'outcome' and a.claim_id=(p_document->>'claimId')::uuid and a.nonce=p_document->>'nonce' and a.core_actor_id=(p_document->>'coreActorId')::uuid then return to_jsonb(a); end if;
  if p_action='complete' and a.state='committed' and a.core_receipt_id=p_document->>'receiptId' then return to_jsonb(a); end if;
  if p_expected_revision is not null and p_expected_revision<>a.revision then raise exception 'El intento cambió; consulta antes de continuar' using errcode='40001'; end if;
  prior_state:=a.state;
  if p_action='seal' then
   if a.state<>'prepared' or a.expires_at<=now() then raise exception 'El intento ya no se puede preparar' using errcode='40001'; end if;
   update public.mealprep_stock_handoff_attempts set signed_intent=p_document->>'signedIntent',intent_digest=p_document->>'intentDigest',revision=revision+1,updated_at=now() where id=a.id returning * into a;
  elsif p_action='binding_result' then
   if a.kind<>'binding' or a.state<>'prepared' or a.expires_at<=now() or p_document->'confirmed' is distinct from 'true'::jsonb or p_document->>'nonce' is distinct from a.nonce or nullif(p_document->>'proof','')is null then raise exception 'Confirmación de cuentas inválida' using errcode='42501'; end if;
   select * into b from public.mealprep_stock_bindings where source_user_id=p_actor and core_tenant_id=a.core_tenant_id and core_company_id=a.core_company_id for update;
   if b.id is not null and b.state<>'revoked' and (b.state<>'active' or b.core_actor_id is distinct from (p_document->>'coreActorId')::uuid) then raise exception 'Revoca y concilia el vínculo anterior antes de cambiar de cuenta' using errcode='40001'; end if;
   if b.id is null then
    insert into public.mealprep_stock_bindings(source_user_id,core_tenant_id,core_company_id,core_actor_id,state,proof)values(p_actor,a.core_tenant_id,a.core_company_id,(p_document->>'coreActorId')::uuid,'active',p_document->>'proof')returning * into b;
   elsif b.state='revoked' then
    update public.mealprep_stock_bindings set core_actor_id=(p_document->>'coreActorId')::uuid,state='active',proof=p_document->>'proof',revision=revision+1,updated_at=now()where id=b.id returning * into b;
   end if;
   update public.mealprep_stock_handoff_attempts set state='committed',binding_id=b.id,binding_revision=b.revision,core_actor_id=b.core_actor_id,result_proof=p_document->>'proof',core_receipt_id=p_document->>'receiptId',revision=revision+1,updated_at=now()where id=a.id returning * into a;
  elsif p_action='claim' then
   if a.kind<>'count' or a.state not in ('prepared','claimed') or a.intent_digest is null or a.intent_digest is distinct from p_document->>'intentDigest' or a.core_actor_id is distinct from (p_document->>'coreActorId')::uuid then raise exception 'El conteo no se puede reclamar' using errcode='40001'; end if;
   select * into b from public.mealprep_stock_bindings where id=a.binding_id for update;
   if b.state<>'active' or b.revision<>a.binding_revision then raise exception 'La conexión de cuentas ya no está vigente' using errcode='42501'; end if;
   select exists(select 1 from public.menu_items m join public.core360_product_mappings mp on mp.source_menu_item_id=m.id where m.id=a.source_product_id and m.library_meal_id=a.source_recipe_id and m.product_type='mealprep' and m.is_active and mp.is_active and mp.core_item_id=a.core_item_id::text and mp.updated_at=a.link_revision) into linked;
   if not linked then raise exception 'El vínculo del producto cambió' using errcode='40001'; end if;
   -- A replay is idempotent only AFTER the current owner, binding and link gates.
   if a.state='claimed' then return to_jsonb(a); end if;
   update public.mealprep_stock_handoff_attempts set state=case when expires_at<=now()then 'expired' else 'claimed' end,claim_id=case when expires_at>now()then gen_random_uuid()else null end,claimed_at=case when expires_at>now()then now()else null end,revision=revision+1,updated_at=now()where id=a.id returning * into a;
  elsif p_action='cancel' then
   next_state:=case when a.state='prepared' then 'cancelled' when a.state in ('claimed','cancel_requested')then 'cancel_requested' else a.state end;
   update public.mealprep_stock_handoff_attempts set state=next_state,revision=revision+1,updated_at=now()where id=a.id returning * into a;
  elsif p_action='record_result' then
   if a.kind<>'count' or a.state not in ('claimed','cancel_requested','result_pending') or a.claim_id is distinct from (p_document->>'claimId')::uuid or a.core_actor_id is distinct from (p_document->>'coreActorId')::uuid or p_document->>'nonce' is distinct from a.nonce
    or p_document->>'outcome' not in ('committed','cancelled','rejected') or nullif(p_document->>'receiptId','')is null or nullif(p_document->>'proof','')is null then raise exception 'Resultado Core no corresponde al intento' using errcode='42501'; end if;
   if a.core_receipt_id is not null then raise exception 'Hay otro resultado confirmado; revisar la evidencia' using errcode='40001'; end if;
   select exists(select 1 from public.menu_items m join public.core360_product_mappings mp on mp.source_menu_item_id=m.id where m.id=a.source_product_id and m.library_meal_id=a.source_recipe_id and m.product_type='mealprep' and mp.is_active and mp.core_item_id=a.core_item_id::text and mp.updated_at=a.link_revision)into linked;
   next_state:=case when not linked then 'conflict' when p_document->>'outcome'='committed' then 'result_pending' when p_document->>'outcome'='cancelled' then 'cancelled' else 'rejected' end;
   update public.mealprep_stock_handoff_attempts set state=next_state,core_outcome=p_document->>'outcome',core_receipt_id=p_document->>'receiptId',result_proof=p_document->>'proof',revision=revision+1,updated_at=now()where id=a.id returning * into a;
  elsif p_action='complete' then
   if a.state<>'result_pending' or a.core_outcome<>'committed' or a.core_receipt_id is distinct from p_document->>'receiptId' or p_document->'canonicalRefreshVerified' is distinct from 'true'::jsonb or coalesce(p_document->>'observationDigest','')!~'^[a-f0-9]{64}$' then raise exception 'Falta verificar el recibo y refrescar Core' using errcode='40001'; end if;
   select exists(select 1 from public.menu_items m join public.core360_product_mappings mp on mp.source_menu_item_id=m.id where m.id=a.source_product_id and m.library_meal_id=a.source_recipe_id and m.product_type='mealprep' and mp.is_active and mp.core_item_id=a.core_item_id::text and mp.updated_at=a.link_revision)into linked;
   update public.mealprep_stock_handoff_attempts set state=case when linked then 'committed' else 'conflict' end,observation_digest=p_document->>'observationDigest',revision=revision+1,updated_at=now()where id=a.id returning * into a;
  else raise exception 'Acción inválida' using errcode='22023'; end if;
 end if;
 insert into public.mealprep_stock_handoff_events(attempt_id,binding_id,source_user_id,action,before_state,after_state,revision)values(a.id,a.binding_id,p_actor,p_action,prior_state,a.state,a.revision);
 -- A late outcome may settle an earlier requested revocation. Never by a lease.
 if a.binding_id is not null then
  update public.mealprep_stock_bindings set state='revoked',revision=revision+1,updated_at=now()where id=a.binding_id and state='revocation_pending'
   and not exists(select 1 from public.mealprep_stock_handoff_attempts where binding_id=a.binding_id and state in ('claimed','cancel_requested'));
 end if;
 return to_jsonb(a);
end;
$$;
revoke all on function public.transition_mealprep_stock_handoff(text,jsonb,uuid,bigint)from public,anon,authenticated;
grant execute on function public.transition_mealprep_stock_handoff(text,jsonb,uuid,bigint)to service_role;
comment on table public.mealprep_stock_handoff_attempts is 'Private durable intent/binding/receipt coordination. Requested payload is command evidence, never a second inventory ledger. Core alone changes physical balances.';
commit;
