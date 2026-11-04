import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readSaleOffers,saleError} from '../../server/mealprep-sale-capacity.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{const {supabase}=await assertOwnerBackofficeRequest(req);
  if(req.method==='GET'){res.statusCode=200;res.end(JSON.stringify({data:{offers:await readSaleOffers({supabase,admin:true})}}));return;}
  throw saleError('Actualiza la página para editar el plato desde la biblioteca de mealpreps.',409);
 }catch(e){res.statusCode=e.statusCode||503;res.end(JSON.stringify({error:e.statusCode?e.message:'No pudimos guardar. Conservamos tus cambios; vuelve a intentarlo.'}));}
}
