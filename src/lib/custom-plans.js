export const CUSTOM_PLAN_STRUCTURE = 'custom_stock_plan_v1';
export const CUSTOM_PLAN_SIZES = Object.freeze([6,24]);
export const MAX_MEAL_UNITS_PER_PLAN = 2;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function planError(message, statusCode=422) {return Object.assign(new Error(message), {statusCode});}
export function normalizePlanSelection(value,{size=6}={}) {
 if(!Array.isArray(value)||!value.length||value.length>100)throw planError('Selecciona los mealpreps de tu plan.');
 const byId=new Map();
 for(const row of value){
  const id=String(row?.itemId||''); const quantity=row?.quantity;const week=row.week??1;
  if(!UUID_PATTERN.test(id)||!Number.isSafeInteger(quantity)||quantity<1||quantity>2||!Number.isInteger(week)||week<1||week>(size===24?4:1))throw planError('Revisa los platos, sus semanas y sus cantidades.');
  const key=`${week}:${id}`;const previous=byId.get(key);byId.set(key,{itemId:id,week,quantity:(previous?.quantity||0)+quantity});
 }
 const result=[...byId.values()].sort((a,b)=>a.week-b.week||a.itemId.localeCompare(b.itemId));
 if(result.some(row=>row.quantity>MAX_MEAL_UNITS_PER_PLAN))throw planError('Máximo 2 unidades del mismo mealprep en una semana.');
 for(let week=1;week<=(size===24?4:1);week++)if(result.filter(row=>row.week===week&&row.quantity===2).length>1)throw planError('Sólo un plato puede estar duplicado en cada semana.');
 if(result.reduce((n,row)=>n+row.quantity,0)>60)throw planError('El plan supera el máximo de 60 mealpreps.');
 return result;
}
export function customPlanRequest(item) {
 return {kind:'custom_plan',letterId:item.letterId,revision:item.revision,size:item.size,quantity:item.qty,selection:normalizePlanSelection(item.selection,{size:item.size})};
}
export function selectedPlanTotal(items,selection) {
 return selection.reduce((sum,row)=>sum+(items.find(i=>i.id===row.itemId)?.priceClp||0)*row.quantity,0);
}
