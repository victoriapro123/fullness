import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readJsonBody} from '../../server/mercadopago-checkout.mjs';
import {readLocalMenu,normalizeLocalMenu} from '../../server/local-menu.mjs';
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  try {
    const {supabase,user}=await assertOwnerBackofficeRequest(req);
    if(req.method==='GET'){res.statusCode=200;res.end(JSON.stringify({data:await readLocalMenu({supabase,admin:true})}));return;}
    if(req.method!=='PUT'){res.setHeader('Allow','GET, PUT');throw Object.assign(Error('Método no permitido.'),{statusCode:405});}
    const body=await readJsonBody(req);
    if(!Number.isSafeInteger(body.revision)||body.revision<1||typeof body.publish!=='boolean')throw Object.assign(Error('Revisa la revisión y la acción de guardado.'),{statusCode:422});
    const document=normalizeLocalMenu(body.document);
    const {data,error}=await supabase.rpc('save_local_menu',{p_document:document,p_revision:body.revision,p_publish:body.publish,p_actor:user.id});
    if(error)throw Object.assign(Error(error.message),{statusCode:error.code==='40001'?409:422});
    res.statusCode=200;res.end(JSON.stringify({data}));
  }catch(e){res.statusCode=e.statusCode||503;res.end(JSON.stringify({error:e.message}));}
}
