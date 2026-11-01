import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readJsonBody} from '../../server/mercadopago-checkout.mjs';
import {readCore360Catalog,projectCore360CommerceRead} from '../../server/core360-commerce-adapter.mjs';
import {UUID_PATTERN,planError} from '../../src/lib/custom-plans.js';

export function planProductFacts(row){
 const price=Number(row?.lineGrossMinor),tax=row?.taxBps??row?.tax_bps;
 if(!row||!UUID_PATTERN.test(row.id||'')||row.canUseInPlan!==true||row.webSaleMode!=='plan_only'||row.active!==true||row.sale_enabled!==true||row.inventory_enabled!==true
  ||row.currency!=='CLP'||row.priceAvailable===false||!Number.isSafeInteger(price)||price<1||price>1000000||!Number.isSafeInteger(tax)||tax<0||tax>10000
  ||String(row.quantityMilli??row.quantity_milli)!=='1000'||!row.unit||!row.commercialVersion||!row.sku)throw planError('Selecciona una porción terminada, sólo para planes, con precio e impuesto válidos en Core360.',409);
 return {coreItemId:row.id,sku:row.sku,unit:row.unit,grossMinor:price,taxBps:tax,commercialVersion:row.commercialVersion};
}
async function catalog(){
 const rows=[];let cursor;
 for(let page=0;page<20;page++){
  const response=await readCore360Catalog({query:{limit:100,quantityMilli:'1000',...(cursor?{cursor}:{})}});
  if(!response.enabled)throw planError('Habilita la lectura canónica de Core360.',503);
  rows.push(...response.rows||[]);if(!response.page?.nextCursor)return rows;cursor=response.page.nextCursor;
 }
 throw planError('El catálogo necesita una consulta más acotada.',503);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
  const {supabase,user}=await assertOwnerBackofficeRequest(req);
  if(req.method==='GET'){
   const [library,products,mappings,core]=await Promise.all([
    supabase.from('meal_library_items').select('id,name').eq('is_active',true).order('name'),
    supabase.from('menu_items').select('id,name,library_meal_id').eq('product_type','mealprep'),
    supabase.from('core360_product_mappings').select('source_menu_item_id,core_item_id,updated_at').eq('is_active',true),catalog()
   ]);
   if([library,products,mappings].some(r=>r.error))throw planError('No pudimos consultar los vínculos.',503);
   const choices=core.flatMap(row=>{try{return [{...planProductFacts(row),name:row.name||row.title||row.sku}];}catch{return [];}});
   res.statusCode=200;res.end(JSON.stringify({data:{library:library.data,products:products.data,mappings:mappings.data,choices}}));return;
  }
  if(req.method!=='PUT')throw planError('Método no permitido.',405);
  const body=await readJsonBody(req);
  if(!UUID_PATTERN.test(body.libraryMealId||'')||!UUID_PATTERN.test(body.coreItemId||'')||typeof body.expectedVersion!=='string')throw planError('Revisa la receta y el producto vinculado.');
  const core=(await catalog()).find(r=>r.id===body.coreItemId),facts=planProductFacts(core);
  const saved=await supabase.rpc('link_plan_mealprep',{p_document:{...facts,libraryMealId:body.libraryMealId},p_expected_version:body.expectedVersion,p_actor:user.id});
  if(saved.error)throw planError(saved.error.message,saved.error.code==='40001'?409:422);
  let synchronized=false;try{const projection=await projectCore360CommerceRead({supabase});synchronized=projection.enabled===true;}catch{}
  res.statusCode=200;res.end(JSON.stringify({data:{menuItemId:saved.data.product.id,message:`Producto vinculado. ${synchronized?'Precio canónico actualizado.':'Sincronización de precio pendiente en Core360.'} Confirma disponibilidad y añádelo a una carta; no se crearon existencias.`}}));
 }catch(e){res.statusCode=e.statusCode||503;res.end(JSON.stringify({error:e.message}));}
}
