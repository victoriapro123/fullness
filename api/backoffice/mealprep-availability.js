import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readJsonBody} from '../../server/mercadopago-checkout.mjs';
import {readLocalMenu,availabilityRow} from '../../server/local-menu.mjs';
import {validateAvailability} from '../../src/lib/local-menu.js';
import {UUID_PATTERN} from '../../src/lib/custom-plans.js';
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  try {
    const {supabase,user}=await assertOwnerBackofficeRequest(req);
    if(req.method==='GET'){const d=await readLocalMenu({supabase,admin:true});res.statusCode=200;res.end(JSON.stringify({data:{library:d.library,availability:d.availability}}));return;}
    if(req.method!=='PUT'){res.setHeader('Allow','GET, PUT');throw Object.assign(Error('Método no permitido.'),{statusCode:405});}
    const body=await readJsonBody(req);validateAvailability(body);
    if(!UUID_PATTERN.test(body.libraryMealId||'')||!Number.isSafeInteger(body.revision)||body.revision<0)throw Object.assign(Error('Revisa el plato y su revisión.'),{statusCode:422});
    const {data,error}=await supabase.rpc('save_mealprep_availability',{p_meal_id:body.libraryMealId,p_state:body.state,p_starts_on:body.startsOn||null,p_ends_on:body.endsOn||null,p_revision:body.revision,p_actor:user.id});
    if(error)throw Object.assign(Error(error.message),{statusCode:error.code==='40001'?409:422});
    res.statusCode=200;res.end(JSON.stringify({data:availabilityRow(data)}));
  }catch(e){res.statusCode=e.statusCode||422;res.end(JSON.stringify({error:e.message}));}
}
