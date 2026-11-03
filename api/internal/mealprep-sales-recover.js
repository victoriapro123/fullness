import {timingSafeEqual} from 'node:crypto';
import {getSupabaseAdmin} from '../../server/backoffice-access.mjs';
import {runSaleRecovery} from '../../server/mercadopago-checkout.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 const secret=process.env.CRON_SECRET,actual=String(req.headers.authorization||''),expected=secret?'Bearer '+secret:'';
 if(!secret||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected))){res.statusCode=401;res.end(JSON.stringify({error:'No autorizado.'}));return;}
 if(!['GET','POST'].includes(req.method)){res.statusCode=405;res.end(JSON.stringify({error:'Método no permitido.'}));return;}
 try{const data=await runSaleRecovery({supabase:getSupabaseAdmin()});res.statusCode=200;res.end(JSON.stringify({data}));}catch{res.statusCode=503;res.end(JSON.stringify({error:'No pudimos revisar las compras pendientes.'}));}
}
