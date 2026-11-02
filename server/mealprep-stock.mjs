import {readCore360Catalog,readCore360Stock} from './core360-commerce-adapter.mjs';

const fail=message=>Object.assign(Error(message),{statusCode:503});
async function pages(read,options){
 const rows=[];let cursor;
 for(let page=0;page<20;page++){
  const response=await read({...options,query:{limit:100,quantityMilli:'1000',...(cursor?{cursor}:{})}});
  if(!response.enabled)throw fail('La lectura de inventario Core360 no está habilitada.');
  rows.push(...response.rows||[]);if(!response.page?.nextCursor)return rows;cursor=response.page.nextCursor;
 }
 throw fail('El inventario supera el límite de esta consulta.');
}
export function stockBalance(row){
 if(row?.stockKnown===false||row?.stock_known===false||row?.inventoryManaged===false||row?.inventory_enabled===false)return null;
 const physical=row?.on_hand_milli??row?.onHandMilli,reserved=row?.reserved_milli??row?.reservedMilli,available=row?.available_milli??row?.availableMilli;
 if(!/^\d+$/.test(String(physical??''))||!/^\d+$/.test(String(reserved??''))||! /^-?\d+$/.test(String(available??'')))return null;
 return {id:row.id,physicalMilli:String(physical),reservedMilli:String(reserved),availableMilli:String(available),version:row.version??null,locationId:row.location_id||row.locationId||null,warehouseCode:row.warehouse_code||row.warehouseCode||'',batchCode:row.batch_code||'',serialNumber:row.serial_number||'',expiresOn:row.expires_on||null};
}
// This is a live read model, not another stock balance or an editing authority.
export async function readMealprepStock({supabase,env=process.env,fetchImpl=fetch,readCatalog=readCore360Catalog,readStock=readCore360Stock}={}){
 const [recipes,products]=await Promise.all([
  supabase.from('meal_library_items').select('id,name').order('name').limit(501),
  supabase.from('menu_items').select('id,library_meal_id').eq('product_type','mealprep').eq('is_active',true).limit(501)
 ]);
 if(recipes.error||products.error)throw fail('No pudimos consultar los mealpreps y sus vínculos de inventario.');
 if(recipes.data.length>500||products.data.length>500)throw fail('Acota el catálogo antes de consultar todo su stock.');
 const mappings=products.data.length?await supabase.from('core360_product_mappings').select('source_menu_item_id,core_item_id,uom_code,quantity_milli_per_unit,updated_at').in('source_menu_item_id',products.data.map(p=>p.id)).eq('is_active',true):{data:[]};
 if(mappings.error)throw fail('No pudimos consultar los vínculos Core360.');
 let catalog=[],balances=[];
 if(mappings.data.length)[catalog,balances]=await Promise.all([pages(readCatalog,{env,fetchImpl}),pages(readStock,{env,fetchImpl})]);
 const rows=recipes.data.map(recipe=>{
  const product=products.data.find(p=>p.library_meal_id===recipe.id),mapping=mappings.data.find(m=>m.source_menu_item_id===product?.id);
  const base={recipeId:recipe.id,name:recipe.name,coreItemId:mapping?.core_item_id||null,mappingVersion:mapping?.updated_at||null,editable:false,physicalMilli:null,reservedMilli:null,availableMilli:null,balances:[]};
  if(!mapping)return {...base,state:'unlinked',message:'Falta vincular esta preparación a su porción de inventario.'};
  const item=catalog.find(c=>c.id===mapping.core_item_id);
  if(!item||item.canUseInPlan!==true||item.inventory_enabled!==true||Number(mapping.quantity_milli_per_unit)!==1000||mapping.uom_code!==item.unit)return {...base,state:'incompatible',message:'El vínculo no corresponde a una porción habilitada para planes.'};
  const observed=balances.filter(b=>(b.item_id||b.itemId)===item.id),normalized=observed.map(stockBalance);
  if(!observed.length||normalized.some(b=>!b))return {...base,state:'unknown',message:'Core360 no confirmó un saldo físico completo. No se asume cero.'};
  const sum=key=>normalized.reduce((n,b)=>n+BigInt(b[key]),0n).toString();
  const canonicalAvailable=item.available_milli??item.availableMilli;
  return {...base,state:'known',physicalMilli:sum('physicalMilli'),reservedMilli:sum('reservedMilli'),availableMilli:/^-?\d+$/.test(String(canonicalAvailable??''))?String(canonicalAvailable):null,balances:normalized,message:'Existencias observadas en Core360; el disponible comercial no se deduce del conteo físico.'};
 });
 return {observedAt:new Date().toISOString(),authority:'core360',writeAvailable:false,writeMessage:'La edición requiere una operación de inventario Core360 autorizada con tu propia identidad.',rows};
}
