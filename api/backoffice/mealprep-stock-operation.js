import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {loadStockHandoffConfig} from '../../server/stock-handoff-metadata.mjs';
import {stockHandoffOperation} from '../../server/stock-handoff-operation.mjs';
import {denied} from '../../server/stock-handoff-crypto.mjs';
export function stockOperationHandler({authenticate=assertOwnerBackofficeRequest,loadConfig=loadStockHandoffConfig,operate=stockHandoffOperation}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
   const {supabase,user}=await authenticate(req);
   if(req.method!=='POST'){res.setHeader('Allow','POST');denied('Método no permitido.',405);}
   const config=await loadConfig();if(req.headers?.origin&&req.headers.origin!==config.sourceIssuer)denied();
   let body=req.body;if(body===undefined){const chunks=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>8000)denied('Solicitud demasiado grande.',413);chunks.push(bytes);}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{denied('Solicitud inválida.',400);}}
   if(typeof body==='string'){try{body=JSON.parse(body);}catch{denied('Solicitud inválida.',400);}}
   if(Buffer.byteLength(JSON.stringify(body)||'')>8000)denied('Solicitud demasiado grande.',413);
   res.statusCode=200;res.end(JSON.stringify({data:await operate({supabase,user,config,body})}));
  }catch(error){res.statusCode=error.statusCode||503;res.end(JSON.stringify({error:error.statusCode?error.message:'No pudimos verificar el conteo. Conserva el mismo intento.',...(error.preparationNotStarted===true?{preparationNotStarted:true}:{})}));}
 };
}
export default stockOperationHandler();
