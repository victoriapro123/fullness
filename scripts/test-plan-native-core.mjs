import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {startNativePlanStore} from './qa-native-plan-store.mjs';
import {createCheckoutPreference} from '../server/mercadopago-checkout.mjs';
import {planProductFacts} from '../api/backoffice/plan-products.js';
import {readStockLetter} from '../server/custom-plans.mjs';
import {readCore360Catalog,readCore360PlanProfiles,previewCore360Plans,projectCore360CommerceRead,deliverCore360OutboxEvent,readCore360CanonicalOrder,enqueueCore360PaymentApproved,cancelCore360PlanCheckout} from '../server/core360-commerce-adapter.mjs';

const configPath=process.argv[process.argv.indexOf('--core-qa-config')+1];
if(!process.argv.includes('--core-qa-config')||!configPath||!path.resolve(configPath).includes(`${path.sep}.local${path.sep}`))throw Error('Indica el archivo privado del único Core QA autorizado. No se acepta Core público.');
const qa=JSON.parse(await readFile(configPath,'utf8')),url=new URL(qa.baseUrl);
if(qa.qa!==true||url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.port!=='3151'||!qa.token)throw Error('Sólo la fixture Core QA3151 expresamente preparada por Main.');
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,options)=>{const target=new URL(typeof input==='string'?input:input.url||String(input));if(!['127.0.0.1','localhost','[::1]'].includes(target.hostname))throw Error('QA prohíbe proveedores o bases remotas.');return originalFetch(input,options);};
const env={CORE360_BASE_URL:qa.baseUrl,CORE360_COMMERCE_TOKEN:qa.token,CORE360_COMMERCE_TEST_MODE:'true',CORE360_COMMERCE_CUSTOMER_MODE:'anonymous',CORE360_FISCAL_INTENT:'pending',CORE360_COMMERCE_READ_ENABLED:'true',CORE360_COMMERCE_POLL_ENABLED:'true',CORE360_COMMERCE_PREVIEW_ENABLED:'true',CORE360_COMMERCE_SYNC_ENABLED:'true',CORE360_COMMERCE_DELIVERY_ENABLED:'true',CORE360_COMMERCE_ORDER_SYNC_ENABLED:'true',FULLNESS_CUSTOM_PLANS_ENABLED:'true',CORE360_COMMERCE_SYNC_FROM:new Date(Date.now()-60000).toISOString()};
process.env.CHECKOUT_SITE_URL='https://fullness.example.invalid';
const report={startedAt:new Date().toISOString(),coreTarget:'isolated-loopback-3151',fullnessPersistence:'PostgreSQL17 + PostgREST16 + official Supabase SDK',mercadoPago:'SIMULATED ONLY; no provider request, payment or financial settlement',tests:[],ok:false};
let store;
const checked=label=>{report.tests.push(label);console.log(`PASS: ${label}`);};
try{
 // This is the first Core contact: Main must have explicitly announced Ready.
 const catalog=await readCore360Catalog({env,query:{limit:100,quantityMilli:'1000',issuedOn:qa.issuedOn}});
 const core=(catalog.rows||[]).filter(r=>r.canUseInPlan===true).slice(0,6);
 assert.ok(core.length>=5,'Fixture necesita cinco o seis porciones canónicas distintas.');
 const profiles=await readCore360PlanProfiles({env});assert.equal(profiles.contractVersion,'commerce-plans/1');
 checked('Core HTTP real anuncia perfiles/version y catálogo plan-only elegible');
 store=await startNativePlanStore({postgresBin:'C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/tools/postgresql-17.11-5/pgsql/bin',postgrestBin:path.resolve('.local/tools/postgrest-v16.4/postgrest.exe')});
 const db=store.supabase,actor=randomUUID();
 await store.sql(`insert into auth.users values('${actor}');insert into profiles values('${actor}',true);`);
 const prepared=[];
 for(const item of core){
  const recipe=randomUUID();const lib=await db.from('meal_library_items').insert({id:recipe,name:`QA AISLADO ${item.sku}`,description:'Preparación sintética para aceptación, nunca catálogo real',is_active:true});assert.ifError(lib.error);
  const link=await db.rpc('link_plan_mealprep',{p_document:{...planProductFacts(item),libraryMealId:recipe},p_expected_version:'',p_actor:actor});assert.ifError(link.error);
  const available=await db.rpc('save_mealprep_availability',{p_meal_id:recipe,p_state:'available',p_starts_on:null,p_ends_on:null,p_revision:0,p_actor:actor});assert.ifError(available.error);
  prepared.push({menuId:link.data.product.id,recipe,coreId:item.id,title:`QA AISLADO ${item.sku}`});
 }
 await projectCore360CommerceRead({env,supabase:db});
 const letters=await db.from('stock_letters').select('*');assert.ifError(letters.error);const letter=letters.data[0];
 const published=await db.rpc('save_stock_letter',{p_document:{id:letter.id,title:'Carta sintética aislada',startsOn:'2026-11-01',endsOn:'2026-11-22',state:'active',planSizes:[6,24],familyInPlans:false,items:prepared.map((p,i)=>({position:i+1,title:p.title,menuItemId:p.menuId,libraryMealId:p.recipe}))},p_revision:letter.revision,p_actor:actor});assert.ifError(published.error);
 const enabled=await db.from('custom_plan_settings').update({enabled:true}).eq('id',true);assert.ifError(enabled.error);
 const current=await readStockLetter({supabase:db,env});assert.ok(current.items.length>=5);assert.ok(current.items.every(i=>i.commercialReady&&i.availableUnits>0),JSON.stringify(current.items.map(({commercialReady,availableUnits,availabilityLabel})=>({commercialReady,availableUnits,availabilityLabel}))));
 checked('RPC vínculos/CAS/carta/fechas reales persisten en PostgreSQL y SDK lee stock/precio Core sin inventarlos');
 const base=current.items.map(i=>({itemId:i.id,week:1,quantity:1}));if(base.length===5)base[0].quantity=2;
 const price=base.reduce((n,r)=>n+current.items.find(i=>i.id===r.itemId).priceClp*r.quantity,0);
 let mpCalls=0;
 const checkout=async(size,{loseAck=false,failMp=false}={})=>{
  let lost=false;
  return createCheckoutPreference({cart:[{kind:'custom_plan',letterId:current.letter.id,revision:current.letter.revision,size,quantity:1,selection:Array.from({length:size===24?4:1},(_,i)=>base.map(r=>({...r,week:i+1}))).flat()}],expectedAmount:price*(size===24?4:1),fulfillment:{mode:'pickup',name:'QA AISLADO',email:'qa@example.invalid',phone:'999999999'},request:{headers:{}},dependencies:{env,supabase:db,
   core360FetchImpl:async(url,options)=>{const result=await fetch(url,options);if(loseAck&&!lost&&url.endsWith('/plan-checkouts')){lost=true;assert.ok(result.ok);await result.json();throw Error('QA ACK perdido después de commit Core');}return result;},
   mercadoPagoRequest:async(route,{body})=>{mpCalls++;assert.equal(route,'/checkout/preferences');assert.equal(body.expires,true);const canonical=await readCore360CanonicalOrder({env,externalOrderId:body.external_reference});assert.equal(canonical.plan.status,'held');assert.equal(body.expiration_date_to,canonical.plan.expiresAt);if(failMp)throw Error('QA proveedor indisponible');return {id:`fixture-${randomUUID()}`,init_point:'https://fullness.example.invalid/checkout-fixture'};}
  }});
 };
 const weekly=await checkout(6),weeklyOrder=await db.from('orders').select('*').eq('id',weekly.orderId).single();assert.ifError(weeklyOrder.error);
 const groups=await db.from('order_custom_plans').select('*').eq('order_id',weekly.orderId);assert.ifError(groups.error);assert.equal(groups.data.length,1);assert.equal(groups.data[0].snapshot.size,6);
 const created=await db.from('core360_commerce_outbox').select('*').eq('order_id',weekly.orderId).eq('event_type','web_order.created').single();assert.ifError(created.error);assert.equal(created.data.status,'accepted');assert.equal(created.data.core_request.contractVersion,'commerce-plans/1');assert.ok(created.data.core_request_hash);
 checked('Semanal completo: selección → PostgreSQL/snapshot → outbox sellado → reserva Core held → preferencia MP simulada');
 const orderItems=await db.from('order_items').select('*').eq('order_id',weekly.orderId);assert.ifError(orderItems.error);
 const paidAt=new Date().toISOString(),paidOrder={...weeklyOrder.data,status:'paid',payment_status:'approved',paid_at:paidAt};
 const queued=await enqueueCore360PaymentApproved({env,supabase:db,order:paidOrder,items:orderItems.data,payment:{provider:'mercado_pago',provider_payment_id:`91${Date.now()}`,status:'approved',transaction_amount_clp:price,paid_at:paidAt,raw_payload:{live_mode:false}}});
 const observed=await deliverCore360OutboxEvent({env,supabase:db,event:{id:queued.eventId}});assert.equal(observed.accepted,true);
 const confirmed=await readCore360CanonicalOrder({env,externalOrderId:weekly.orderId});assert.equal(confirmed.plan.status,'confirmed');assert.equal(confirmed.plan.expiresAt,null);
 checked('Observación financiera SINTÉTICA sólo loopback confirma la misma orden/reserva; ningún pago real');
 const monthly=await checkout(24);const monthlyState=await readCore360CanonicalOrder({env,externalOrderId:monthly.orderId});assert.equal(monthlyState.plan.snapshot.plans[0].weeks.length,4);assert.equal(monthly.amount,price*4);
 const cancelled=await cancelCore360PlanCheckout({env,supabase:db,externalOrderId:monthly.orderId});assert.equal(cancelled.accepted,true);assert.equal((await readCore360CanonicalOrder({env,externalOrderId:monthly.orderId})).plan.status,'cancelled');
 checked('Mensual4×6 conserva semanas/importe; cancelación CAS por outbox libera reserva canónica');
 const family=catalog.rows.find(r=>r.canBuyStandalone===true&&r.item_type==='product'&&r.inventory_enabled===true&&r.sku==='QA-FAMILY'&&r.commercial_use!=='ingredient');
 const service=catalog.rows.find(r=>r.canBuyStandalone===true&&r.item_type==='service'&&r.inventory_enabled===false&&String(r.lineGrossMinor)==='3990');
 assert.ok(family&&service,'Fixture necesita familiar físico y despacho3990 canónico no inventariable.');
 const mixedId=randomUUID(),mixedTotal=price+Number(family.lineGrossMinor)+Number(service.lineGrossMinor);
 const mixedGroup={id:randomUUID(),size:6,quantity:1,items:base.map(r=>({coreItemId:prepared.find(p=>p.menuId===current.items.find(i=>i.id===r.itemId).menuItemId).coreId,quantity:r.quantity,week:1}))};
 const mixed=await previewCore360Plans({env,groups:[mixedGroup],items:[{product:{core360_item_id:family.id,core360_quantity_milli_per_unit:1000},quantity:1}],deliveryService:{coreItemId:service.id},externalOrderId:mixedId,issuedOn:qa.issuedOn,total:mixedTotal});
 const mixedOrder=await db.from('orders').insert({id:mixedId,status:'pending_payment',payment_status:'pending',subtotal_clp:price+Number(family.lineGrossMinor),total_clp:mixedTotal,currency:'CLP',customer_snapshot:{corePlanCheckout:mixed.checkout}});assert.ifError(mixedOrder.error);
 const mixedEvent=await db.from('core360_commerce_outbox').insert({order_id:mixedId,event_type:'web_order.created',idempotency_key:`qa-mixed-${mixedId}`,schema_version:2,payload:{event:'web_order.created',schemaVersion:2,order:{id:mixedId,totalClp:mixedTotal,planCheckout:mixed.checkout}}}).select('id').single();assert.ifError(mixedEvent.error);
 const mixedReserved=await deliverCore360OutboxEvent({env,supabase:db,event:{id:mixedEvent.data.id}});assert.equal(mixedReserved.accepted,true);assert.equal(String(mixedReserved.result.plan.snapshot.totalMinor),String(mixedTotal));assert.ok(mixedReserved.result.plan.snapshot.standalone.some(s=>s.itemId===service.id));
 await cancelCore360PlanCheckout({env,supabase:db,externalOrderId:mixedId});
 checked('Outbox mixto nativo conserva familiar y servicio3990 en total/IVA y Core reserva sin exigir stock de despacho');
 const beforeAckCalls=mpCalls;await assert.rejects(checkout(6,{loseAck:true}));assert.equal(mpCalls,beforeAckCalls);
 const retry=await db.from('core360_commerce_outbox').select('*').eq('status','retry').eq('event_type','web_order.created').single();assert.ifError(retry.error);assert.ok(retry.data.core_request_hash);
 const replay=await deliverCore360OutboxEvent({env,supabase:db,event:{id:retry.data.id,status:'retry'}});assert.equal(replay.accepted,true);assert.equal(replay.result.created,false);
 checked('ACK perdido después de commit no abre MP; reintento nativo reutiliza solicitud/orden sin segunda reserva');
 const beforeFailure=mpCalls;await assert.rejects(checkout(6,{failMp:true}));assert.equal(mpCalls,beforeFailure+1);
 const count=await db.from('core360_commerce_outbox').select('status').eq('event_type','web_order.cancellation_requested');assert.ifError(count.error);assert.ok(count.data.length>=2);assert.ok(count.data.every(r=>r.status==='accepted'));
 checked('Fallo de preferencia simulado encola y entrega cancelación; Core no queda retenido por el sitio');
 const forbidden=await fetch(`${qa.baseUrl}/api/commerce/v1/orders/${weekly.orderId}/plan-actions`,{method:'POST',headers:{Authorization:`Bearer ${qa.token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'deliver',externalEventId:`qa-deliver-${randomUUID()}`,expectedVersion:confirmed.version,issuedOn:qa.issuedOn,confirmed:true})});assert.equal(forbidden.status,403);
 checked('Entrega física por Bearer rechazada; sólo staff Core puede cerrar el movimiento');
 report.ok=true;report.finishedAt=new Date().toISOString();report.coreIdentity={tenantId:profiles.tenantId,companyId:profiles.companyId};report.sourceSha256=createHash('sha256').update(await readFile('server/core360-plan-contract.mjs')).digest('hex');
}catch(error){report.error={message:error.message,code:error.code||null};throw error;}
finally{
 if(store)await store.stop();globalThis.fetch=originalFetch;report.stopped=true;
 const target='R:/Entregables-Codex/Fullness/Cierre-Planes-Carta-2026-11-01';await mkdir(target,{recursive:true});await writeFile(`${target}/aceptacion-core-nativa.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({ok:report.ok,passed:report.tests.length,stopped:true,receipt:`${target}/aceptacion-core-nativa.json`}));
}
