import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {loadLinksConfig} from '../../server/integrated-stock-links-crypto.mjs';
import {createStockLinksService} from '../../server/integrated-stock-links.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{const {supabase,user}=await assertOwnerBackofficeRequest(req);if(req.method!=='POST'){res.setHeader('Allow','POST');throw Object.assign(Error('Método no permitido.'),{statusCode:405});}const body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!body||JSON.stringify(body).length>8000)throw Object.assign(Error('Solicitud inválida.'),{statusCode:400});const config=await loadLinksConfig();const data=await createStockLinksService({supabase,config}).run({user,body});res.statusCode=200;res.end(JSON.stringify({data}));}
 catch(e){res.statusCode=e.statusCode||503;res.end(JSON.stringify({error:e.statusCode?e.message:'No pudimos verificar el vínculo. Conserva el intento.'}));}
}
