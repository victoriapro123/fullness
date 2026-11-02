import{denied,digest,exact,stockCrypto,validTime}from'./stock-handoff-crypto.mjs';import{bindingCrypto}from'./stock-binding-crypto.mjs';
const protocol='main-stock-binding-v1-r1',coreConsent='core.stock-binding.v1',sourceConsent='fullness.stock-binding.v1';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
export function sourceIdentity(user){if(!uuid(user?.id)||!user.email_confirmed_at||typeof user.email!=='string'||!user.email.trim())denied('Confirma tu correo Fullness antes de conectar las cuentas.');return{id:user.id,email:user.email.trim().toLowerCase(),name:String(user.user_metadata?.full_name||user.user_metadata?.name||user.email).slice(0,200),emailVerified:true};}
export function createStockBinding({supabase,config,crypto=bindingCrypto(config),metadataCrypto=stockCrypto(config),clock=()=>Math.floor(Date.now()/1000)}){
 if(config.bindingEnabled!==true||!Number.isSafeInteger(config.maxBindingIntentAge)||config.maxBindingIntentAge<1||config.maxBindingIntentAge>600||!Number.isSafeInteger(config.maxBindingResultAge)||config.maxBindingResultAge<1||config.maxBindingResultAge>300||!uuid(config.tenantId)||!uuid(config.companyId))denied('La conexión de cuentas no está habilitada.',503);
 async function rpc(action,actor,document,revision=null){const r=await supabase.rpc('transition_mealprep_stock_handoff',{p_action:action,p_document:document,p_actor:actor,p_expected_revision:revision});if(r.error)denied('Las cuentas o el intento cambiaron; vuelve a comprobar su estado.',409);return r.data;}
 async function attempt(id){const r=await supabase.from('mealprep_stock_handoff_attempts').select('*').eq('id',id).maybeSingle();if(r.error||!r.data||r.data.kind!=='binding')denied('Asociación no encontrada.',404);return r.data;}
 async function current(userId){const r=await supabase.from('mealprep_stock_bindings').select('*').eq('source_user_id',userId).eq('core_tenant_id',config.tenantId).eq('core_company_id',config.companyId).maybeSingle();if(r.error)denied('No pudimos consultar tu conexión.',503);return r.data;}
 async function challenge(token){const i=crypto.verify('sourceBindingIntent',token);exact(i,['version','iss','aud','consumerId','purpose','requestKey','nonce','iat','exp','tenantId','companyId','sourceSubjectRef','sourceIdentity','expectedPreviousBindingRevision','coreConsentVersion','sourceConsentVersionExpected']);validTime(i,clock(),config.maxBindingIntentAge);
  if(i.version!==1||i.iss!==config.sourceIssuer||i.aud!==config.coreIssuer||i.purpose!=='inventory.identity_binding'||i.tenantId!==config.tenantId||i.companyId!==config.companyId||!config.consumers.includes(i.consumerId)||!uuid(i.requestKey))denied();
  const a=await attempt(i.requestKey);if(a.signed_intent!==token||a.intent_digest!==digest(i)||a.source_user_id!==i.sourceSubjectRef||a.nonce!==i.nonce||a.requested_payload.protocol!==protocol||digest(a.requested_payload.sourceIdentity)!==digest(i.sourceIdentity)||a.requested_payload.expectedPreviousBindingRevision!==i.expectedPreviousBindingRevision||a.consumer_id!==i.consumerId||a.core_tenant_id!==i.tenantId||a.core_company_id!==i.companyId||i.coreConsentVersion!==coreConsent||i.sourceConsentVersionExpected!==sourceConsent)denied('La intención de asociación no coincide.');return{a,i};
 }
 async function checkedProof(user,signedResult){
  const p=crypto.verify('coreBindingResult',signedResult);exact(p,['version','iss','aud','consumerId','purpose','requestKey','nonce','intentHash','sourceSubjectRef','sourceIdentity','coreActorId','coreIdentity','tenantId','companyId','expectedPreviousBindingRevision','consent','coreConsentVersion','coreConsentAt','sourceConsentVersionExpected','proofRef','countEligibility','iat','exp']);validTime(p,clock(),config.maxBindingResultAge);
  const a=await attempt(p.requestKey),{i}=await challenge(a.signed_intent),identity=sourceIdentity(user);
  const expected={version:1,iss:config.coreIssuer,aud:config.sourceIssuer,consumerId:i.consumerId,purpose:'inventory.identity_binding.result',requestKey:i.requestKey,nonce:i.nonce,intentHash:digest(i),sourceSubjectRef:user.id,tenantId:i.tenantId,companyId:i.companyId,expectedPreviousBindingRevision:i.expectedPreviousBindingRevision,consent:true,coreConsentVersion:coreConsent,sourceConsentVersionExpected:sourceConsent};
  exact(p.coreIdentity,['id','name','email','emailVerified']);exact(p.countEligibility,['canWriteCount','reasonCode','observedAt']);
  if(Object.entries(expected).some(([k,v])=>p[k]!==v)||!uuid(p.coreActorId)||p.coreIdentity?.id!==p.coreActorId||p.coreIdentity.emailVerified!==true||p.coreIdentity.email?.trim().toLowerCase()!==identity.email||digest(p.sourceIdentity)!==digest(i.sourceIdentity)||identity.id!==i.sourceIdentity.id||identity.email!==i.sourceIdentity.email||!Number.isSafeInteger(p.coreConsentAt)||p.coreConsentAt>clock()+30||p.coreConsentAt<p.iat-60||typeof p.countEligibility.canWriteCount!=='boolean'||!Number.isSafeInteger(p.countEligibility.observedAt)||p.proofRef!=='binding-v1:'+digest([p.purpose,p.requestKey,p.nonce,p.intentHash,p.sourceSubjectRef,p.coreActorId,p.tenantId,p.companyId]))denied('Revisa las cuentas: ambas deben ser tuyas y tener correo verificado coincidente.');
  return{a,p,i};
 }
 return{
  async metadata(body){exact(body,['signedRequest']);const r=metadataCrypto.verify('coreMetadata',body.signedRequest);exact(r,['version','iss','aud','purpose','requestId','iat','exp','action','intent','coreActorId','phase']);validTime(r,clock(),config.maxMetadataAge);
   if(r.version!==1||r.iss!==config.coreIssuer||r.aud!==config.sourceIssuer||r.purpose!=='inventory.identity_binding.metadata'||r.action!=='binding.authorize'||!['preview','confirm'].includes(r.phase)||!uuid(r.coreActorId)||!uuid(r.requestId))denied();
   const{a,i}=await challenge(r.intent);await rpc('binding_authorize',a.source_user_id,{attemptId:a.id,intentDigest:digest(i)});
   const now=clock(),authorizationBinding={requestKey:i.requestKey,sourceSubjectRef:i.sourceSubjectRef,sourceIdentity:i.sourceIdentity,tenantId:i.tenantId,companyId:i.companyId,intentHash:digest(i),nonce:i.nonce,state:'prepared',expectedPreviousBindingRevision:i.expectedPreviousBindingRevision};
   return{signedResponse:metadataCrypto.sign('sourceMetadata',{version:1,iss:config.sourceIssuer,aud:config.coreIssuer,purpose:'inventory.identity_binding.metadata.result',requestId:r.requestId,requestHash:digest(r),iat:now,exp:now+config.maxMetadataAge,action:'binding.authorize',authorizationBinding})};
  },
  async owner(user,body){
   exact(body,['action','requestKey','consumerId','signedResult','confirmed','sourceConsentVersion','bindingId','revision']);const identity=sourceIdentity(user);
   if(body.action==='binding.inspect'){
    const b=await current(user.id);let coreIdentity=null,countEligibility=null;
    if(b?.proof){try{const p=crypto.verify('coreBindingResult',b.proof);coreIdentity=p.coreIdentity;countEligibility=p.countEligibility;}catch{/* Legacy fixture has no verifiable presentation/eligibility. */}}
    return{status:b?.state||'unbound',bindingId:b?.id||null,revision:b?String(b.revision):null,sourceIdentity:identity,coreIdentity,countEligibility};
   }
   if(body.action==='binding.prepare'){
    if(!uuid(body.requestKey)||!config.consumers.includes(body.consumerId))denied('Solicitud inválida.',400);const b=await current(user.id);
    const payload={protocol,sourceIdentity:identity,expectedPreviousBindingRevision:b?String(b.revision):null,coreConsentVersion:coreConsent,sourceConsentVersionExpected:sourceConsent};
    const a=await rpc('binding_prepare',user.id,{requestKey:body.requestKey,tenantId:config.tenantId,companyId:config.companyId,sourceOrigin:config.sourceIssuer,consumerId:body.consumerId,payload});
    if(a.signed_intent)return{attemptId:a.id,intent:a.signed_intent,consumerId:a.consumer_id,corePage:config.corePage,status:a.state};
    const now=clock(),i={version:1,iss:config.sourceIssuer,aud:config.coreIssuer,consumerId:a.consumer_id,purpose:'inventory.identity_binding',requestKey:a.id,nonce:a.nonce,iat:now,exp:now+config.maxBindingIntentAge,tenantId:a.core_tenant_id,companyId:a.core_company_id,sourceSubjectRef:user.id,sourceIdentity:identity,expectedPreviousBindingRevision:payload.expectedPreviousBindingRevision,coreConsentVersion:coreConsent,sourceConsentVersionExpected:sourceConsent};
    const sealed=await rpc('seal',user.id,{attemptId:a.id,signedIntent:crypto.sign(i),intentDigest:digest(i)});
    return{attemptId:a.id,intent:sealed.signed_intent,consumerId:a.consumer_id,sourceIdentity:identity,corePage:config.corePage,status:sealed.state};
   }
   if(body.action==='binding.cancel'){
    exact(body,['action','requestKey']);if(!uuid(body.requestKey))denied('Intento inválido.',400);
    const lookup=await supabase.from('mealprep_stock_handoff_attempts').select('*').eq('source_user_id',user.id).eq('request_key',body.requestKey).eq('kind','binding').maybeSingle();
    if(lookup.error)denied('No pudimos comprobar el intento de conexión.',503);
    if(!lookup.data)return{status:'not_found',resetAllowed:true,bindingUnchanged:true};
    const a=lookup.data,next=a.state==='prepared'?await rpc('cancel',user.id,{attemptId:a.id},a.revision):a;
    return{status:next.state,resetAllowed:next.state==='cancelled',bindingUnchanged:true};
   }
   if(body.action==='binding.review'||body.action==='binding.accept'){
    const{a,p}=await checkedProof(user,body.signedResult);
    if(body.action==='binding.review')return{status:'awaiting_source_consent',sourceIdentity:p.sourceIdentity,coreIdentity:p.coreIdentity,companyId:p.companyId,companyLabel:config.environment==='qa'?'Empresa de prueba aislada':'Fullness Lab',countEligibility:p.countEligibility,sourceConsentVersion:sourceConsent};
    if(body.confirmed!==true||body.sourceConsentVersion!==sourceConsent)denied('Confirma explícitamente la asociación en Fullness.');
    await rpc('binding_result',user.id,{attemptId:a.id,nonce:a.nonce,coreActorId:p.coreActorId,confirmed:true,proof:body.signedResult,receiptId:p.proofRef,sourceConfirmed:true,sourceConsentVersion:sourceConsent,sourceConsentAt:clock()},a.revision);
    return this.owner(user,{action:'binding.inspect'});
   }
   if(body.action==='binding.revoke'){
    if(body.confirmed!==true||!uuid(body.bindingId)||!/^\d+$/.test(body.revision||''))denied('Confirma la desconexión y su revisión.');
    const b=await rpc('revoke_binding',user.id,{bindingId:body.bindingId},Number(body.revision));return{status:b.state};
   }
   denied('Acción de conexión desconocida.',400);
  }
 };
}
