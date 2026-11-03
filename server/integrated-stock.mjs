import {randomUUID} from 'node:crypto';
import {linkTimestamp} from './stock-handoff-metadata.mjs';
import {callIntegration,digest,exact,fail,uuid} from './integrated-stock-crypto.mjs';
import {readDirectMealprepStock} from './integrated-stock-links.mjs';
import {loadLinksConfig} from './integrated-stock-links-crypto.mjs';
const TABLE='mealprep_stock_integration_attempts';
const consumers=['fullness.mealprep-list.stock.v1','fullness.mealprep-detail.stock.v1'];
const canonicalLinkRevision=value=>linkTimestamp(value);
function before(message,statusCode=409){throw Object.assign(Error(message),{statusCode,preparationNotStarted:true});}
export function createIntegratedStockService({supabase,config,readStock,coreCall=callIntegration,clock=()=>Math.floor(Date.now()/1000),fetchImpl=fetch}){
 const read=async user=>{if(readStock)return readStock({supabase});const linksConfig=await loadLinksConfig();if(['integrationId','tenantId','companyId','sourceIssuer','coreIssuer'].some(k=>linksConfig[k]!==config[k]))fail('La configuración de inventario no coincide.');return readDirectMealprepStock({supabase,user,config:linksConfig});};
 async function lookup(user,recipeId,key){const r=await supabase.from(TABLE).select('*').eq('source_user_id',user.id).eq('source_recipe_id',recipeId).eq('request_key',key).maybeSingle();if(r.error)fail('No pudimos consultar el intento.');return r.data;}
 async function transition(user,action,a,extra={}){
  const r=await supabase.rpc('transition_stock_integration',{p_action:action,p_document:{...(a?{attemptId:a.id}:{}),...extra},p_actor:user.id,p_expected_revision:a?.revision??null});
  if(r.error)fail('El intento o sus permisos cambiaron. Consulta el estado antes de repetir.',409);return r.data;
 }
 function view(a){
  if(a.state==='committed')return {status:'committed',requestKey:a.request_key,receiptId:a.core_receipt_id};
  if(a.state==='cancelled')return {status:'cancelled',requestKey:a.request_key,cancellationVerified:true};
  if(a.core_receipt_id)return {status:'registered',requestKey:a.request_key,receiptId:a.core_receipt_id,refreshPending:true};
  return {status:'pending',requestKey:a.request_key};
 }
 async function finalize(user,a){
  if(a.state!=='result_pending'||!a.core_receipt_id)return view(a);
  try{
   const stock=await read(user),row=stock.rows.find(r=>r.recipeId===a.source_recipe_id),balance=row?.balances.find(b=>b.id===a.intent.balanceId);
   if(row?.state!=='known'||row.coreItemId!==a.core_item_id||!balance||balance.locationId!==a.intent.locationId||!Number.isSafeInteger(balance.version))return view(a);
   a=await transition(user,'commit',a,{freshObservation:{observedAt:stock.observedAt,coreItemId:row.coreItemId,balanceId:balance.id,balanceVersion:balance.version,physicalMilli:balance.physicalMilli,reservedMilli:balance.reservedMilli,availableMilli:row.availableMilli}});
  }catch{/* Verified receipt is durable. Never send the physical count twice. */}
  return view(a);
 }
 async function settle(user,a,result){
  if(result.status==='confirmed'){
   a=await transition(user,'observe',a,{receiptId:result.receipt.receiptRef,result:result.receipt,signedEnvelope:result.signedEnvelope});
   return finalize(user,a);
  }
  if(result.status==='cancelled'){
   a=await transition(user,'cancel',a,{cancellationProof:{receipt:result.receipt,signedEnvelope:result.signedEnvelope}});return view(a);
  }
  if(result.status==='uncertain'){a=await transition(user,'uncertain',a);return view(a);}
  if(!['prepared','reviewed'].includes(a.state))return view(a);
  const p=result.projection;
  if(p.balanceVersion!==a.intent.expectedBalanceVersion||BigInt(p.countedQuantityMilli)-BigInt(p.onHandMilli)!==BigInt(p.deltaMilli))fail('La revisión de Core360 no coincide con el saldo esperado.',409);
  const review={previousPhysicalMilli:p.onHandMilli,reservedMilli:p.reservedMilli,countedQuantityMilli:p.countedQuantityMilli,deltaMilli:p.deltaMilli,expiresAt:new Date(Math.min(result.exp,a.intent.expiresAt)*1000).toISOString()};
  a=await transition(user,'review',a,{review,reviewToken:result.reviewEnvelope});
  return {status:'review',requestKey:a.request_key,review};
 }
 async function invoke(user,a,action){
  try{return await settle(user,a,await coreCall({config,attempt:a,action,fetchImpl,clock}));}
  catch(e){
   // An unsigned HTTP error or timeout cannot prove there was no effect.
   if(action==='confirm')try{await transition(user,'uncertain',a);}catch{/* The confirming record already blocks resubmission. */}
   throw e;
  }
 }
 return {async run({user,body}){
  if(!uuid(user?.id)||!uuid(body?.recipeId)||!uuid(body?.requestKey))before('Revisa el intento de stock.',400);
  if(!['prepare','confirm','inspect','cancel'].includes(body.action))before('Operación de stock inválida.',400);
  exact(body,body.action==='prepare'?['action','recipeId','requestKey','balanceId','countedQuantityMilli','reason','consumerId']:['action','recipeId','requestKey']);
  let a=await lookup(user,body.recipeId,body.requestKey);
  if(!config.enabled&&['prepare','confirm'].includes(body.action)){if(!a)before('El guardado está pausado.',503);fail('El guardado está pausado. Consulta o cancela el intento anterior.');}
  if(body.action==='prepare'){
   if(!uuid(body.balanceId)||! /^(0|[1-9]\d{0,9})$/.test(body.countedQuantityMilli||'')||BigInt(body.countedQuantityMilli)>1000000000n||BigInt(body.countedQuantityMilli)%1000n!==0n||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>240||!consumers.includes(body.consumerId))before('Revisa la cantidad, saldo y motivo del conteo.',400);
   const payload={balanceId:body.balanceId,countedQuantityMilli:body.countedQuantityMilli,reason:body.reason.trim(),consumerId:body.consumerId};
   if(a&&digest(a.request_payload)!==digest(payload))fail('La clave ya corresponde a otra selección.',409);
   if(!a){
    // No command has been persisted or sent to the count writer at this point.
    // A failed read must not strand the browser on a nonexistent pending attempt.
    let stock;try{stock=await read(user);}catch{before('No pudimos actualizar el saldo. No se inició el conteo; conserva el borrador e inténtalo otra vez.',503);}
    const row=stock.rows.find(r=>r.recipeId===body.recipeId),balance=row?.balances.find(b=>b.id===body.balanceId);
    if(row?.state!=='known'||!balance||!uuid(balance.locationId)||!Number.isSafeInteger(balance.version))before('No se pudo confirmar este saldo de inventario.');
    let product,link;
    if(row.directLinkId){product={id:null};link={uom_code:row.unit,updated_at:String(row.mappingVersion)};}
    else{
    const products=await supabase.from('menu_items').select('id').eq('library_meal_id',body.recipeId).eq('product_type','mealprep').eq('is_active',true);
    if(products.error||products.data?.length!==1)before('El mealprep debe tener un único producto vinculado.');
    product=products.data[0];const mapping=await supabase.from('core360_product_mappings').select('uom_code,updated_at').eq('source_menu_item_id',product.id).eq('core_item_id',row.coreItemId).eq('is_active',true);
    if(mapping.error||mapping.data?.length!==1)before('Revisa el vínculo de inventario de esta preparación.');
    link=mapping.data[0];}
    const now=clock(),id=randomUUID(),revision=row.directLinkId?link.updated_at:canonicalLinkRevision(link.updated_at);
    const intent={version:1,requestId:id,sourceOperator:{issuer:config.sourceIssuer,subject:user.id,role:'admin',verifiedAt:now},sourceMealprepId:body.recipeId,linkRef:row.directLinkId||product.id,linkRevision:revision,coreItemId:row.coreItemId,locationId:balance.locationId,balanceId:balance.id,unit:link.uom_code,expectedBalanceVersion:balance.version,countedQuantityMilli:body.countedQuantityMilli,issuedOn:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now*1000)),reason:payload.reason,createdAt:now,expiresAt:now+config.maxIntentAge};
    a=await transition(user,'prepare',null,{attemptId:id,requestKey:body.requestKey,recipeId:body.recipeId,productId:product.id,...(row.directLinkId?{directLinkId:row.directLinkId}:{}),integrationId:config.integrationId,tenantId:config.tenantId,companyId:config.companyId,coreItemId:row.coreItemId,sourceOrigin:config.sourceIssuer,linkRevision:revision,payload,intent});
   }
  }else if(!a)fail('No encontramos ese intento para tu cuenta.',404);
  if(a.source_user_id!==user.id||a.integration_id!==config.integrationId||a.core_tenant_id!==config.tenantId||a.core_company_id!==config.companyId||a.source_origin!==config.sourceIssuer||a.intent.sourceOperator?.subject!==user.id||a.intent.requestId!==a.id)fail('El intento no corresponde a esta integración.',403);
  if(['committed','cancelled'].includes(a.state))return view(a);
  if(a.core_receipt_id)return finalize(user,a);
  if(body.action==='cancel'){
   a=await transition(user,'cancel_request',a);return invoke(user,a,'cancel');
  }
  if(body.action==='confirm'){
   if(a.state!=='reviewed')return invoke(user,a,'inspect');
   if(a.intent.expiresAt<=clock())fail('La revisión venció. Cancela ese intento antes de preparar otro.',409);
   a=await transition(user,'confirm',a);return invoke(user,a,'confirm');
  }
  if(body.action==='inspect'||!['prepared','reviewed'].includes(a.state))return invoke(user,a,'inspect');
  return invoke(user,a,'preview');
 }};
}
