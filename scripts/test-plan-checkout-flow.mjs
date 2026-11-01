import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCheckoutPreference} from '../server/mercadopago-checkout.mjs';
process.env.CHECKOUT_SITE_URL='https://fullness.example.invalid';
const ids=Array.from({length:6},()=>randomUUID()),letterId=randomUUID();
const cart=[{kind:'custom_plan',letterId,revision:1,size:6,quantity:1,selection:ids.map(itemId=>({itemId,week:1,quantity:1}))}];
for(const failure of [null,'preview','reservation','outbox','mercadopago']){
 const events=[],orders=[],items=[],group={id:randomUUID(),letterId,revision:1,size:6,quantity:1,unitTotal:60000,items:[]};let coreRequest;
 const supabase={from(table){const q={select(){return q},eq(){return q},single:async()=>({data:orders[0]}),then(resolve){return Promise.resolve({error:null}).then(resolve)}};return {...q,insert(value){events.push(`insert:${table}`);if(table==='orders'){orders.push({...value,id:value.id||randomUUID()});}else if(table==='order_items')items.push(...value);else throw Error(table);return q},update(){return q}};}};
 const dependencies={supabase,env:{FULLNESS_CUSTOM_PLANS_ENABLED:'true'},resolveDispatchProducts:async()=>[],
  resolveCustomPlans:async()=>({groups:[group],lines:ids.map(id=>({product:{id,name:'Plato QA',slug:`qa-${id}`,product_type:'mealprep',price_clp:10000,custom_plan:group},quantity:1,total:10000}))}),
  previewCore360Plans:async args=>{events.push('preview');if(failure==='preview')throw Error('preview failed');coreRequest={contractVersion:'commerce-plans/1',externalOrderId:args.externalOrderId,currency:'CLP',expectedTotalMinor:'60000'};return {enabled:true,checkout:coreRequest,result:{}};},
  enqueueCore360UnpaidOrder:async()=>{events.push('queue');return failure==='outbox'?{enabled:false}:{eventId:'fixture-outbox'};},
  deliverCore360OutboxEvent:async()=>{events.push('reserve');return {accepted:failure!=='reservation',result:{externalOrderId:orders[0].id,coreOrderId:randomUUID(),plan:{contractVersion:'commerce-plans/1',status:'held',expiresAt:new Date(Date.now()+900000).toISOString(),snapshot:{currency:'CLP',totalMinor:'60000'}}}};},
  cancelCore360PlanCheckout:async()=>{events.push('cancel-reservation');return {accepted:true};},
  mercadoPagoRequest:async(path,{body})=>{events.push('mercadopago');assert.equal(path,'/checkout/preferences');assert.equal(body.external_reference,orders[0].id);assert.equal(body.items.reduce((n,i)=>n+i.unit_price*i.quantity,0),60000);assert.equal(body.expires,true);assert.ok(Date.parse(body.expiration_date_to)>Date.now());assert.equal(orders[0].customer_snapshot.corePlanCheckout.externalOrderId,orders[0].id);if(failure==='mercadopago')throw Error('MP failed');return {id:'fixture-preference',init_point:'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=fixture'};}
 };
 const execute=()=>createCheckoutPreference({cart,fulfillment:{mode:'pickup',name:'QA',email:'qa@example.invalid',phone:'999999999'},request:{headers:{}},expectedAmount:60000,dependencies});
 if(failure)await assert.rejects(execute());else {const response=await execute();assert.equal(response.amount,60000);assert.equal(items.length,6);assert.deepEqual(events,['preview','insert:orders','insert:order_items','queue','reserve','mercadopago']);}
 if(['preview','reservation','outbox'].includes(failure))assert.ok(!events.includes('mercadopago'));
 if(failure==='preview')assert.equal(orders.length,0);
 if(failure==='mercadopago')assert.ok(events.includes('cancel-reservation'));
}
console.log('PASS: simulated full plan checkout persists composition, queues before reserve, requires held before MP, matches amount/expiry, and cancels a failed preference. No external provider calls.');
