import {denied,exact} from './stock-handoff-crypto.mjs';
import {prepareStockHandoff} from './stock-handoff-prepare.mjs';
export function operationState(attempt,config){
 const base={attemptId:attempt.id,requestKey:attempt.request_key,status:attempt.state,consumerId:attempt.consumer_id};
 if(attempt.state==='committed'&&attempt.core_receipt_id)return {...base,receiptId:attempt.core_receipt_id};
 if(attempt.state==='cancelled')return {...base,cancellationVerified:true};
 return {...base,needsCore:!!attempt.signed_intent,intent:attempt.signed_intent||null,corePage:config.corePage};
}
export async function stockHandoffOperation({supabase,user,config,body,prepare=prepareStockHandoff}){
 exact(body,['action','requestKey','recipeId','consumerId','balanceId','countedQuantityMilli','reason']);
 if(!['prepare','inspect','cancel'].includes(body.action))denied('Operación desconocida.',400);
 if(body.action==='prepare'){
  const {action,...input}=body;
  const prepared=await prepare({supabase,user,config,body:input});
  if(['committed','cancelled'].includes(prepared.status))return stockHandoffOperation({supabase,user,config,body:{action:'inspect',requestKey:body.requestKey,recipeId:body.recipeId},prepare});
  return {...prepared,consumerId:body.consumerId,needsCore:true};
 }
 exact(body,['action','requestKey','recipeId']);
 if(!/^[0-9a-f-]{36}$/.test(body.requestKey||'')||!/^[0-9a-f-]{36}$/.test(body.recipeId||''))denied('Intento inválido.',400);
 const lookup=await supabase.from('mealprep_stock_handoff_attempts').select('*').eq('source_user_id',user.id).eq('request_key',body.requestKey).eq('source_recipe_id',body.recipeId).eq('kind','count').maybeSingle();
 if(lookup.error)denied('No pudimos consultar el intento.',503);
 if(!lookup.data)denied('No se encontró este intento para tu usuario.',404);
 let attempt=lookup.data;
 if(body.action==='cancel'&&['prepared','claimed','cancel_requested'].includes(attempt.state)){
  const result=await supabase.rpc('transition_mealprep_stock_handoff',{p_action:'cancel',p_document:{attemptId:attempt.id},p_actor:user.id,p_expected_revision:null});
  if(result.error)denied('No se pudo comprobar la cancelación. Conserva el mismo intento.',409);
  attempt=result.data;
 }
 return operationState(attempt,config);
}
