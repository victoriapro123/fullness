export function createStockIntegrationAdapter({request}){
 const endpoint='/api/backoffice/mealprep-stock-integration';
 const send=(action,input)=>request(endpoint,'POST',{action,...input});
 return {prepareReview:input=>send('prepare',input),confirmSameAttempt:input=>send('confirm',input),inspect:input=>send('inspect',input),cancel:input=>send('cancel',input)};
}
// Source-owned UI controller. The injected backend adapter owns all wire DTOs,
// canonical receipts and permissions; no Core cookie/popup/actor enters the UI.
export function createIntegratedStockCountClient({adapter,review}){
 if(!adapter||!['prepareReview','confirmSameAttempt','inspect','cancel'].every(k=>typeof adapter[k]==='function')||typeof review!=='function')throw Error('La integración de inventario no está configurada.');
 const scope=input=>({recipeId:input.recipeId,requestKey:input.requestKey});
 const pending=new Map();
 function terminal(result){
  if(result?.status==='committed'&&result.receiptId)return result;
  if(result?.status==='registered'&&result.receiptId&&result.refreshPending===true)return result;
  if(result?.status==='cancelled'&&result.cancellationVerified===true)return result;
  return null;
 }
 async function execute(input,body){
   const prepared=await adapter.prepareReview(body);
   const done=terminal(prepared);if(done)return done;
   if(!prepared?.review||prepared.requestKey!==input.requestKey)return {status:'pending',...scope(input)};
   const r=prepared.review;
   if(!['previousPhysicalMilli','reservedMilli','countedQuantityMilli'].every(k=>/^(0|[1-9]\d*)$/.test(r[k]||''))||! /^-?\d+$/.test(r.deltaMilli||'')||r.countedQuantityMilli!==input.physicalMilli||BigInt(r.countedQuantityMilli)-BigInt(r.previousPhysicalMilli)!==BigInt(r.deltaMilli))throw Error('La revisión no coincide con tu conteo. Conserva el intento y consulta su estado.');
   const accepted=await review(prepared.review);
   if(accepted!==true)return adapter.cancel(scope(input));
   // Confirmation is always of the exact reviewed attempt, never a new count.
   return adapter.confirmSameAttempt(scope(input));
 }
 return {
  count(input){
   const body={...scope(input),balanceId:input.balance.id,countedQuantityMilli:input.physicalMilli,reason:input.reason,consumerId:input.consumerId},hash=JSON.stringify(body),existing=pending.get(input.requestKey);
   if(existing){if(existing.hash!==hash)return Promise.reject(Error('El intento ya está en curso con otra selección.'));return existing.task;}
   const task=execute(input,body).finally(()=>pending.delete(input.requestKey));pending.set(input.requestKey,{hash,task});return task;
  },
  recover:input=>input.action==='cancel'?adapter.cancel(scope(input)):adapter.inspect(scope(input))
 };
}
