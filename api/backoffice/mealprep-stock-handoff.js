import {getSupabaseAdmin} from '../../server/backoffice-access.mjs';
import {loadStockHandoffConfig,createStockMetadata} from '../../server/stock-handoff-metadata.mjs';
import {denied} from '../../server/stock-handoff-crypto.mjs';
import {stockCrypto} from '../../server/stock-handoff-crypto.mjs';
import {createStockBinding} from '../../server/stock-binding.mjs';
export function metadataHandler({loadConfig=loadStockHandoffConfig,getDatabase=getSupabaseAdmin,createService=createStockMetadata}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
   if(req.method!=='POST'){res.setHeader('Allow','POST');denied('Método no permitido.',405);}
   // Server-to-server signed authority only. No browser CORS, cookies or commercial bearer.
   if(req.headers?.origin)denied();
   let body=req.body;if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>48000)denied('Solicitud demasiado grande.',413);}try{body=JSON.parse(raw);}catch{denied('Solicitud inválida.',400);}}
   if(typeof body==='string'){try{body=JSON.parse(body);}catch{denied('Solicitud inválida.',400);}}
   if(Buffer.byteLength(JSON.stringify(body)||'')>48000)denied('Solicitud demasiado grande.',413);
   const config=await loadConfig(),supabase=await getDatabase();
   // Discriminate only after verifying the common metadata signature. A binding
   // token can never enter the count contract; existing r2 exchange is unchanged.
   const verified=stockCrypto(config).verify('coreMetadata',body?.signedRequest);
   const result=verified.purpose==='inventory.identity_binding.metadata'?await createStockBinding({supabase,config}).metadata(body):await createService({supabase,config}).exchange(body);res.statusCode=200;res.end(JSON.stringify(result));
  }catch(error){res.statusCode=error.statusCode||503;res.end(JSON.stringify({error:error.statusCode?error.message:'No se pudo conciliar el conteo de inventario.'}));}
 };
}
export default metadataHandler();
