import{backofficeRequest}from'./backoffice-request.js';
import{stockClientPolicy}from'./stock-handoff-policy.js';
const endpoint='/api/backoffice/mealprep-stock-binding';
export function createStockBindingClient({request=backofficeRequest,windowImpl=window,timeoutMs=120000,getConfig=()=>null}={}){
 return{async connect({requestKey,consumerId}){
  const policy=stockClientPolicy(getConfig(),windowImpl.location.origin,{binding:true}),corePage=policy.corePage,coreOrigin=new URL(corePage).origin;
  const popup=windowImpl.open('about:blank','fullness_stock_binding','popup,width=600,height=800');if(!popup)throw Error('Permite abrir Core360 para comprobar tu propia cuenta.');
  let armed=false;
  try{
   const prepared=await request(endpoint,'POST',{action:'binding.prepare',requestKey,consumerId});
   if(prepared.corePage!==corePage||!prepared.intent)throw Error('No se pudo comprobar la ventana de Core360.');
   return await new Promise((resolve,reject)=>{
    let settled=false,checking=false,timer,closedCheck;
    function finish(value,error){if(settled)return;settled=true;clearTimeout(timer);clearInterval(closedCheck);windowImpl.removeEventListener('message',receive);if(error)reject(error);else resolve(value);}
    async function receive(event){
     if(event.origin!==coreOrigin||event.source!==popup||!event.data)return;const message=event.data;
     if(message.type==='core360.stock.ready.v1'&&/^[0-9a-f-]{36}$/.test(message.challenge||'')){popup.postMessage({type:'fullness.stock.binding-intent.v1',challenge:message.challenge,consumerId,intent:prepared.intent},event.origin);return;}
     if(message.type!=='core360.stock.binding.result.v1'||message.consumerId!==consumerId||typeof message.signedResult!=='string'||message.signedResult.length>20000||checking)return;
     checking=true;try{const review=await request(endpoint,'POST',{action:'binding.review',signedResult:message.signedResult});finish({...review,signedResult:message.signedResult});}catch(error){finish(null,error);}
    }
    windowImpl.addEventListener('message',receive);armed=true;
    timer=setTimeout(()=>finish(null,Error('La conexión sigue sin confirmar. Puedes volver a abrir Core con el mismo intento.')),timeoutMs);
    closedCheck=setInterval(()=>{if(popup.closed)finish(null,Error('No se activó la conexión. Conservamos el intento para que puedas volver después de iniciar sesión en Core.'));},500);
    popup.location.href=corePage;
   });
  }catch(error){if(!armed)popup.close();throw error;}
 },accept:({signedResult,confirmed})=>request(endpoint,'POST',{action:'binding.accept',signedResult,confirmed,sourceConsentVersion:'fullness.stock-binding.v1'}),inspect:()=>request(endpoint,'POST',{action:'binding.inspect'}),cancel:({requestKey})=>request(endpoint,'POST',{action:'binding.cancel',requestKey}),revoke:({bindingId,revision})=>request(endpoint,'POST',{action:'binding.revoke',bindingId,revision,confirmed:true})};
}
