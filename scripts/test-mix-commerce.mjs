import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createCheckoutPreference,quoteCheckout,syncMercadoPagoPayment} from '../server/mercadopago-checkout.mjs';
import {normalizeMixItem,verifiedRewardsUser,mixPaymentItems} from '../server/mix-commerce.mjs';
import {readSaleLetter} from '../server/mealprep-sale-capacity.mjs';
import {saleDigest,SALE_AUTHORITY} from '../server/mealprep-sale-capacity.mjs';
import {getDeliveryQuote,serializeDeliveryQuote} from '../src/lib/delivery-rates.js';
import {reconcileSaleCheckout} from '../server/mealprep-sale-recovery.mjs';
import {authorizeTestCheckoutSession} from '../server/mercadopago-test-checkout.mjs';
const modulePath=process.argv[process.argv.indexOf('--pglite-module')+1];
assert.ok(process.argv.includes('--pglite-module'));
const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function query(table){
 const filters=[],params=[];let cols='*',operation='select',document=null,order='',limit='';
 const param=v=>{params.push(v&&typeof v==='object'?JSON.stringify(v):v);return '$'+params.length;};
 const q={select(v='*'){cols=v;return q;},eq(k,v){filters.push(k+'='+param(v));return q;},order(k,o={}){order=' order by '+k+(o.ascending===false?' desc':' asc');return q;},limit(n){limit=' limit '+Number(n);return q;},insert(d){operation='insert';document=d;return q;},update(d){operation='update';document=d;return q;},async execute(){try{const where=filters.length?' where '+filters.join(' and '):'';let sql;
 if(operation==='select')sql=`select ${cols} from ${table}${where}${order}${limit}`;
 else if(operation==='insert'){const keys=Object.keys(document);sql=`insert into ${table}(${keys.join(',')}) values(${keys.map(k=>param(document[k])).join(',')}) returning ${cols}`;}
 else{const keys=Object.keys(document);sql=`update ${table} set ${keys.map(k=>k+'='+param(document[k])).join(',')}${where} returning ${cols}`;}
 return {data:(await db.query(sql,params)).rows,error:null};}catch(e){return {data:null,error:{message:e.message,code:e.code}};}},async maybeSingle(){const r=await q.execute();return {data:r.data?.[0]||null,error:r.error};},single(){return q.maybeSingle();},then(a,b){return q.execute().then(a,b);}};
 q.gt=(k,v)=>{filters.push(k+'>'+param(v));return q;};q.is=(k,v)=>{assert.equal(v,null);filters.push(k+' is null');return q;};return q;
}
const supabase={from:query,auth:{async getUser(token){return token==='verified-fixture'?{data:{user:{id:id(90),email_confirmed_at:'2026-01-01T00:00:00Z'}}}:{data:null,error:{message:'Invalid fixture token'}};}},async rpc(name,a){try{
 let sql,args;
 if(name==='quote_fullness_mix_rewards'){sql='select quote_fullness_mix_rewards($1::uuid,$2::integer,$3::bigint,$4::uuid) result';args=[a.p_user,a.p_units,a.p_subtotal,a.p_key];}
 else if(name==='prepare_mealprep_sale_checkout'){sql='select prepare_mealprep_sale_checkout($1::uuid,$2::text,$3::jsonb,$4::jsonb) result';args=[a.p_key,a.p_fingerprint,JSON.stringify(a.p_order),JSON.stringify(a.p_lines)];}
 else{assert.equal(name,'transition_mealprep_sale_checkout');sql='select transition_mealprep_sale_checkout($1::uuid,$2::text,$3::integer,$4::jsonb) result';args=[a.p_key,a.p_action,a.p_revision,JSON.stringify(a.p_document)];}
 return{data:(await db.query(sql,args)).rows[0].result,error:null};
 }catch(e){console.error('Synthetic SQL:',e.message);return{data:null,error:{message:e.message,code:e.code}};}}};
