import {assertOwnerBackofficeRequest} from '../../server/backoffice-access.mjs';
import {readMealprepStock} from '../../server/mealprep-stock.mjs';
import {loadStockHandoffConfig} from '../../server/stock-handoff-metadata.mjs';
import {createStockBinding} from '../../server/stock-binding.mjs';
import {publicStockConfig} from '../../server/stock-handoff-config.mjs';
import {integrationConfigured,loadIntegrationConfig} from '../../server/integrated-stock-crypto.mjs';
import {loadLinksConfig} from '../../server/integrated-stock-links-crypto.mjs';
import {readDirectMealprepStock} from '../../server/integrated-stock-links.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
  const {supabase,user}=await assertOwnerBackofficeRequest(req);
  if(req.method!=='GET'){res.setHeader('Allow','GET');throw Object.assign(Error('Método no permitido.'),{statusCode:405});}
  const data=integrationConfigured()?{rows:[],writeAvailable:false}:await readMealprepStock({supabase});
  if(integrationConfigured()){
   data.writeMode='integration';data.bindingSupport=false;data.writeAvailable=false;
   try{
    const config=await loadIntegrationConfig();
    const linksConfig=await loadLinksConfig();
    if(['integrationId','tenantId','companyId','sourceIssuer','coreIssuer'].some(k=>linksConfig[k]!==config[k]))throw Error('Scope mismatch');
    const pending=await supabase.from('mealprep_stock_integration_attempts').select('request_key,source_recipe_id,request_payload,state,core_receipt_id').eq('source_user_id',user.id).not('state','in','(committed,cancelled)').limit(501);
    if(pending.error||pending.data?.length>500)throw Error('Metadata unavailable');
    data.pendingCounts=(pending.data||[]).map(a=>({recipeId:a.source_recipe_id,requestKey:a.request_key,operationMode:'integration',balanceId:a.request_payload.balanceId,quantity:String(BigInt(a.request_payload.countedQuantityMilli)/1000n),reason:a.request_payload.reason,consumerId:a.request_payload.consumerId,...(a.core_receipt_id?{receiptId:a.core_receipt_id}:{})}));
    Object.assign(data,await readDirectMealprepStock({supabase,user,config:linksConfig}));
    data.linkAvailable=linksConfig.enabled;
    const client=req.query?.client||new URL(req.url||'/', 'http://fullness.invalid').searchParams.get('client');
    data.writeAvailable=config.enabled&&client==='integration-v1';data.rows=data.rows.map(row=>({...row,editable:data.writeAvailable&&row.state==='known'&&row.balances.some(b=>b.locationId&&Number.isSafeInteger(b.version))}));
    data.writeMessage=!config.enabled?'El guardado está pausado. Puedes consultar o cancelar los intentos anteriores.':data.writeAvailable?'Revisa y confirma el conteo aquí. La integración validará permisos, reservas y versión antes de guardarlo.':'Recarga la página para usar el guardado integrado de stock.';
   }catch{data.writeAvailable=false;data.linkAvailable=false;data.writeMessage='El guardado integrado aún no pudo verificarse. Conservamos tu borrador; no se modificaron existencias.';}
  }else if(process.env.FULLNESS_STOCK_HANDOFF_CONFIG_FILE!==undefined||process.env.FULLNESS_STOCK_HANDOFF_CONFIG_JSON!==undefined){
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
