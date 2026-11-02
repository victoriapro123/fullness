import {denied,digest,exact,stockCrypto} from './stock-handoff-crypto.mjs';
import {linkTimestamp} from './stock-handoff-metadata.mjs';
import {readMealprepStock} from './mealprep-stock.mjs';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
function beforePreparation(message,statusCode=409){throw Object.assign(Error(message),{statusCode,preparationNotStarted:true});}
// Authenticated Source session must already have been resolved by getUser().
// Production remains disabled until the separate dual-session binding exists.
export async function prepareStockHandoff({supabase,user,config,body,crypto=stockCrypto(config),readStock=readMealprepStock,clock=()=>Math.floor(Date.now()/1000)}){
 exact(body,['requestKey','recipeId','consumerId','balanceId','countedQuantityMilli','reason']);
 if(!uuid(user?.id)||!uuid(body.requestKey)||!uuid(body.recipeId)||!uuid(body.balanceId)||!config.consumers.includes(body.consumerId)||typeof body.countedQuantityMilli!=='string'||!/^(0|[1-9]\d{0,9})$/.test(body.countedQuantityMilli)||BigInt(body.countedQuantityMilli)%1000n!==0n||BigInt(body.countedQuantityMilli)>1000000000n||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>240)denied('Revisa la cantidad, el saldo y el motivo.',400);
 const {data:prior,error:priorError}=await supabase.from('mealprep_stock_handoff_attempts').select('*').eq('source_user_id',user.id).eq('request_key',body.requestKey).maybeSingle();
 if(priorError)denied('No pudimos consultar el intento.',503);
 const immutable={balanceId:body.balanceId,countedQuantityMilli:body.countedQuantityMilli,reason:body.reason.trim()};
 if(prior){
  if(prior.source_recipe_id!==body.recipeId||prior.consumer_id!==body.consumerId||digest(prior.requested_payload)!==digest(immutable))denied('Consulta el intento anterior antes de cambiar el conteo.',409);
  if(prior.signed_intent)return {attemptId:prior.id,intent:prior.signed_intent,status:prior.state,corePage:config.corePage};
 }
 // Resolve item/link and canonical balance server-side, never take Core identity from UI.
 const observed=await readStock({supabase}),row=observed.rows.find(r=>r.recipeId===body.recipeId),balance=row?.balances.find(b=>b.id===body.balanceId);
 if(row?.state!=='known'||!balance||!uuid(balance.locationId)||!Number.isSafeInteger(balance.version))beforePreparation('No se pudo verificar este saldo de inventario.');
 const products=await supabase.from('menu_items').select('id').eq('library_meal_id',body.recipeId).eq('product_type','mealprep').eq('is_active',true);
 if(products.error||products.data?.length!==1)beforePreparation('El mealprep no tiene un único producto normal vinculado.');
 const mappings=await supabase.from('core360_product_mappings').select('uom_code').eq('source_menu_item_id',products.data[0].id).eq('core_item_id',row.coreItemId).eq('is_active',true);
 if(mappings.error||mappings.data?.length!==1)beforePreparation('Revisa el vínculo de inventario.');
 const binding=await supabase.from('mealprep_stock_bindings').select('*').eq('source_user_id',user.id).eq('core_tenant_id',config.tenantId).eq('core_company_id',config.companyId).eq('state','active').maybeSingle();
 if(binding.error||!binding.data)beforePreparation('Tu cuenta aún no está conectada y verificada con Core360.');
 async function transition(action,document){const r=await supabase.rpc('transition_mealprep_stock_handoff',{p_action:action,p_document:document,p_actor:user.id,p_expected_revision:null});if(r.error)denied('El vínculo o el intento cambió. Consulta su estado antes de repetir.',409);return r.data;}
 const a=await transition('prepare',{requestKey:body.requestKey,tenantId:config.tenantId,companyId:config.companyId,sourceOrigin:config.sourceIssuer,consumerId:body.consumerId,recipeId:body.recipeId,productId:products.data[0].id,coreItemId:row.coreItemId,linkRevision:linkTimestamp(row.mappingVersion),payload:immutable});
 const now=clock(),intent={version:1,iss:config.sourceIssuer,aud:config.coreIssuer,consumerId:a.consumer_id,purpose:'inventory.absolute_count',requestKey:a.id,nonce:a.nonce,iat:now,exp:now+config.maxIntentAge,tenantId:a.core_tenant_id,companyId:a.core_company_id,sourceSubjectRef:user.id,identityBindingRevision:String(a.binding_revision),expectedCoreActorId:a.core_actor_id,sourceMealprepId:a.source_recipe_id,linkRef:a.source_product_id,linkRevision:linkTimestamp(row.mappingVersion),coreItemId:a.core_item_id,locationId:balance.locationId,balanceId:balance.id,unit:mappings.data[0].uom_code,expectedBalanceVersion:balance.version,countedQuantityMilli:body.countedQuantityMilli,issuedOn:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now*1000)),reason:body.reason.trim()};
 const sealed=await transition('seal',{attemptId:a.id,signedIntent:crypto.sign('sourceIntent',intent),intentDigest:digest(intent)});
 return {attemptId:sealed.id,intent:sealed.signed_intent,status:sealed.state,corePage:config.corePage};
}
