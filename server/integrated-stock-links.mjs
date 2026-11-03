import {randomUUID} from 'node:crypto';
import {callLinks} from './integrated-stock-links-crypto.mjs';
import {digest,exact,uuid,fail} from './integrated-stock-crypto.mjs';
export async function readDirectMealprepStock({supabase,user,config,coreCall=callLinks}){
 const [recipes,links,result]=await Promise.all([supabase.from('meal_library_items').select('id,name'),supabase.from('mealprep_stock_links').select('*').eq('integration_id',config.integrationId).eq('core_tenant_id',config.tenantId).eq('core_company_id',config.companyId).eq('active',true),coreCall({config,user,action:'catalog'})]);
 if(recipes.error||links.error)fail('No pudimos leer los vínculos de inventario.');
 return {observedAt:new Date().toISOString(),writeAvailable:false,rows:recipes.data.map(recipe=>{
  const l=links.data.find(x=>x.recipe_id===recipe.id),t=l&&result.targets.find(t=>t.coreItemId===l.core_item_id&&t.locationId===l.location_id&&t.unit===l.unit&&t.selectable);
  if(!l)return {recipeId:recipe.id,recipeName:recipe.name,state:'unlinked',balances:[],editable:false,message:'Configura el artículo y la ubicación de esta porción individual.'};
  if(!t)return {recipeId:recipe.id,state:'unknown',balances:[],editable:false,message:'No pudimos verificar un saldo contable elegible. No se asume cero.'};
  return {recipeId:recipe.id,state:'known',coreItemId:l.core_item_id,directLinkId:l.id,mappingVersion:String(l.revision),unit:l.unit,physicalMilli:t.onHandMilli,reservedMilli:t.reservedMilli,availableMilli:null,editable:false,balances:[{id:t.balanceId,locationId:t.locationId,version:t.balanceVersion,warehouseCode:t.warehouseCode,physicalMilli:t.onHandMilli,reservedMilli:t.reservedMilli}],message:'Saldo físico consultado en Core360. La receta y su venta se gestionan por separado.'};
 })};
}
export function createStockLinksService({supabase,config,coreCall=callLinks,clock=()=>Math.floor(Date.now()/1000)}){
 async function transition(user,action,a,extra={}){const r=await supabase.rpc('transition_stock_link',{p_action:action,p_document:{...(a?{attemptId:a.id}:{}),...extra},p_actor:user.id,p_expected_revision:a?.revision??null});if(r.error)fail('La configuración cambió. Consulta el resultado antes de repetir.',409);return r.data;}
 const view=a=>({status:a.state==='linked'?'linked':a.state==='cancelled'?'cancelled':'pending',requestKey:a.request_key,...(a.core_receipt?{receiptId:a.core_receipt.receiptRef}:{})});
 async function invoke(user,a,action){
  let r;try{r=await coreCall({config,user,attempt:a,action,clock});}catch(e){if(action==='confirm')try{await transition(user,'uncertain',a);}catch{}throw e;}
  if(r.status==='linked'||r.status==='cancelled'){a=await transition(user,r.status,a,{receipt:r.receipt,signedEnvelope:r.signedEnvelope});return view(a);}
  if(r.status==='review'&&['prepared','reviewed'].includes(a.state)){a=await transition(user,'review',a,{reviewToken:r.reviewEnvelope});return {status:'review',requestKey:a.request_key,selection:r.selection,expiresAt:new Date(Math.min(r.exp,a.intent.expiresAt)*1000).toISOString()};}
  return view(a);
 }
 return {async run({user,body}){
  if(!uuid(user?.id))fail('Administración requerida.',403);
  if(body.action==='catalog'){exact(body,['action']);return {status:'catalog',targets:(await coreCall({config,user,action:'catalog',clock})).targets};}
  if(body.action==='pending'){exact(body,['action','recipeId']);if(!uuid(body.recipeId))fail();const r=await supabase.from('mealprep_stock_link_attempts').select('request_key,request_payload,state').eq('source_user_id',user.id).eq('recipe_id',body.recipeId).not('state','in','(linked,cancelled)').maybeSingle();if(r.error)fail();return {pending:r.data};}
  if(!['prepare','confirm','inspect','cancel'].includes(body.action)||!uuid(body.recipeId)||!uuid(body.requestKey))fail('Operación inválida.',400);
  exact(body,body.action==='prepare'?['action','recipeId','requestKey','coreItemId','locationId','unit','equivalenceConfirmed']:['action','recipeId','requestKey']);
  const found=await supabase.from('mealprep_stock_link_attempts').select('*').eq('source_user_id',user.id).eq('recipe_id',body.recipeId).eq('request_key',body.requestKey).maybeSingle();if(found.error)fail();let a=found.data;
  if(!config.enabled&&['prepare','confirm'].includes(body.action))fail('La configuración está pausada.');
  if(body.action==='prepare'){
   if(!uuid(body.coreItemId)||!uuid(body.locationId)||!['un','UN'].includes(body.unit)||body.equivalenceConfirmed!==true)fail('Selecciona una porción individual y confirma su equivalencia.',400);
   const payload={coreItemId:body.coreItemId,locationId:body.locationId,unit:body.unit,equivalenceConfirmed:true};
   if(a&&digest(a.request_payload)!==digest(payload))fail('La clave pertenece a otra selección.',409);
   if(!a){
    const catalog=await coreCall({config,user,action:'catalog',clock});if(catalog.targets.filter(t=>t.selectable&&t.coreItemId===body.coreItemId&&t.locationId===body.locationId&&t.unit===body.unit).length!==1)fail('Elige un saldo existente elegible.',409);
    const q=await supabase.from('mealprep_stock_links').select('*').eq('recipe_id',body.recipeId).maybeSingle();if(q.error)fail();const l=q.data,now=clock(),id=randomUUID(),linkId=l?.id||randomUUID();
    const intent={version:1,requestId:id,sourceMealprepId:body.recipeId,linkRef:linkId,linkRevision:(BigInt(l?.revision||0)+1n).toString(),coreItemId:body.coreItemId,locationId:body.locationId,unit:body.unit,equivalenceMilli:'1000',expectedLinkRevision:l?.active?String(l.revision):null,createdAt:now,expiresAt:now+config.maxIntentAge};
    a=await transition(user,'prepare',null,{attemptId:id,requestKey:body.requestKey,recipeId:body.recipeId,linkId,integrationId:config.integrationId,tenantId:config.tenantId,companyId:config.companyId,payload,intent});
   }
  }else if(!a)fail('Intento no encontrado.',404);
  if(a.source_user_id!==user.id||a.intent.sourceMealprepId!==body.recipeId||a.intent.requestId!==a.id)fail('Ámbito incorrecto.',403);
  const scoped=await supabase.from('mealprep_stock_links').select('integration_id,core_tenant_id,core_company_id').eq('id',a.link_id).maybeSingle();if(scoped.error||scoped.data?.integration_id!==config.integrationId||scoped.data?.core_tenant_id!==config.tenantId||scoped.data?.core_company_id!==config.companyId)fail('Ámbito incorrecto.',403);
  if(['linked','cancelled'].includes(a.state))return view(a);
  if(body.action==='cancel'){a=await transition(user,'cancel_request',a);return invoke(user,a,'cancel');}
  if(body.action==='confirm'&&a.state==='reviewed'){if(a.intent.expiresAt<=clock())fail('Revisión vencida; cancela este intento.',409);a=await transition(user,'confirm',a);return invoke(user,a,'confirm');}
  return invoke(user,a,body.action==='prepare'&&['prepared','reviewed'].includes(a.state)?'preview':'inspect');
 }};
}
