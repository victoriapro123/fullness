import {UUID_PATTERN,planError} from '../src/lib/custom-plans.js';

export const CORE_PLAN_CONTRACT='commerce-plans/1';
export function selectCorePlanProfile(rows,size) {
 const matches=(rows||[]).filter(p=>p.active===true&&p.week_count===(size===24?4:1)&&p.units_per_week===6&&p.max_per_item===2&&p.max_repeated_items===1);
 if(matches.length!==1||!UUID_PATTERN.test(matches[0].id)||!Number.isSafeInteger(matches[0].version)||matches[0].version<1)throw planError('Core360 debe configurar un único perfil vigente para este formato de plan.',409);
 return matches[0];
}

// Server facts only. A profile is configuration, never a fictitious parent SKU.
export function createCorePlanRequest({groups,items,profiles,externalOrderId,issuedOn,priceListId,deliveryService}) {
 if(!UUID_PATTERN.test(externalOrderId||''))throw planError('La revisión del plan necesita una identidad estable.');
 const plans=[];
 for(const group of groups||[]){
  const profile=selectCorePlanProfile(profiles,group.size);
  for(let copy=0;copy<group.quantity;copy++){
   const weeks=Array.from({length:group.size===24?4:1},(_,i)=>{
    const counts=new Map();for(const r of group.items.filter(r=>r.week===i+1))counts.set(r.coreItemId,(counts.get(r.coreItemId)||0)+r.quantity);
    const quantities=[...counts.values()];
    if(quantities.reduce((n,q)=>n+q,0)!==6||quantities.some(q=>!Number.isSafeInteger(q)||q<1||q>2)||quantities.filter(q=>q===2).length>1)throw planError('Completa cada semana con seis platos y una sola duplicación.');
    return {weekId:`week-${i+1}`,components:[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([itemId,q])=>({itemId,quantityMilli:String(q*1000)}))};
   });
   plans.push({groupId:`${group.id}-${copy+1}`,profileId:profile.id,profileVersion:profile.version,weeks});
  }
 }
 if(!plans.length||plans.length>20)throw planError('El pedido admite hasta 20 planes.');
 const standalone=(items||[]).filter(r=>!r.product.custom_plan).map(({product,quantity})=>{
  const factor=product.core360_quantity_milli_per_unit;
  if(!UUID_PATTERN.test(product.core360_item_id||'')||!Number.isSafeInteger(factor)||factor<1||!Number.isSafeInteger(quantity*factor))throw planError('Revisa la identidad comercial del familiar.',409);
  return {itemId:product.core360_item_id,quantityMilli:String(quantity*factor)};
 });
 if(deliveryService)standalone.push({itemId:deliveryService.coreItemId,quantityMilli:'1000'});
 return {contractVersion:CORE_PLAN_CONTRACT,externalOrderId,issuedOn,...(priceListId?{priceListId}:{}),plans,standalone};
}

function demand(request){
 const counts=new Map();
 for(const r of [...request.plans.flatMap(p=>p.weeks.flatMap(w=>w.components)),...request.standalone]){
  if(!UUID_PATTERN.test(r.itemId||'')||!/^\d+$/.test(r.quantityMilli||'')||BigInt(r.quantityMilli)<=0n)throw planError('Componente canónico inválido.',409);
  counts.set(r.itemId,(counts.get(r.itemId)||0n)+BigInt(r.quantityMilli));
 }
 return counts;
}
export function assertCorePlanPreview({request,result,total}) {
 if(result?.contractVersion!==CORE_PLAN_CONTRACT||result.externalOrderId!==request.externalOrderId||!(/^[a-f0-9]{64}$/).test(result.previewHash||'')
  ||result.quote?.currency!=='CLP'||String(result.quote.totalMinor)!==String(total)||result.snapshot?.currency!=='CLP'||String(result.snapshot.totalMinor)!==String(total)
  ||!Number.isSafeInteger(result.ttlSeconds)||result.ttlSeconds<1)throw planError('Core360 no confirmó la cotización completa del plan. No se creó un cobro.',409);
 const expected=demand(request),actual=new Map();
 for(const line of result.quote.lines||[]){if(actual.has(line.itemId))throw planError('Cotización canónica duplicada.',409);actual.set(line.itemId,String(line.quantityMilli));}
 if(actual.size!==expected.size||[...expected].some(([id,q])=>actual.get(id)!==String(q)))throw planError('La cotización no coincide con todos los platos elegidos.',409);
 // Composition is as important as the aggregated amounts: don't lose weeks.
 const signature=p=>JSON.stringify(p.map(g=>({groupId:g.groupId,profileId:g.profileId,profileVersion:g.profileVersion,weeks:g.weeks.map(w=>({weekId:w.weekId,components:w.components.map(c=>({itemId:c.itemId,quantityMilli:c.quantityMilli})).sort((a,b)=>a.itemId.localeCompare(b.itemId))}))})));
 if(signature(request.plans)!==signature(result.snapshot.plans||[]))throw planError('Core360 no conservó las semanas del plan.',409);
 return {...request,previewHash:result.previewHash,expectedTotalMinor:String(total),currency:'CLP'};
}

export function assertCorePlanReservation(result,externalOrderId,now=new Date(),checkout){
 if(!UUID_PATTERN.test(externalOrderId||'')||result?.externalOrderId!==externalOrderId||!result?.coreOrderId||result.plan?.contractVersion!==CORE_PLAN_CONTRACT||result.plan.status!=='held'
  ||!result.plan.expiresAt||!Number.isFinite(Date.parse(result.plan.expiresAt))||Date.parse(result.plan.expiresAt)<=now.getTime())throw planError('Core360 no confirmó una reserva vigente. No se creó un cobro.',503);
 if(checkout&&(result.plan.snapshot?.currency!=='CLP'||String(result.plan.snapshot?.totalMinor)!==checkout.expectedTotalMinor))throw planError('La reserva no coincide con el total cotizado. No se creó un cobro.',409);
 return result;
}
