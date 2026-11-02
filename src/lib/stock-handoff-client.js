import {backofficeRequest} from './backoffice-request.js';
import {stockClientPolicy} from './stock-handoff-policy.js';
const endpoint='/api/backoffice/mealprep-stock-operation';
const consumers=['fullness.mealprep-list.stock.v1','fullness.mealprep-detail.stock.v1'];
// QA-only until Main's explicit binding/production addendum. No session crosses origins.
export function createStockHandoffClient({request=backofficeRequest,windowImpl=window,timeoutMs=120000,getConfig=()=>null}={}){
 async function launch(input){
  const policy=stockClientPolicy(getConfig(),windowImpl.location.origin),expectedPage=policy.corePage;
  const popup=windowImpl.open('about:blank','fullness_stock_review','popup,width=600,height=800');
  if(!popup)throw Object.assign(Error('Permite abrir la ventana de Core360 para revisar el conteo.'),{preparationNotStarted:true});
  let armed=false;
  try{
   const state=await request(endpoint,'POST',input);
   if(state.status==='committed'||state.status==='cancelled'){popup.close();return state;}
   if(!state.needsCore||typeof state.intent!=='string'||state.corePage!==expectedPage){popup.close();return state;}
   const consumerId=input.consumerId||state.consumerId;
   if(!consumers.includes(consumerId))throw Error('No pudimos verificar el origen de este intento.');
   const coreOrigin=new URL(expectedPage).origin;
   return await new Promise((resolve,reject)=>{
    let settled=false,checking=false,timer,closedCheck;
    function finish(value,error){if(settled)return;settled=true;clearTimeout(timer);clearInterval(closedCheck);windowImpl.removeEventListener('message',receive);if(error)reject(error);else resolve(value);}
    async function receive(event){
     if(event.origin!==coreOrigin||event.source!==popup||!event.data||typeof event.data!=='object')return;
     const message=event.data;
     if(message.type==='core360.stock.ready.v1'&&typeof message.challenge==='string'&&/^[0-9a-f-]{36}$/.test(message.challenge)){
      popup.postMessage({type:'fullness.stock.intent.v1',challenge:message.challenge,consumerId,intent:state.intent},coreOrigin);return;
     }
     if(message.type!=='core360.stock.result.v1'||message.consumerId!==consumerId||typeof message.signedResult!=='string'||message.signedResult.length>20000||checking)return;
     checking=true;
     try{
      // A postMessage is only a wake-up. Authoritative state comes from own backend.
      const observed=await request(endpoint,'POST',{action:'inspect',recipeId:input.recipeId,requestKey:input.requestKey});
      finish(observed);
     }catch(error){finish(null,error);}
    }
    windowImpl.addEventListener('message',receive);armed=true;
    timer=setTimeout(()=>finish({status:'pending',requestKey:input.requestKey}),timeoutMs);
    closedCheck=setInterval(()=>{if(popup.closed)finish({status:'pending',requestKey:input.requestKey});},500);
    popup.location.href=expectedPage;
   });
  }catch(error){if(!armed)popup.close();throw error;}
 }
 return {
  count:({recipeId,physicalMilli,reason,requestKey,balance,consumerId})=>launch({action:'prepare',recipeId,countedQuantityMilli:physicalMilli,reason,requestKey,balanceId:balance.id,consumerId}),
  recover:({recipeId,requestKey,action})=>launch({action,recipeId,requestKey})
 };
}
