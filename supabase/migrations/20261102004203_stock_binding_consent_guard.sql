begin;
-- Addendum binding-v1. Existing r2 count implementation/ledger remains unchanged.
alter table public.mealprep_stock_handoff_attempts add column source_consent_version text,add column source_consent_at bigint;
alter function public.transition_mealprep_stock_handoff(text,jsonb,uuid,bigint) rename to transition_mealprep_stock_handoff_r2;
create function public.transition_mealprep_stock_handoff(p_action text,p_document jsonb,p_actor uuid,p_expected_revision bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.mealprep_stock_handoff_attempts;b public.mealprep_stock_bindings;payload jsonb;result jsonb;expected text;
begin
 if p_action in ('binding_prepare','binding_authorize','binding_result') then
  if not exists(select 1 from public.profiles where id=p_actor and is_admin)then raise exception 'Administración requerida' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('fullness_stock_handoff:'||p_actor::text,0));
  if p_action='binding_prepare' then
   payload:=p_document->'payload';
   select * into b from public.mealprep_stock_bindings where source_user_id=p_actor and core_tenant_id=(p_document->>'tenantId')::uuid and core_company_id=(p_document->>'companyId')::uuid for update;
  else
   select * into a from public.mealprep_stock_handoff_attempts where id=(p_document->>'attemptId')::uuid and source_user_id=p_actor for update;
   if a.id is null or a.kind<>'binding' then raise exception 'Intento de asociación inválido' using errcode='42501';end if;
   payload:=a.requested_payload;
   select * into b from public.mealprep_stock_bindings where source_user_id=p_actor and core_tenant_id=a.core_tenant_id and core_company_id=a.core_company_id for update;
  end if;
  if payload->>'protocol'='main-stock-binding-v1-r1' then
   if p_action='binding_result' and a.state='committed' then
    return public.transition_mealprep_stock_handoff_r2(p_action,p_document,p_actor,p_expected_revision);
   end if;
   expected:=payload->>'expectedPreviousBindingRevision';
   if expected is distinct from b.revision::text or b.state='revocation_pending' then raise exception 'La asociación anterior cambió; vuelve a revisar las cuentas' using errcode='40001';end if;
   if not(payload?'expectedPreviousBindingRevision') or payload->>'coreConsentVersion' is distinct from 'core.stock-binding.v1' or payload->>'sourceConsentVersionExpected' is distinct from 'fullness.stock-binding.v1' then raise exception 'Versión de consentimiento inválida' using errcode='42501';end if;
   if p_action<>'binding_prepare' and (a.state<>'prepared' or a.expires_at<=now() or a.intent_digest is null)then raise exception 'La asociación preparada ya no está vigente' using errcode='40001';end if;
   if p_action='binding_authorize' then
    if a.intent_digest is distinct from p_document->>'intentDigest' then raise exception 'La intención de asociación cambió' using errcode='42501';end if;
    return to_jsonb(a);
   end if;
   if p_action='binding_result' then
    if p_document->>'sourceConsentVersion' is distinct from 'fullness.stock-binding.v1' or p_document->'sourceConfirmed' is distinct from 'true'::jsonb or p_document->>'sourceConsentAt' is null or abs(extract(epoch from now())-(p_document->>'sourceConsentAt')::bigint)>60 then raise exception 'Confirma la asociación desde tu sesión Fullness' using errcode='42501';end if;
    if p_expected_revision is distinct from a.revision then raise exception 'El intento cambió' using errcode='40001';end if;
   end if;
  elsif p_action='binding_authorize' then
   raise exception 'Protocolo de asociación inválido' using errcode='42501';
  end if;
 end if;
 result:=public.transition_mealprep_stock_handoff_r2(p_action,p_document,p_actor,p_expected_revision);
 if p_action='binding_result' and payload->>'protocol'='main-stock-binding-v1-r1' then
  -- Re-consent with the SAME Core actor refreshes its signed READ observation,
  -- without changing identity/revision or releasing any in-flight count.
  update public.mealprep_stock_bindings set proof=p_document->>'proof',updated_at=now() where id=(result->>'binding_id')::uuid and core_actor_id=(p_document->>'coreActorId')::uuid and state='active';
  update public.mealprep_stock_handoff_attempts set source_consent_version=p_document->>'sourceConsentVersion',source_consent_at=(p_document->>'sourceConsentAt')::bigint where id=a.id;
  select to_jsonb(x) into result from public.mealprep_stock_handoff_attempts x where x.id=a.id;
 end if;
 return result;
end $$;
revoke all on function public.transition_mealprep_stock_handoff(text,jsonb,uuid,bigint) from public,anon,authenticated;
grant execute on function public.transition_mealprep_stock_handoff(text,jsonb,uuid,bigint) to service_role;
commit;
