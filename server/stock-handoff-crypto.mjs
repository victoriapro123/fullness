import {createHash,createPrivateKey,createPublicKey,sign,verify} from 'node:crypto';
export const TYPES=Object.freeze({sourceIntent:'core360.inventory-count-intent.v1',sourceMetadata:'core360.inventory-count-source-attestation.v1',coreMetadata:'core360.inventory-count-source-request.v1',coreResult:'core360.inventory-count-result.v1'});
export function denied(message='Solicitud de inventario inválida.',statusCode=403){throw Object.assign(Error(message),{statusCode});}
export function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))denied();}
export const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
export const digest=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const encoded=value=>Buffer.from(JSON.stringify(stable(value))).toString('base64url');
export function stockCrypto(config){
 const signing={},publicKeys={};
 for(const role of ['sourceIntent','sourceMetadata']){
  const entry=config.signingKeys?.[role];if(!entry||entry.typ!==TYPES[role])denied('Firma Source no configurada.',503);
  const key=createPrivateKey(entry.privateKey);if(key.asymmetricKeyType!=='ed25519')denied();signing[role]={key,kid:entry.kid};
 }
 for(const role of ['sourceIntent','coreMetadata','coreResult']){
  const entry=config.peerKeys?.[role];if(!entry||entry.typ!==TYPES[role])denied('Verificación de inventario no configurada.',503);
  const key=createPublicKey(entry.publicKey);if(key.asymmetricKeyType!=='ed25519')denied();publicKeys[role]={key,kid:entry.kid};
 }
 return {
  sign(role,payload){const entry=signing[role];if(!entry)denied();const message=encoded({alg:'EdDSA',kid:entry.kid,typ:TYPES[role]})+'.'+encoded(payload);return message+'.'+sign(null,Buffer.from(message),entry.key).toString('base64url');},
  verify(role,token){try{
   const entry=publicKeys[role];if(!entry||typeof token!=='string'||token.length>20000)denied();
   const parts=token.split('.');if(parts.length!==3||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))denied();
   const [h,p,s]=parts,header=JSON.parse(Buffer.from(h,'base64url').toString());exact(header,['alg','kid','typ']);
   if(header.alg!=='EdDSA'||header.typ!==TYPES[role]||header.kid!==entry.kid||!verify(null,Buffer.from(h+'.'+p),entry.key,Buffer.from(s,'base64url')))denied();
   return JSON.parse(Buffer.from(p,'base64url').toString());
  }catch{denied('No se pudo verificar la firma de inventario.');}}
 };
}
export function validTime(payload,now,maxAge,{historical=false}={}){
 if(!Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.exp)||payload.iat>now+30||payload.exp<=payload.iat||payload.exp-payload.iat>maxAge||!historical&&payload.exp<=now)denied('La autorización de inventario venció.');
}