try{
 await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create table profiles(id uuid primary key,is_admin boolean);
 create table meal_library_items(id uuid primary key default gen_random_uuid(),name text not null,tag text,description text not null default '',photo_url text,photo_storage_path text,secondary_photo_url text,secondary_photo_storage_path text,benefit_tags text[] not null default '{}',ingredients text[] not null default '{}',nutrition_description text,nutrition_highlights text[] not null default '{}',nutrition_facts jsonb not null default '{}',allergens text[] not null default '{}',is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),benefit_assignments jsonb not null default '[]',tag_ids uuid[] not null default '{}',rethermalization_instructions text not null default '');
 create table menu_items(id uuid primary key,slug text not null,sku text,name text not null,tag text,description text not null,photo_url text,photo_storage_path text,secondary_photo_url text,secondary_photo_storage_path text,price_clp bigint not null default 0,currency text default 'CLP',ingredients text[] default '{}',nutrition_description text,nutrition_facts jsonb default '{}',nutrition_highlights text[] default '{}',benefit_tags text[] default '{}',benefit_assignments jsonb default '[]',tag_ids uuid[] default '{}',allergens text[] default '{}',metadata jsonb default '{}',display_order integer default 0,updated_at timestamptz default now(),is_active boolean,product_type text,plan_frequency text,serving_label text,purchase_label text,library_meal_id uuid references meal_library_items(id),constraint menu_items_product_type_allowed check(product_type in ('plan','family')),constraint menu_items_product_type_frequency_consistency check((product_type='family' and plan_frequency is null) or(product_type='plan' and plan_frequency in('weekly','monthly'))));
 create table orders(id uuid primary key,checkout_mode text,client_id uuid,status text,payment_status text,delivery_status text,subtotal_clp bigint,discount_clp bigint,delivery_fee_clp bigint,total_clp bigint,currency text,note text,customer_snapshot jsonb,mercadopago_preference_id text,mercadopago_external_reference text,ordered_at timestamptz default now(),created_at timestamptz default now(),paid_at timestamptz);
 create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid references orders(id),product_id uuid references menu_items(id),quantity integer,unit_price_clp bigint,total_clp bigint,product_name text,product_snapshot jsonb,ingredients text[],nutrition_description text);
 create table core360_product_mappings(id uuid primary key,source_menu_item_id uuid,core_item_id uuid,is_active boolean);
 create table core360_catalog_projection(source_menu_item_id uuid,core_item_id uuid,price_available boolean,core_item_available boolean,uom_compatible boolean,factor_compatible boolean,currency text,gross_minor bigint);
 create table payments(id uuid primary key default gen_random_uuid(),checkout_mode text,order_id uuid,provider text,provider_payment_id text,provider_preference_id text,provider_merchant_order_id text,status text,status_detail text,payment_method_id text,payment_type_id text,installments integer,transaction_amount_clp bigint,currency text,payer_email text,raw_payload jsonb,paid_at timestamptz);
 grant usage on schema public to service_role,authenticated;grant all on all tables in schema public to service_role;
 `);
 for(const file of ['20261031151351_stock_letter_custom_plans.sql','20261031154839_custom_plan_six_twentyfour_max_two.sql','20261103011537_mealprep_sales_capacity.sql','20261103230247_active_only_mealpreps.sql','20261104001527_library_is_plan_source.sql','20261104172613_fullness_mix_rewards.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 await db.exec("update custom_plan_settings set enabled=true,stock_authority='fullness_sale_capacity_v1'");
 await db.query("insert into meal_library_items(id,name,description,ingredients,nutrition_facts,photo_url,secondary_photo_url,allergens,sale_price_clp,available_for_plans,sale_category) values($1,'Pollo fixture','Original',array['Zanahoria'],'{\"protein_g\":20}','/bag.webp','/plate.webp',array['Almendras'],9800,true,'Pollo')",[id(1)]);
 await db.query("insert into menu_items(id,slug,name,description,price_clp,is_active,product_type) values($1,'familiar-fixture','Familiar fixture','Original family',18800,true,'family')",[id(2)]);
 const libraryBefore=(await db.query('select * from meal_library_items')).rows,capacityBefore=(await db.query('select * from mealprep_sale_capacity')).rows;
 const catalog=await readSaleLetter({supabase});assert.equal(catalog.items.length,1);assert.equal(catalog.items[0].saleCategory,'Pollo'); // no active stock letter required
 assert.deepEqual(normalizeMixItem({libraryMealId:id(1),quantity:1}),{kind:'mealprep',libraryMealId:id(1),quantity:1});
 assert.throws(()=>normalizeMixItem({libraryMealId:id(1),quantity:1.5}));assert.throws(()=>normalizeMixItem({libraryMealId:id(1),quantity:1001}));
 assert.equal(await verifiedRewardsUser(supabase,{headers:{authorization:'Bearer verified-fixture'}}),id(90));assert.equal(await verifiedRewardsUser(supabase,{headers:{}}),null);
 await assert.rejects(verifiedRewardsUser(supabase,{headers:{authorization:'Bearer forged'}}),/Verifica/);
 let gatewayCreates=0,loseResponse=false;const preferences=new Map();let payment;
 const gateway=async(path,options={})=>{if(path==='/checkout/preferences'){gatewayCreates++;const p={...options.body,id:'mix-fixture-'+gatewayCreates,init_point:'https://www.mercadopago.cl/fixture'};preferences.set(p.id,p);if(loseResponse){loseResponse=false;throw Error('Synthetic lost response');}return p;}if(path.startsWith('/checkout/preferences/search')){const ref=new URL('https://fixture.invalid'+path).searchParams.get('external_reference');return{elements:[...preferences.values()].filter(p=>p.external_reference===ref)};}if(path.startsWith('/checkout/preferences/'))return preferences.get(path.split('/').pop());if(path.startsWith('/v1/payments/search'))return{results:[],paging:{total:0}};if(path.startsWith('/v1/payments/'))return payment;throw Error('Unexpected synthetic gateway '+path);};
 const deps={supabase,env:{},mercadoPagoRequest:gateway,sendApprovedOrderEmails:async()=>({customer:{sent:true},operations:{sent:true}})};
 const base={cart:[{kind:'mealprep',libraryMealId:id(1),quantity:1}],fulfillment:{mode:'pickup',name:'Fixture',email:'fixture@example.invalid',phone:'+56912345678'},request:{headers:{host:'www.fullnesslab.com','x-forwarded-proto':'https'}},dependencies:deps};
 const quote=async(cart,extra={})=>quoteCheckout({...base,cart,...extra});
 for(const [q,subtotal,discount] of [[1,9800,0],[6,58800,0],[23,225400,0],[24,235200,23520],[25,245000,24500]]){const r=await quote([{...base.cart[0],quantity:q}]);assert.equal(r.subtotal,subtotal);assert.equal(r.discount,discount);assert.equal(r.amount,subtotal-discount);}
 const mixed=[{...base.cart[0],quantity:24},{slug:'familiar-fixture',quantity:1}];
 let r=await quote(mixed);assert.equal(r.amount,230480);assert.equal(r.discount,23520);
 assert.equal((await quote([{...base.cart[0],quantity:23},{slug:'familiar-fixture',quantity:1}])).discount,0);
 for(const comuna of ['Lo Barnechea','Las Condes','Vitacura','Providencia']){r=await quote(base.cart,{fulfillment:{...base.fulfillment,mode:'delivery',address:'Calle Fixture 123',comuna}});assert.equal(r.amount,9800);assert.equal(r.deliveryFee,0);}
 const purchase=await createCheckoutPreference({...base,cart:mixed,checkoutKey:id(100),expectedAmount:230480});assert.equal(purchase.amount,230480);assert.equal(purchase.discount,23520);assert.equal(gatewayCreates,1);
 const paidPref=preferences.get(purchase.preferenceId);assert.equal(paidPref.items.reduce((n,i)=>n+i.unit_price*i.quantity,0),230480);assert.equal(paidPref.items.find(i=>i.id===id(2)).unit_price,18800);assert.ok(!paidPref.shipments);
 const saved=(await db.query('select * from orders where id=$1',[purchase.orderId])).rows[0];assert.equal(Number(saved.discount_clp),23520);assert.equal(saved.customer_snapshot.purchaseModel,'mix_v1');
 assert.equal((await createCheckoutPreference({...base,cart:mixed,checkoutKey:id(100),expectedAmount:230480})).preferenceId,purchase.preferenceId);assert.equal(gatewayCreates,1);
 await assert.rejects(createCheckoutPreference({...base,cart:mixed,checkoutKey:id(100),expectedAmount:1}),/compra cambió/i);
 loseResponse=true;await assert.rejects(createCheckoutPreference({...base,checkoutKey:id(101),expectedAmount:9800}),/comprobar el enlace/);assert.equal(gatewayCreates,2);
 const recovered=await createCheckoutPreference({...base,checkoutKey:id(101),expectedAmount:9800});assert.equal(gatewayCreates,2);assert.ok(recovered.initPoint);
 const attempt=(await db.query('select * from mealprep_sale_checkouts where checkout_key=$1',[id(101)])).rows[0];
 assert.equal((await reconcileSaleCheckout({attempt,supabase,gateway,syncPayment:async()=>{},profile:{mode:'live'},now:new Date(Date.now()+31*60000)})).status,'released');
 payment={id:'123456789',external_reference:purchase.orderId,live_mode:true,status:'approved',transaction_amount:230480,currency_id:'CLP',date_approved:new Date().toISOString()};
 const confirmed=await syncMercadoPagoPayment(payment.id,purchase.orderId,deps);assert.equal(confirmed.purchaseModel,'mix_v1');assert.equal(confirmed.fulfillmentMode,'pickup');await syncMercadoPagoPayment(payment.id,purchase.orderId,deps);
 assert.deepEqual((await db.query('select * from meal_library_items')).rows,libraryBefore);assert.deepEqual((await db.query('select * from mealprep_sale_capacity')).rows,capacityBefore);
 // Integer CLP discounts preserve exact totals even for a custom odd-number price.
 const rows=[{product_id:id(1),product_name:'Odd price',quantity:3,unit_price_clp:9801,product_snapshot:{purchaseModel:'mix_v1',productType:'mealprep'}},{product_id:id(2),product_name:'Family',quantity:1,unit_price_clp:18800,product_snapshot:{purchaseModel:'mix_v1',productType:'family'}}];
 const discounted=mixPaymentItems(rows,2940);assert.equal(discounted.reduce((n,i)=>n+i.quantity*i.unit_price,0),45263);assert.ok(discounted.every(i=>Number.isInteger(i.unit_price)));assert.equal(discounted.find(i=>i.id===id(2)).unit_price,18800);
 // Freeze only the test database's clock expression; production always uses DB now().
 const fn=(await db.query("select pg_get_functiondef('quote_fullness_mix_rewards(uuid,integer,bigint,uuid)'::regprocedure) d")).rows[0].d;
 const freeze=async(when)=>db.exec(fn.replace("(now() at time zone 'America/Santiago')",`timestamp '${when}'`));
 await freeze('2026-11-25 12:00:00');
 const seed=async(n,date,units,status='approved',user=id(90))=>db.query("insert into orders(id,checkout_mode,status,payment_status,paid_at,rewards_user_id,rewards_eligible_units,total_clp) values($1,'live','confirmed',$2,$3,$4,$5,9800)",[id(n),status,date,user,units]);
 await seed(200,'2026-11-03T13:00:00Z',2);await seed(201,'2026-11-04T13:00:00Z',4);
 await seed(202,'2026-11-10T13:00:00Z',3);await seed(203,'2026-11-11T13:00:00Z',3);
 await seed(204,'2026-11-17T13:00:00Z',6);await seed(205,'2026-11-24T13:00:00Z',4);
 const request={headers:{...base.request.headers,authorization:'Bearer verified-fixture'}};
 r=await quote(base.cart,{request});assert.equal(r.rewards.completedWeeks,3);assert.equal(r.rewards.currentWeekUnits,4);assert.equal(r.discount,0);
 r=await quote([{...base.cart[0],quantity:2}],{request});assert.equal(r.rewards.rate,35);assert.equal(r.discount,6860);assert.equal(r.amount,12740);
 r=await quote([{...base.cart[0],quantity:24}],{request});assert.equal(r.rewards.rate,35);assert.equal(r.discount,82320);assert.equal(r.amount,152880);
 r=await quote([{...base.cart[0],quantity:24},{slug:'familiar-fixture',quantity:1}],{request});assert.equal(r.discount,82320);assert.equal(r.amount,171680);
 await seed(207,'2026-11-24T14:00:00Z',1);r=await quote(base.cart,{request});assert.equal(r.rewards.currentWeekUnits,5);assert.equal(r.rewards.rate,35);assert.equal(r.amount,6370);await db.query('delete from orders where id=$1',[id(207)]);
 // Logged-in person gets their own weeks only, never the fulfillment email's history.
 assert.equal((await quote([{...base.cart[0],quantity:2}])).discount,0);
 await db.query("update orders set payment_status='refunded' where id=$1",[id(203)]);assert.equal((await quote([{...base.cart[0],quantity:2}],{request})).discount,0);
 await db.query("update orders set payment_status='approved' where id=$1",[id(203)]);
 await freeze('2026-12-02 12:00:00');r=await quote([{...base.cart[0],quantity:6}],{request});assert.equal(r.rewards.completedWeeks,0);assert.equal(r.discount,0);
 await freeze('2026-11-25 12:00:00');
 // Competing attempts can observe a quote, but only one locked prepare can claim the weekly benefit.
 const weeklyBase={...base,request,cart:[{...base.cart[0],quantity:2}],expectedAmount:12740};
 const results=await Promise.allSettled([createCheckoutPreference({...weeklyBase,checkoutKey:id(300)}),createCheckoutPreference({...weeklyBase,checkoutKey:id(301)})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
 assert.equal((await db.query("select count(*) n from orders where rewards_kind='weekly'")).rows[0].n,1);
 r=await quote([{...base.cart[0],quantity:2}],{request});assert.equal(r.discount,0);
 const weeklyOrder=results.find(r=>r.status==='fulfilled').value;
 await db.query("update orders set payment_status='approved',paid_at='2026-11-25T15:00:00Z' where id=$1",[weeklyOrder.orderId]);
 r=await quote([{...base.cart[0],quantity:6}],{request});assert.equal(r.rewards.completedWeeks,4);assert.equal(r.discount,0);
 // Historical grouped carts keep their exact validation and settlement model after migration.
 for(let n=3;n<=7;n++)await db.query("insert into meal_library_items(id,name,sale_price_clp,available_for_plans) values($1,$2,9800,true)",[id(n),'Legacy fixture '+n]);
 await db.exec("update stock_letters set state='active',starts_on=current_date-30,ends_on=current_date-1");
 const legacyCatalog=await readSaleLetter({supabase});
 const legacyCart=[{kind:'custom_plan',letterId:legacyCatalog.letter.id,revision:legacyCatalog.letter.revision,size:6,quantity:1,selection:legacyCatalog.items.map(i=>({itemId:i.id,week:1,quantity:1}))}];
 const legacy=await createCheckoutPreference({...base,cart:legacyCart,checkoutKey:id(400),expectedAmount:58800});assert.equal(legacy.amount,58800);assert.equal(legacy.discount,0);
 assert.equal((await db.query('select count(*) n from order_custom_plans where order_id=$1',[legacy.orderId])).rows[0].n,1);
 // A family checkout key created before the model change preserves its old fee.
 const oldFulfillment={...base.fulfillment,mode:'delivery',address:'Calle Fixture 123',comuna:'Lo Barnechea'};
 const oldCustomer={checkoutMode:'live',...oldFulfillment,instructions:'',testSessionId:null,deliveryQuote:serializeDeliveryQuote(getDeliveryQuote(oldFulfillment)),operationalAuthority:'fullness',stockAuthority:SALE_AUTHORITY};
 const oldCart=[{slug:'familiar-fixture',quantity:1}],oldExpected=22790;
 const preparedOld=await supabase.rpc('prepare_mealprep_sale_checkout',{p_key:id(401),p_fingerprint:saleDigest({cart:oldCart,customer:oldCustomer,expectedAmount:oldExpected,mode:'live'}),p_order:{id:id(402),checkout_mode:'live',subtotal_clp:18800,discount_clp:0,delivery_fee_clp:3990,total_clp:oldExpected,currency:'CLP',customer_snapshot:oldCustomer},p_lines:[{product_id:id(2),quantity:1,unit_price_clp:18800,total_clp:18800,product_name:'Familiar fixture',product_snapshot:{},ingredients:[]}]});assert.equal(preparedOld.error,null);
 const oldResumed=await createCheckoutPreference({...base,cart:oldCart,fulfillment:oldFulfillment,checkoutKey:id(401),expectedAmount:oldExpected});assert.equal(oldResumed.orderId,id(402));assert.equal(oldResumed.amount,oldExpected);assert.equal(oldResumed.deliveryFee,3990);
 // Client roles cannot ask private history questions or prepare discounted orders directly.
 await db.exec('set role authenticated');await assert.rejects(db.query('select quote_fullness_mix_rewards($1,6,58800,null)',[id(90)]),/permission denied/);await db.exec('reset role');
 // Private TEST uses the real mix preparation, original triggers, and settlement.
 await db.exec('create table checkout_test_sessions(id uuid primary key,authorization_digest text,merchant_id text,verification jsonb,authorized_at timestamptz,expires_at timestamptz,consumed_at timestamptz,order_id uuid,preference_id text,provider_payment_id text)');
 const testEnv={MERCADOPAGO_TEST_ACCESS_TOKEN:'synthetic-only',MERCADOPAGO_TEST_PUBLIC_KEY:'synthetic-public',MERCADOPAGO_TEST_USER_ID:'synthetic-merchant',MERCADOPAGO_TEST_WEBHOOK_SECRET:'synthetic-secret'};
 const testSession=await authorizeTestCheckoutSession({ownerUserId:id(90),supabase,env:testEnv,fetchImpl:async()=>new Response(JSON.stringify({id:'synthetic-merchant',site_id:'MLC',tags:['test_user']}))});
 const sessionId=testSession.testSessionToken.split('.')[0];assert.equal((await db.query('select id from checkout_test_sessions')).rows[0].id,sessionId,'Authorization ID must be the persisted primary key');
 let testCreates=0,testMails=0;
 const privateDeps={...deps,env:testEnv,assertOwnerBackofficeRequest:async()=>({user:{id:id(90)}}),resolveMercadoPagoProfile:async()=>({mode:'test',merchantId:'synthetic-merchant',webhookSecret:'synthetic-secret'}),mercadoPagoRequest:async(path,options)=>{
  assert.equal(options.profile.mode,'test');
  if(path==='/checkout/preferences'){testCreates++;assert.match(options.body.notification_url,/\/test-webhook$/);assert.equal(options.body.metadata.checkout_mode,'test');assert.equal(options.body.payer.email,base.fulfillment.email);return{...options.body,id:'private-test-'+testCreates,collector_id:'synthetic-merchant',init_point:'https://www.mercadopago.cl/fixture-test'};}
  return gateway(path,options);
 },sendApprovedOrderEmails:async()=>{testMails++;throw Error('TEST may not send mail');}};
 const privateBase={...base,request,cart:[{kind:'mealprep',libraryMealId:id(1),quantity:24},{slug:'familiar-fixture',quantity:1}],testSessionToken:testSession.testSessionToken,checkoutKey:id(800),expectedAmount:230480,dependencies:privateDeps};
 await assert.rejects(createCheckoutPreference({...privateBase,dependencies:{...privateDeps,assertOwnerBackofficeRequest:async()=>{throw Object.assign(Error('Denied'),{statusCode:403});}}}),/Denied/);
 const privateOrder=await createCheckoutPreference(privateBase);assert.equal(privateOrder.testMode,true);assert.equal(privateOrder.amount,230480);assert.equal(testCreates,1);
 const privateSaved=(await db.query('select * from orders where id=$1',[privateOrder.orderId])).rows[0];assert.equal(privateSaved.checkout_mode,'test');assert.equal(privateSaved.rewards_kind,'volume');assert.equal(privateSaved.customer_snapshot.testSessionId,sessionId);
 assert.equal((await createCheckoutPreference(privateBase)).orderId,privateOrder.orderId);assert.equal(testCreates,1,'TEST retry must not create a second preference');
 await assert.rejects(createCheckoutPreference({...privateBase,checkoutKey:id(801)}),/ya fue utilizado/);
 await assert.rejects(createCheckoutPreference({...privateBase,dependencies:{...privateDeps,assertOwnerBackofficeRequest:async()=>({user:{id:id(91)}})}}),/esta cuenta/);
 payment={id:'123456790',external_reference:privateOrder.orderId,live_mode:false,collector_id:'synthetic-merchant',status:'approved',transaction_amount:230480,currency_id:'CLP',date_approved:new Date().toISOString()};
 const testSync=await syncMercadoPagoPayment(payment.id,privateOrder.orderId,{...privateDeps,checkoutMode:'test',mercadoPagoRequest:async()=>payment,paymentProfile:{mode:'test',merchantId:'synthetic-merchant'}});
 assert.equal(testSync.testMode,true);assert.equal(testMails,0);assert.equal((await db.query("select count(*) n from orders where checkout_mode='live' and id=$1",[privateOrder.orderId])).rows[0].n,0);
 assert.deepEqual((await db.query('select * from mealprep_sale_capacity')).rows,capacityBefore);
 console.log('PASS private TEST mix/family/24 discount, owner binding, persisted token ID, identical retry, wrong-owner/new-key denial, test payment settlement, no mails and unchanged capacity. Synthetic provider only.');
 await db.query("update checkout_test_sessions set expires_at=now()-interval '1 minute' where id=$1",[sessionId]);
 await assert.rejects(createCheckoutPreference(privateBase),e=>e.code==='TEST_SESSION_INVALID');assert.equal(testCreates,1);
 console.log('PASS mix 1/6/23/24/25, mixed family exclusion, separate delivery, authoritative SQL totals, integer MP prices, verified identity, paid weekly accumulation, refunds/month reset, concurrent one-time benefit, replay/recovery/payment and unchanged library/inventory. Synthetic only.');
}finally{await db.close();}
