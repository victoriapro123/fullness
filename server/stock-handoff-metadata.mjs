import {readFile} from 'node:fs/promises';
import {denied,digest,exact,stockCrypto,validTime} from './stock-handoff-crypto.mjs';
import {readMealprepStock} from './mealprep-stock.mjs';
import {validateStockConfig} from './stock-handoff-config.mjs';
const REQUEST_KEYS=['version','iss','aud','purpose','requestId','iat','exp','action','intent','coreActorId','phase','signedResult'];
const RESULT_KEYS=['version','iss','aud','consumerId','purpose','requestKey','nonce','intentHash','claimId','coreActorId','tenantId','companyId','sourceSubjectRef','identityBindingRevision','sourceMealprepId','linkRef','linkRevision','coreItemId','locationId','balanceId','status','receiptRef','receiptHash','resultId','iat','exp','snapshot'];
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
// Preserve Postgres microseconds. Never round link identity through JS Date.
export function linkTimestamp(value){const m=String(value).match(/^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(?:Z|\+00(?::?00)?)$/);if(!m)denied('Revisión de vínculo inválida.');return `${m[1]}T${m[2]}.${(m[3]||'').padEnd(6,'0')}Z`;}
export async function loadStockHandoffConfig(env=process.env){
 const file=env.FULLNESS_STOCK_HANDOFF_CONFIG_FILE,json=env.FULLNESS_STOCK_HANDOFF_CONFIG_JSON;
 if(file===undefined&&json===undefined)denied('El guardado de stock aún no está habilitado.',503);
 if(file!==undefined&&json!==undefined)denied('Configura una sola fuente de inventario.',503);
 let config;try{const raw=json!==undefined?json:await readFile(file,'utf8');config=JSON.parse(String(raw).replace(/^\uFEFF/,''));}catch{denied('La configuración de inventario no es válida.',503);}
 return validateStockConfig(config);
}
export function createStockMetadata({supabase,config,crypto=stockCrypto(config),clock=()=>Math.floor(Date.now()/1000),refresh}={}){
 async function transition(action,attempt,document={}){
  const {data,error}=await supabase.rpc('transition_mealprep_stock_handoff',{p_action:action,p_document:{attemptId:attempt.id,...document},p_actor:attempt.source_user_id,p_expected_revision:null});
  if(error)denied('El intento o sus permisos cambiaron. Consulta su resultado antes de repetir.',409);return data;
 }
 async function canonicalRefresh(attempt,intent,result){
  const observed=await readMealprepStock({supabase});
  const row=observed.rows.find(r=>r.recipeId===attempt.source_recipe_id);
  if(!row||row.state!=='known'||row.coreItemId!==intent.coreItemId||linkTimestamp(row.mappingVersion)!==linkTimestamp(intent.linkRevision)||row.availableMilli===null)denied('Falta verificar el saldo canónico.',409);
  const balance=row.balances.find(b=>b.id===result.balanceId);
  if(!balance||!Number.isSafeInteger(Number(balance.version))||Number(balance.version)<=intent.expectedBalanceVersion)denied('El saldo canónico aún no refleja el recibo.',409);
  return {verified:true,observation:row};
 }
 return {async exchange(body){
  exact(body,['signedRequest']);const request=crypto.verify('coreMetadata',body.signedRequest);exact(request,REQUEST_KEYS);
  const now=clock();validTime(request,now,config.maxMetadataAge);
  if(request.version!==1||request.iss!==config.coreIssuer||request.aud!==config.sourceIssuer||request.purpose!=='inventory.absolute_count.metadata'||!uuid(request.requestId)||!['authorize','reconcile'].includes(request.action))denied();
  if(request.action==='authorize'?(!['preview','confirm','recovery'].includes(request.phase)||request.signedResult!==undefined):(request.phase!==undefined||typeof request.signedResult!=='string'))denied();
  const intent=crypto.verify('sourceIntent',request.intent);validTime(intent,now,config.maxIntentAge,{historical:true});
  if(!uuid(intent.requestKey)||intent.iss!==config.sourceIssuer||intent.aud!==config.coreIssuer||intent.version!==1||intent.purpose!=='inventory.absolute_count'||!config.consumers.includes(intent.consumerId))denied();
  const lookup=await supabase.from('mealprep_stock_handoff_attempts').select('*').eq('id',intent.requestKey).maybeSingle();
  const a=lookup.data;if(lookup.error||!a||a.kind!=='count'||a.signed_intent!==request.intent||a.intent_digest!==digest(intent))denied('Intento no reconocido.');
  const scope={sourceSubjectRef:a.source_user_id,expectedCoreActorId:a.core_actor_id,tenantId:a.core_tenant_id,companyId:a.core_company_id,sourceMealprepId:a.source_recipe_id,linkRef:a.source_product_id,coreItemId:a.core_item_id,nonce:a.nonce,consumerId:a.consumer_id,identityBindingRevision:String(a.binding_revision)};
  if(Object.entries(scope).some(([key,value])=>intent[key]!==value)||request.coreActorId!==a.core_actor_id||linkTimestamp(intent.linkRevision)!==linkTimestamp(a.link_revision))denied('El intento pertenece a otro contexto.');
  const output={version:1,iss:config.sourceIssuer,aud:config.coreIssuer,purpose:'inventory.absolute_count.metadata.result',requestId:request.requestId,requestHash:digest(request),iat:now,exp:now+config.maxMetadataAge,action:request.action};
  if(request.action==='authorize'){
   let current=a;
   if(request.phase!=='recovery'){
    validTime(intent,now,config.maxIntentAge);
    current=await transition('claim',a,{intentDigest:digest(intent),coreActorId:request.coreActorId});
    if(current.state!=='claimed'||!current.claim_id)denied('No se autorizó el conteo.',409);
   }
   output.authorization={bound:true,coreActorId:a.core_actor_id,sourceSubjectRef:a.source_user_id,identityBindingRevision:String(a.binding_revision),intentHash:digest(intent),linkRef:intent.linkRef,linkRevision:intent.linkRevision,claimId:current.claim_id,state:request.phase==='recovery'?'recovery':'held'};
  }else{
   const result=crypto.verify('coreResult',request.signedResult);exact(result,RESULT_KEYS);validTime(result,now,config.maxResultAge);
   const expected={version:1,iss:config.coreIssuer,aud:config.sourceIssuer,purpose:'inventory.absolute_count.result',consumerId:intent.consumerId,requestKey:intent.requestKey,nonce:intent.nonce,intentHash:digest(intent),claimId:a.claim_id,coreActorId:a.core_actor_id,tenantId:intent.tenantId,companyId:intent.companyId,sourceSubjectRef:intent.sourceSubjectRef,identityBindingRevision:intent.identityBindingRevision,sourceMealprepId:intent.sourceMealprepId,linkRef:intent.linkRef,linkRevision:intent.linkRevision,coreItemId:intent.coreItemId,locationId:intent.locationId,receiptRef:intent.requestKey};
   if(!a.claim_id||Object.entries(expected).some(([k,v])=>result[k]!==v)||!['confirmed','cancelled'].includes(result.status)||!uuid(result.balanceId)&&result.balanceId!==null||intent.balanceId!==null&&result.balanceId!==intent.balanceId||!/^[a-f0-9]{64}$/.test(result.receiptHash)||result.resultId!==digest([intent.requestKey,result.status,result.receiptHash]))denied('El recibo no corresponde al conteo.');
   if(a.result_proof){const previous=crypto.verify('coreResult',a.result_proof);if(previous.receiptHash!==result.receiptHash||previous.resultId!==result.resultId||previous.status!==result.status)denied('El recibo durable no coincide con el resultado anterior.',409);}
   let current=await transition('record_result',a,{claimId:a.claim_id,coreActorId:a.core_actor_id,nonce:a.nonce,outcome:result.status==='confirmed'?'committed':'cancelled',receiptId:result.receiptRef,proof:request.signedResult});
   if(current.state==='result_pending'){
    try{
     const observation=await (refresh||canonicalRefresh)(current,intent,result);
     if(observation?.verified===true)current=await transition('complete',current,{receiptId:result.receiptRef,canonicalRefreshVerified:true,observationDigest:digest(observation.observation)});
    }catch{/* Preserve terminal Core evidence; retry reading, never repeat physical count. */}
   }
   output.reconciliation={receiptRecorded:current.core_receipt_id===result.receiptRef,sourceState:current.state,canonicalRefreshVerified:current.state==='committed'};
  }
  return {signedResponse:crypto.sign('sourceMetadata',output)};
 }};
}
