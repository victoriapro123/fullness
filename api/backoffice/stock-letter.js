import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readJsonBody} from '../../server/mercadopago-checkout.mjs';
import {readStockLetter} from '../../server/custom-plans.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
  const {supabase,user}=await assertOwnerBackofficeRequest(req);
  if(req.method==='GET'){res.statusCode=200;res.end(JSON.stringify({data:await readStockLetter({supabase,admin:true})}));return;}
  if(await import('../../server/mealprep-sale-capacity.mjs').then(m=>m.saleAuthorityEnabled(supabase)))throw Object.assign(Error('Edita los platos y su disponibilidad desde la biblioteca de mealpreps.'),{statusCode:409});
  if(req.method!=='PUT'){res.setHeader('Allow','GET, PUT');throw Object.assign(Error('Método no permitido.'),{statusCode:405});}
  const body=await readJsonBody(req);
  if(!Number.isSafeInteger(body.revision)||body.revision<0||!Array.isArray(body.document?.items)||body.document.items.length>100)throw Object.assign(Error('Revisa la carta y su revisión.'),{statusCode:422});
  const {data,error}=await supabase.rpc('save_stock_letter',{p_document:body.document,p_revision:body.revision,p_actor:user.id});
  if(error)throw Object.assign(Error(error.message),{statusCode:error.code==='40001'?409:422});
  res.statusCode=200;res.end(JSON.stringify({data}));
 }catch(error){res.statusCode=error.statusCode||503;res.end(JSON.stringify({error:error.message}));}
}
