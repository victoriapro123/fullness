import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readMealprepStock} from '../../server/mealprep-stock.mjs';
import {loadStockHandoffConfig} from '../../server/stock-handoff-metadata.mjs';
import {createStockBinding} from '../../server/stock-binding.mjs';
import {publicStockConfig} from '../../server/stock-handoff-config.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
  const {supabase,user}=await assertOwnerBackofficeRequest(req);
  if(req.method!=='GET'){res.setHeader('Allow','GET');throw Object.assign(Error('Método no permitido.'),{statusCode:405});}
  const data=await readMealprepStock({supabase});
  if(process.env.FULLNESS_STOCK_HANDOFF_CONFIG_FILE!==undefined||process.env.FULLNESS_STOCK_HANDOFF_CONFIG_JSON!==undefined){
   try{const config=await loadStockHandoffConfig(),binding=await createStockBinding({supabase,config}).owner(user,{action:'binding.inspect'}),eligibility=binding.countEligibility,age=Math.floor(Date.now()/1000)-eligibility?.observedAt;
    data.bindingSupport=true;data.handoffConfig=publicStockConfig(config);data.binding={status:binding.status,sourceIdentity:binding.sourceIdentity,coreIdentity:binding.coreIdentity};
    data.writeAvailable=binding.status==='active'&&eligibility?.canWriteCount===true&&age>=-30&&age<=300;
    data.rows=data.rows.map(row=>({...row,editable:data.writeAvailable&&row.state==='known'&&row.balances.some(b=>b.locationId&&Number.isSafeInteger(b.version))}));
    data.writeMessage=data.writeAvailable?'Core360 volverá a verificar tus permisos al confirmar.':binding.status==='active'?'Revisa tus cuentas en Core360 para comprobar los permisos vigentes.':'Conecta tu propia cuenta Core360 para revisar y guardar cantidades.';
   }catch{data.writeAvailable=false;data.writeMessage='La conexión de tu cuenta Core360 todavía no está verificada. No se modificaron existencias.';}
  }
  res.statusCode=200;res.end(JSON.stringify({data}));
 }catch(error){res.statusCode=error.statusCode||503;res.end(JSON.stringify({error:error.statusCode?error.message:'No pudimos consultar el inventario.'}));}
}
