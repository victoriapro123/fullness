import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readJsonBody} from '../../server/mercadopago-checkout.mjs';
import {readSaleOffers,uuid,saleError} from '../../server/mealprep-sale-capacity.mjs';
import {validMealprepPhotoUrl} from '../../server/mealprep-photo-url.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{const {supabase,user}=await assertOwnerBackofficeRequest(req);
  if(req.method==='GET'){res.statusCode=200;res.end(JSON.stringify({data:{offers:await readSaleOffers({supabase,admin:true})}}));return;}
  const b=await readJsonBody(req);if(!uuid(b.menuItemId)||!uuid(b.requestKey))throw saleError('Actualiza la lista y vuelve a guardar.',422);
  if(req.method==='POST'&&b.action==='inspect'){
   const r=await supabase.from('mealprep_sale_capacity_updates').select('menu_item_id,after_value').eq('actor_id',user.id).eq('request_key',b.requestKey).maybeSingle();if(r.error)throw saleError('No pudimos consultar el guardado. Inténtalo nuevamente.',503);
   if(r.data&&r.data.menu_item_id!==b.menuItemId)throw saleError('Ese guardado corresponde a otro plato. Actualiza la lista.',409);
   res.statusCode=200;res.end(JSON.stringify({data:r.data?.after_value||{status:'not_started'}}));return;
  }
  if(req.method!=='PUT')throw saleError('Método no permitido.',405);
  if(b.action==='details'){
   const d=b.document;if(!d||typeof d.name!=='string'||d.name.trim().length<3||!Number.isSafeInteger(d.priceClp)||d.priceClp<0||d.priceClp>1000000||typeof d.ingredientsText!=='string'||d.ingredientsText.length>6000||!Number.isSafeInteger(b.revision)||b.revision<0)throw saleError('Revisa el nombre, el precio y los ingredientes.',422);
   if(!validMealprepPhotoUrl(d.photoUrl))throw saleError('Usa una foto cargada o un enlace seguro.',422);
   const r=await supabase.rpc('save_mealprep_sale_details',{p_menu_id:b.menuItemId,p_document:{name:d.name.trim(),priceClp:d.priceClp,description:String(d.description||''),ingredientsText:d.ingredientsText,photoUrl:d.photoUrl||''},p_revision:b.revision,p_request_key:b.requestKey,p_actor:user.id});
   if(r.error)throw saleError('El plato cambió o falta algún dato. Actualiza la lista y revisa la información.',409);
   res.statusCode=200;res.end(JSON.stringify({data:r.data}));return;
  }
  if(!Number.isSafeInteger(b.quantity)||b.quantity<0||b.quantity>1000000||typeof b.published!=='boolean'||!Number.isSafeInteger(b.revision)||b.revision<0)throw saleError('Revisa las unidades y la publicación.',422);
  const r=await supabase.rpc('save_mealprep_sale_capacity',{p_menu_id:b.menuItemId,p_quantity:b.quantity,p_published:b.published,p_revision:b.revision,p_request_key:b.requestKey,p_actor:user.id});
  if(r.error)throw saleError(r.error.code==='40001'?'Las unidades cambiaron. Actualiza la lista y revisa tu cantidad.':'No pudimos guardar. Revisa la cantidad y el precio del plato.',r.error.code==='40001'?409:422);
  res.statusCode=200;res.end(JSON.stringify({data:r.data}));
 }catch(e){res.statusCode=e.statusCode||503;res.end(JSON.stringify({error:e.statusCode?e.message:'No pudimos guardar. Conservamos tus cambios; vuelve a intentarlo.'}));}
}
