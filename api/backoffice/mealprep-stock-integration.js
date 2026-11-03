import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readJsonBody} from '../../server/mercadopago-checkout.mjs';
import {loadIntegrationConfig} from '../../server/integrated-stock-crypto.mjs';
import {createIntegratedStockService} from '../../server/integrated-stock.mjs';
export function createIntegratedStockHandler({authenticate=assertOwnerBackofficeRequest,configLoader=loadIntegrationConfig,serviceFactory=createIntegratedStockService}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
  const {supabase,user}=await authenticate(req);
  if(req.method!=='POST'){res.setHeader('Allow','POST');throw Object.assign(Error('Método no permitido.'),{statusCode:405});}
  const body=await readJsonBody(req),config=await configLoader();
  const data=await serviceFactory({supabase,config}).run({user,body});res.statusCode=200;res.end(JSON.stringify({data}));
 }catch(error){res.statusCode=error.statusCode||503;res.end(JSON.stringify({error:error.statusCode?error.message:'No pudimos comprobar el resultado. Conserva el intento y consulta su estado.',...(error.preparationNotStarted===true?{preparationNotStarted:true}:{})}));}
};}
export default createIntegratedStockHandler();
