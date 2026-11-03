import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {validateIntegrationConfig,integrationCrypto,exact,digest,fail,uuid} from './integrated-stock-crypto.mjs';
export const LINK_TYPES={request:'core360.inventory-integration.link-request.v1',review:'core360.inventory-integration.link-review.v1',response:'core360.inventory-integration.link-response.v1'};
export async function loadLinksConfig(env=process.env){
 const file=env.FULLNESS_INVENTORY_LINKS_CONFIG_FILE,json=env.FULLNESS_INVENTORY_LINKS_CONFIG_JSON;
 if((file===undefined)===(json===undefined))fail('Falta verificar la configuración de vínculos.');
 try{return validateIntegrationConfig(JSON.parse(String(json===undefined?await readFile(file,'utf8'):json).replace(/^\uFEFF/,'')),env,LINK_TYPES);}catch{fail('La configuración del vínculo no es válida. No se modificó inventario.');}
}
const milli=v=>typeof v==='string'&&/^(0|[1-9]\d*)$/.test(v)&&BigInt(v)<=9000000000000000n;
export async function callLinks({config,user,attempt,action,clock=()=>Math.floor(Date.now()/1000),fetchImpl=fetch}){
 if(!config.enabled&&!['inspect','cancel'].includes(action))fail('La configuración está pausada. Puedes recuperar el intento anterior.');
 const now=clock(),id=attempt?.id||randomUUID(),crypto=integrationCrypto(config,LINK_TYPES);
 const request={version:1,iss:config.sourceIssuer,aud:config.coreIssuer,integrationId:config.integrationId,tenantId:config.tenantId,companyId:config.companyId,requestId:id,action,iat:now,exp:now+config.maxTransportAge,sourceOperator:{issuer:config.sourceIssuer,subject:user.id,role:'admin',verifiedAt:now},intent:attempt?.intent||null,...(action==='confirm'?{reviewEnvelope:attempt.core_review_token,confirmed:true}:action==='cancel'?{confirmed:true}:{})};
 let response,payload;try{response=await fetchImpl(config.coreIssuer+'/api/inventory/integrations/v1/links',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({signedRequest:crypto.sign(request)}),signal:AbortSignal.timeout(15000)});payload=await response.json();}catch{fail('No recibimos un resultado. Conserva el intento y consulta su estado.');}
 if(!response.ok)fail('No pudimos verificar el vínculo en Core360. Consulta el resultado antes de repetir.',response.status===403?403:409);
 exact(payload,['signedResponse']);const r=crypto.verify(payload.signedResponse);
 exact(r,['version','iss','aud','integrationId','requestId','action','requestHash','iat','exp','status','targets','selection','reviewEnvelope','receipt']);
 if(r.version!==1||r.iss!==config.coreIssuer||r.aud!==config.sourceIssuer||r.integrationId!==config.integrationId||r.requestId!==id||r.action!==action||r.requestHash!==digest(request)||!Number.isSafeInteger(r.iat)||!Number.isSafeInteger(r.exp)||r.iat>now+30||r.exp<=now||r.exp<=r.iat||r.exp-r.iat>config.maxResponseAge||!['catalog','review','linked','cancelled','uncertain'].includes(r.status))fail('La respuesta no corresponde al vínculo.',403);
 if(r.status==='catalog'){
  if(action!=='catalog'||!Array.isArray(r.targets)||r.targets.length>200)fail();
  const keys=new Set();for(const t of r.targets){exact(t,['coreItemId','sku','name','unit','locationId','warehouseCode','balanceId','balanceVersion','onHandMilli','reservedMilli','selectable','reasonCode']);
   if(!uuid(t.coreItemId)||!['un','UN'].includes(t.unit)||(t.locationId!==null&&!uuid(t.locationId))||typeof t.sku!=='string'||typeof t.name!=='string'||typeof t.selectable!=='boolean'||!(t.reasonCode===null||typeof t.reasonCode==='string'))fail();
   const key=t.coreItemId+':'+t.locationId+':'+t.balanceId;if(keys.has(key))fail();keys.add(key);
   if(t.balanceId===null){if(t.selectable||t.balanceVersion!==null||t.onHandMilli!==null||t.reservedMilli!==null)fail();}
   else if(!uuid(t.balanceId)||!Number.isSafeInteger(t.balanceVersion)||t.balanceVersion<0||!milli(t.onHandMilli)||!milli(t.reservedMilli)||!uuid(t.locationId))fail();
  }
 }else if(r.targets!==null)fail();
 if(['review','linked'].includes(r.status)){
  exact(r.selection,['sourceMealprepId','linkRef','linkRevision','coreItemId','locationId','unit','equivalenceMilli']);
  if(!attempt||Object.keys(r.selection).some(k=>r.selection[k]!==attempt.intent[k]))fail('La selección no coincide.',403);
 }else if(r.selection!==null)fail();
 if(r.status==='review'){if(typeof r.reviewEnvelope!=='string'||r.reviewEnvelope.length<10||r.receipt!==null)fail();}else if(r.reviewEnvelope!==null)fail();
 if(['linked','cancelled'].includes(r.status)){
  const t=r.receipt;exact(t,['receiptRef','status','receiptHash','resultId','principal','sourceOperator']);exact(t.principal,['type','integrationId']);exact(t.sourceOperator,['issuer','subject']);
  if(typeof t.receiptRef!=='string'||t.receiptRef.length<1||t.receiptRef.length>300||t.status!==r.status||t.principal.type!=='integration'||t.principal.integrationId!==config.integrationId||t.sourceOperator.issuer!==config.sourceIssuer||t.sourceOperator.subject!==user.id||! /^[a-f0-9]{64}$/.test(t.receiptHash)||t.resultId!==digest([config.integrationId,id,t.status,t.receiptHash]))fail('Recibo de vínculo inválido.',403);
 }else if(r.receipt!==null)fail();
 return {...r,signedEnvelope:payload.signedResponse};
}
