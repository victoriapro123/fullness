import {getSupabaseAdmin} from '../../server/backoffice-access.mjs';
import {readLocalMenu} from '../../server/local-menu.mjs';
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;res.end(JSON.stringify({error:'Método no permitido.'}));return;}
  try{const data=await readLocalMenu({supabase:getSupabaseAdmin()});res.statusCode=200;res.end(JSON.stringify({data}));}
  catch(e){res.statusCode=e.statusCode||503;res.end(JSON.stringify({error:'No pudimos cargar la carta. Consulta al equipo del local o vuelve a intentar.'}));}
}
