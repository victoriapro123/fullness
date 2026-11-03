import {createPrivateKey,createPublicKey,sign,verify} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {digest,stable} from './stock-handoff-crypto.mjs';
export {digest};
export const TYPES={request:'core360.inventory-integration.request.v1',review:'core360.inventory-integration.review.v1',response:'core360.inventory-integration.response.v1'};
export const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
export function fail(message='No pudimos verificar la integración de inventario.',statusCode=503){throw Object.assign(Error(message),{statusCode});}
export function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...keys].sort().join('|'))fail('La respuesta de inventario no es válida.',403);}
const encoded=value=>Buffer.from(JSON.stringify(stable(value))).toString('base64url');
export function validateIntegrationConfig(c,env=process.env,types=TYPES){
 exact(c,['version','environment','enabled','coreIssuer','sourceIssuer','integrationId','tenantId','companyId','maxTransportAge','maxIntentAge','maxReviewAge','maxResponseAge','signingKeys','peerKeys']);
 if(c.version!==1||typeof c.enabled!=='boolean'||!['production','qa'].includes(c.environment)||!['integrationId','tenantId','companyId'].every(k=>uuid(c[k])))fail();
 for(const [key,max]of Object.entries({maxTransportAge:60,maxIntentAge:600,maxReviewAge:300,maxResponseAge:300}))if(!Number.isSafeInteger(c[key])||c[key]<1||c[key]>max)fail();
 for(const k of ['sourceIssuer','coreIssuer']){let u;try{u=new URL(c[k]);}catch{fail();}if(u.origin!==c[k])fail();}
 if(c.environment==='production'){
  if(env.VERCEL_ENV==='preview'||c.sourceIssuer!=='https://www.fullnesslab.com'||c.coreIssuer!=='https://core.prof3sional.com')fail();
 }else if(env.VERCEL_ENV==='production'||![c.sourceIssuer,c.coreIssuer].every(s=>/^http:\/\/127\.0\.0\.1:\d+$/.test(s)))fail();
 exact(c.signingKeys,['request']);exact(c.peerKeys,['request','review','response']);
 for(const role of Object.keys(types)){
  const key=c.peerKeys[role];exact(key,['kid','typ','environment','publicKey']);
  if(typeof key.kid!=='string'||key.kid.length<3||key.kid.length>150||key.typ!==types[role]||key.environment!==c.environment||c.environment==='production'&&/(^|[-_.])qa($|[-_.])/i.test(key.kid))fail();
  try{if(createPublicKey(key.publicKey).asymmetricKeyType!=='ed25519')fail();}catch{fail();}
 }
 const own=c.signingKeys.request;exact(own,['kid','typ','environment','publicKey','privateKey']);
 if(['kid','typ','environment','publicKey'].some(k=>own[k]!==c.peerKeys.request[k]))fail();
 try{const privateKey=createPrivateKey(own.privateKey);if(privateKey.asymmetricKeyType!=='ed25519'||!createPublicKey(privateKey).equals(createPublicKey(own.publicKey)))fail();}catch{fail();}
 return c;
}
export function integrationConfigured(env=process.env){return env.FULLNESS_INVENTORY_INTEGRATION_CONFIG_FILE!==undefined||env.FULLNESS_INVENTORY_INTEGRATION_CONFIG_JSON!==undefined;}
export async function loadIntegrationConfig(env=process.env){
 const file=env.FULLNESS_INVENTORY_INTEGRATION_CONFIG_FILE,json=env.FULLNESS_INVENTORY_INTEGRATION_CONFIG_JSON;
 if((file===undefined)===(json===undefined))fail('La integración de stock no tiene una configuración única.');
 try{return validateIntegrationConfig(JSON.parse(String(json===undefined?await readFile(file,'utf8'):json).replace(/^\uFEFF/,'')),env);}catch{fail('La configuración de stock no es válida. No se modificaron existencias.');}
}
export function integrationCrypto(c,types=TYPES){
 const own=createPrivateKey(c.signingKeys.request.privateKey),peer=createPublicKey(c.peerKeys.response.publicKey);
 return {
  sign(payload){const message=encoded({alg:'EdDSA',kid:c.signingKeys.request.kid,typ:types.request})+'.'+encoded(payload);return message+'.'+sign(null,Buffer.from(message),own).toString('base64url');},
  verify(token){
   try{
    if(typeof token!=='string'||token.length>32000)fail();
    const parts=token.split('.');if(parts.length!==3||parts.some(s=>! /^[A-Za-z0-9_-]+$/.test(s)))fail();
    const h=JSON.parse(Buffer.from(parts[0],'base64url').toString()),p=JSON.parse(Buffer.from(parts[1],'base64url').toString());exact(h,['alg','kid','typ']);
    if(h.alg!=='EdDSA'||h.kid!==c.peerKeys.response.kid||h.typ!==types.response||encoded(h)!==parts[0]||encoded(p)!==parts[1]||!verify(null,Buffer.from(parts[0]+'.'+parts[1]),peer,Buffer.from(parts[2],'base64url')))fail();
    return p;
   }catch{fail('No se pudo verificar la respuesta de inventario. Conserva el mismo intento.',403);}
  }
 };
}
export async function callIntegration({config,attempt,action,crypto=integrationCrypto(config),fetchImpl=fetch,clock=()=>Math.floor(Date.now()/1000)}){
 if(!config.enabled&&!['inspect','cancel'].includes(action))fail('El guardado está pausado. Puedes consultar o cancelar el intento anterior.');
 const now=clock(),request={version:1,iss:config.sourceIssuer,aud:config.coreIssuer,integrationId:config.integrationId,tenantId:config.tenantId,companyId:config.companyId,requestId:attempt.id,action,iat:now,exp:now+config.maxTransportAge,intent:attempt.intent,...(action==='confirm'?{reviewEnvelope:attempt.core_review_token,confirmed:true}:action==='cancel'?{confirmed:true}:{})};
 let response,payload;
 try{response=await fetchImpl(config.coreIssuer+'/api/inventory/integrations/v1/counts',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({signedRequest:crypto.sign(request)}),signal:AbortSignal.timeout(15000)});payload=await response.json();}catch{fail('No recibimos un resultado de inventario. Consulta el estado antes de repetir.');}
 if(!response.ok)fail('Core360 no pudo completar la operación de inventario. Conserva el intento y consulta su estado.',response.status===403?403:409);
 exact(payload,['signedResponse']);const result=crypto.verify(payload.signedResponse);
 exact(result,['version','iss','aud','integrationId','requestId','action','requestHash','iat','exp','status','projection','reviewEnvelope','receipt']);
 if(result.version!==1||result.iss!==config.coreIssuer||result.aud!==config.sourceIssuer||result.integrationId!==config.integrationId||result.requestId!==attempt.id||result.action!==action||result.requestHash!==digest(request)||!Number.isSafeInteger(result.iat)||!Number.isSafeInteger(result.exp)||result.iat>now+30||result.exp<=now||result.exp<=result.iat||result.exp-result.iat>config.maxResponseAge||!['review','confirmed','cancelled','uncertain'].includes(result.status))fail('La respuesta no corresponde a este intento.',403);
 if(result.projection!==null){
  const p=result.projection,i=attempt.intent;exact(p,['coreItemId','locationId','balanceId','unit','balanceVersion','onHandMilli','reservedMilli','countedQuantityMilli','deltaMilli']);
  if(p.coreItemId!==i.coreItemId||p.locationId!==i.locationId||p.balanceId!==i.balanceId||p.unit!==i.unit||p.countedQuantityMilli!==i.countedQuantityMilli||!Number.isSafeInteger(p.balanceVersion)||p.balanceVersion<0||!['onHandMilli','reservedMilli','countedQuantityMilli'].every(k=>/^(0|[1-9]\d*)$/.test(p[k]||''))||! /^-?\d+$/.test(p.deltaMilli||''))fail('El saldo de la respuesta no corresponde al conteo.',403);
 }
 if(result.status==='review'){
  if(!result.projection||typeof result.reviewEnvelope!=='string'||result.reviewEnvelope.length<10||result.receipt!==null)fail('Revisión incompleta.',403);
 }else if(result.reviewEnvelope!==null)fail('Revisión inesperada.',403);
 if(['confirmed','cancelled'].includes(result.status)){
  const r=result.receipt;exact(r,['receiptRef','status','receiptHash','resultId','principal','sourceOperator']);exact(r.principal,['type','integrationId']);exact(r.sourceOperator,['issuer','subject']);
  if(typeof r.receiptRef!=='string'||r.receiptRef.length<1||r.receiptRef.length>300||r.status!==result.status||r.principal.type!=='integration'||r.principal.integrationId!==config.integrationId||r.sourceOperator.issuer!==config.sourceIssuer||r.sourceOperator.subject!==attempt.source_user_id||! /^[a-f0-9]{64}$/.test(r.receiptHash)||r.resultId!==digest([config.integrationId,attempt.id,r.status,r.receiptHash]))fail('El recibo no corresponde a tu operación.',403);
 }else if(result.receipt!==null)fail('Recibo inesperado.',403);
 return {...result,signedEnvelope:payload.signedResponse};
}
