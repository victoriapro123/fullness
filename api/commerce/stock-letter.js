import {getSupabaseAdmin} from '../../server/backoffice-access.mjs';
import {readStockLetter} from '../../server/custom-plans.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;res.end(JSON.stringify({error:'Método no permitido.'}));return;}
 try{const data=await readStockLetter({supabase:getSupabaseAdmin()});
  // Double gate: an additive SQL migration must not switch the live sales model.
  data.enabled=data.enabled&&process.env.FULLNESS_CUSTOM_PLANS_ENABLED==='true';
  res.statusCode=200;res.end(JSON.stringify({data}));
 }catch(error){res.statusCode=error.statusCode||503;res.end(JSON.stringify({error:error.message}));}
}
