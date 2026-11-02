import{createPrivateKey,createPublicKey,sign,verify}from'node:crypto';
import{denied,exact,stable}from'./stock-handoff-crypto.mjs';
export const BINDING_TYPES={sourceBindingIntent:'core360.inventory-binding-intent.v1',coreBindingResult:'core360.inventory-binding-result.v1'};
export function bindingCrypto(config){
 const role='sourceBindingIntent',entry=config.signingKeys?.[role];if(!entry||entry.typ!==BINDING_TYPES[role])denied('La conexión de cuentas no está configurada.',503);
 const privateKey=createPrivateKey(entry.privateKey);if(privateKey.asymmetricKeyType!=='ed25519')denied();
 const encoded=v=>Buffer.from(JSON.stringify(stable(v))).toString('base64url');
 return{sign(payload){const data=encoded({alg:'EdDSA',kid:entry.kid,typ:BINDING_TYPES.sourceBindingIntent})+'.'+encoded(payload);return data+'.'+sign(null,Buffer.from(data),privateKey).toString('base64url');},verify(role,token){try{
  const key=config.peerKeys?.[role];if(!key||key.typ!==BINDING_TYPES[role]||typeof token!=='string'||token.length>20000)denied();
  const parts=token.split('.');if(parts.length!==3||parts.some(s=>!/^[A-Za-z0-9_-]+$/.test(s)))denied();
  const[h,p,s]=parts,header=JSON.parse(Buffer.from(h,'base64url'));exact(header,['alg','kid','typ']);const publicKey=createPublicKey(key.publicKey);
  if(header.alg!=='EdDSA'||header.typ!==key.typ||header.kid!==key.kid||publicKey.asymmetricKeyType!=='ed25519'||!verify(null,Buffer.from(h+'.'+p),publicKey,Buffer.from(s,'base64url')))denied();return JSON.parse(Buffer.from(p,'base64url'));
 }catch{denied('No se pudo verificar la prueba de asociación.');}}};
}
