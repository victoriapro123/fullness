import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {readSaleLetter,resolveSaleCart} from '../server/mealprep-sale-capacity.mjs';
import {createCheckoutPreference,syncMercadoPagoPayment} from '../server/mercadopago-checkout.mjs';
import {reconcileSaleCheckout} from '../server/mealprep-sale-recovery.mjs';
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
 return {data:(await db.query(sql,params)).rows,error:null};}catch(e){return {data:null,error:{message:e.message,code:e.code}};}},async maybeSingle(){const r=await q.execute();return {data:r.data?.[0]||null,error:r.error};},single(){return q.maybeSingle();},then(a,b){return q.execute().then(a,b);}};return q;
}
const supabase={from:query,async rpc(name,a){try{const prepare=name==='prepare_mealprep_sale_checkout';const args=prepare?[a.p_key,a.p_fingerprint,JSON.stringify(a.p_order),JSON.stringify(a.p_lines)]:[a.p_key,a.p_action,a.p_revision,JSON.stringify(a.p_document)];return {data:(await db.query(prepare?'select prepare_mealprep_sale_checkout($1,$2,$3::jsonb,$4::jsonb) result':'select transition_mealprep_sale_checkout($1,$2,$3,$4::jsonb) result',args)).rows[0].result,error:null};}catch(e){console.error('Synthetic SQL:',e.message);return {data:null,error:{message:e.message,code:e.code}};}}};
try{
 await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create table profiles(id uuid primary key,is_admin boolean);insert into profiles values('${id(1)}',true);
 create table meal_library_items(id uuid primary key default gen_random_uuid(),name text not null,tag text,description text not null default '',photo_url text,photo_storage_path text,secondary_photo_url text,secondary_photo_storage_path text,benefit_tags text[] not null default '{}',ingredients text[] not null default '{}',nutrition_description text,nutrition_highlights text[] not null default '{}',nutrition_facts jsonb not null default '{}',allergens text[] not null default '{}',is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),benefit_assignments jsonb not null default '[]',tag_ids uuid[] not null default '{}',rethermalization_instructions text not null default '');
 create table menu_items(id uuid primary key,slug text not null,sku text,name text not null,tag text,description text not null,photo_url text,photo_storage_path text,secondary_photo_url text,secondary_photo_storage_path text,price_clp bigint not null default 0,currency text default 'CLP',ingredients text[] default '{}',nutrition_description text,nutrition_facts jsonb default '{}',nutrition_highlights text[] default '{}',benefit_tags text[] default '{}',benefit_assignments jsonb default '[]',tag_ids uuid[] default '{}',allergens text[] default '{}',metadata jsonb default '{}',display_order integer default 0,updated_at timestamptz default now(),is_active boolean,product_type text,plan_frequency text,serving_label text,purchase_label text,library_meal_id uuid references meal_library_items(id),constraint menu_items_product_type_allowed check(product_type in ('plan','family')),constraint menu_items_product_type_frequency_consistency check((product_type='family' and plan_frequency is null) or(product_type='plan' and plan_frequency in('weekly','monthly'))));
 create table orders(id uuid primary key,checkout_mode text,client_id uuid,status text,payment_status text,delivery_status text,subtotal_clp bigint,discount_clp bigint,delivery_fee_clp bigint,total_clp bigint,currency text,note text,customer_snapshot jsonb,mercadopago_preference_id text,mercadopago_external_reference text,ordered_at timestamptz default now(),created_at timestamptz default now(),paid_at timestamptz);
 create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid references orders(id),product_id uuid references menu_items(id),quantity integer,unit_price_clp bigint,total_clp bigint,product_name text,product_snapshot jsonb,ingredients text[],nutrition_description text);
 create table core360_product_mappings(id uuid primary key,source_menu_item_id uuid,core_item_id uuid,is_active boolean);
 create table core360_catalog_projection(source_menu_item_id uuid,core_item_id uuid,price_available boolean,core_item_available boolean,uom_compatible boolean,factor_compatible boolean,currency text,gross_minor bigint);
 create table payments(id uuid primary key default gen_random_uuid(),checkout_mode text,order_id uuid,provider text,provider_payment_id text,provider_preference_id text,provider_merchant_order_id text,status text,status_detail text,payment_method_id text,payment_type_id text,installments integer,transaction_amount_clp bigint,currency text,payer_email text,raw_payload jsonb,paid_at timestamptz);
 grant usage on schema public to service_role,authenticated;grant all on all tables in schema public to service_role;
 `);
 for(const file of ['20261031151351_stock_letter_custom_plans.sql','20261031154839_custom_plan_six_twentyfour_max_two.sql','20261103011537_mealprep_sales_capacity.sql','20261103230247_active_only_mealpreps.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 const letter=(await db.query('select * from stock_letters')).rows[0];
 await db.exec("update stock_letters set state='active',starts_on=current_date-30,ends_on=current_date-1;update custom_plan_settings set enabled=true,stock_authority='fullness_sale_capacity_v1'");
 for(let n=1;n<=7;n++){
  await db.query("insert into meal_library_items(id,name,description,ingredients,nutrition_facts,photo_url,allergens,rethermalization_instructions) values($1,$2,'Original description',array['Zanahoria'],'{\"protein_g\":20}', '/original-photo.webp',array['Almendras'],'Baño María')",[id(n),'Original '+n]);
  if(n<=6){await db.query("insert into menu_items(id,slug,name,description,price_clp,is_active,product_type,library_meal_id) values($1,$2,'Old copied name','Old copied description',8900,true,'mealprep',$3)",[id(n+10),'old-'+n,id(n)]);await db.query('update stock_letter_items set menu_item_id=$1 where letter_id=$2 and position=$3',[id(n+10),letter.id,n]);await db.query('select save_mealprep_sale_capacity($1,0,true,0,$2,$3)',[id(n+10),id(n+100),id(1)]);}
 }
 await db.query("insert into menu_items(id,slug,name,description,price_clp,is_active,product_type) values($1,'unlinked','Not a library meal','Keep for history',9800,true,'mealprep')",[id(99)]);
 await db.query('update mealprep_sale_capacity set quantity=2,reserved_quantity=1 where menu_item_id=$1',[id(11)]);
 await db.query("insert into orders(id,payment_status,total_clp,customer_snapshot) values($1,'pending',8900,'{\"stockAuthority\":\"fullness_sale_capacity_v1\"}')",[id(800)]);
 await db.query("insert into mealprep_sale_checkouts(checkout_key,order_id,fingerprint,quantities) values($1,$2,$3,$4::jsonb)",[id(801),id(800),'a'.repeat(64),JSON.stringify({[id(11)]:1})]);
 const original=(await db.query('select * from meal_library_items order by id')).rows;
 const capacities=(await db.query('select * from mealprep_sale_capacity order by menu_item_id')).rows;
 await db.exec(await readFile('supabase/migrations/20261104001527_library_is_plan_source.sql','utf8'));
 let after=(await db.query('select * from meal_library_items order by id')).rows;
 for(const [i,row] of original.entries())for(const key of Object.keys(row))assert.deepEqual(after[i][key],row[key],key);
 assert.equal(after.length,7);assert.equal(after.filter(l=>l.available_for_plans).length,6);
 assert.deepEqual((await db.query('select * from mealprep_sale_capacity order by menu_item_id')).rows,capacities);
 let catalog=await readSaleLetter({supabase});assert.equal(catalog.items.length,6);assert.ok(catalog.items.every(i=>i.title.startsWith('Original')&&i.nutritionFacts.protein_g===20&&i.photoUrl==='/original-photo.webp'));assert.ok(!catalog.items.some(i=>i.menuItemId===id(99)));
 const plan={kind:'custom_plan',letterId:letter.id,revision:letter.revision,size:6,quantity:1,selection:catalog.items.map(i=>({itemId:i.id,week:1,quantity:1}))};
 const resolved=await resolveSaleCart([plan],{supabase});assert.equal(resolved.lines.reduce((n,l)=>n+l.total,0),53400);assert.equal(resolved.lines[0].product.nutrition_facts.protein_g,20);
 await db.query("update meal_library_items set sale_price_clp=9800,description='Edited in library' where id=$1",[id(1)]);
 catalog=await readSaleLetter({supabase});assert.equal(catalog.items.find(i=>i.libraryMealId===id(1)).priceClp,9800);assert.equal((await db.query('select description from menu_items where id=$1',[id(11)])).rows[0].description,'Edited in library');
 await db.query('update meal_library_items set available_for_plans=false where id=$1',[id(1)]);
 assert.equal((await readSaleLetter({supabase})).items.length,5);await assert.rejects(resolveSaleCart([plan],{supabase}),/no está disponible/);
 await db.query('update meal_library_items set available_for_plans=true where id=$1',[id(1)]);
 await assert.rejects(db.query('update meal_library_items set available_for_plans=true where id=$1',[id(7)]),/precio/);
 await db.query('update meal_library_items set sale_price_clp=8900,available_for_plans=true where id=$1',[id(7)]);
 assert.equal((await readSaleLetter({supabase})).items.length,7);assert.equal((await db.query('select count(*) n from stock_letter_items')).rows[0].n,15);
 await assert.rejects(db.query('update meal_library_items set sale_menu_item_id=$1 where id=$2',[id(99),id(7)]),/identidad/);
 // Same privileges as production: no SECURITY DEFINER or permission expansion.
 await db.exec(`create function is_admin() returns boolean language sql as $$select current_setting('request.jwt.claim.role',true)='owner'$$;alter table meal_library_items enable row level security;alter table menu_items enable row level security;create policy library_admin on meal_library_items for all to authenticated using(is_admin()) with check(is_admin());create policy menu_admin on menu_items for all to authenticated using(is_admin()) with check(is_admin());grant select,insert,update on meal_library_items,menu_items to authenticated;set request.jwt.claim.role='owner';set role authenticated;`);
 await db.query("update meal_library_items set description='Owner saved' where id=$1",[id(1)]);
 await db.exec("set request.jwt.claim.role='customer'");assert.equal((await db.query('update meal_library_items set available_for_plans=false returning id')).rows.length,0);await db.exec('reset role');
 let gatewayCreates=0,loseResponse=false;const preferences=new Map();let payment,paymentResults=[];
 const gateway=async(path,options={})=>{if(path==='/checkout/preferences'){gatewayCreates++;const p={...options.body,id:'test-pref-'+gatewayCreates,init_point:'https://www.mercadopago.cl/fixture'};preferences.set(p.id,p);if(loseResponse){loseResponse=false;throw Error('Synthetic lost response');}return p;}if(path.startsWith('/checkout/preferences/search')){const ref=new URL('https://fixture.invalid'+path).searchParams.get('external_reference');return {elements:[...preferences.values()].filter(p=>p.external_reference===ref)};}if(path.startsWith('/checkout/preferences/'))return preferences.get(path.split('/').pop());if(path.startsWith('/v1/payments/search'))return {results:paymentResults,paging:{total:paymentResults.length}};if(path.startsWith('/v1/payments/'))return payment;throw Error('Unexpected synthetic gateway '+path);};
 const deps={supabase,env:{},mercadoPagoRequest:gateway,sendApprovedOrderEmails:async()=>({customer:{sent:true},operations:{sent:true}})};
 const base={cart:[plan],fulfillment:{mode:'pickup',name:'Fixture',email:'fixture@example.invalid',phone:'+56912345678'},request:{headers:{host:'www.fullnesslab.com','x-forwarded-proto':'https'}},expectedAmount:54300,dependencies:deps,checkoutKey:id(500)};
 assert.equal((await createCheckoutPreference({...base,dependencies:{...deps,quoteOnly:true}})).amount,54300);assert.equal(gatewayCreates,0);
 const purchase=await createCheckoutPreference(base);assert.equal(purchase.amount,54300);assert.equal(gatewayCreates,1);assert.equal((await createCheckoutPreference(base)).preferenceId,purchase.preferenceId);assert.equal(gatewayCreates,1);
 loseResponse=true;await assert.rejects(createCheckoutPreference({...base,checkoutKey:id(502)}),/comprobar el enlace/);
 const recovered=await createCheckoutPreference({...base,checkoutKey:id(502)});assert.ok(recovered.initPoint);assert.equal(gatewayCreates,2);
 const attempt=(await db.query('select * from mealprep_sale_checkouts where checkout_key=$1',[id(502)])).rows[0];
 assert.equal((await reconcileSaleCheckout({attempt,supabase,gateway,syncPayment:async()=>{},profile:{mode:'live'},now:new Date(Date.now()+31*60000)})).status,'released');
 assert.deepEqual((await db.query('select quantities from mealprep_sale_checkouts where checkout_key=$1',[id(500)])).rows[0].quantities,{});
 payment={id:'123456789',external_reference:purchase.orderId,live_mode:true,status:'approved',transaction_amount:54300,currency_id:'CLP',date_approved:new Date().toISOString()};
 assert.equal((await syncMercadoPagoPayment(payment.id,purchase.orderId,deps)).status,'approved');await syncMercadoPagoPayment(payment.id,purchase.orderId,deps);
 assert.deepEqual((await db.query('select * from mealprep_sale_capacity order by menu_item_id')).rows,capacities);
 await db.query("update orders set payment_status='approved' where id=$1",[id(800)]);
 await db.query("update orders set payment_status='approved' where id=$1",[id(800)]);
 const oldCap=(await db.query('select * from mealprep_sale_capacity where menu_item_id=$1',[id(11)])).rows[0];assert.equal(oldCap.quantity,1);assert.equal(oldCap.reserved_quantity,0);
 await db.query('update meal_library_items set available_for_plans=false where id=$1',[id(2)]);await assert.rejects(createCheckoutPreference({...base,checkoutKey:id(501)}),/no está disponible/);
 const fn=(await db.query("select pg_get_functiondef('prepare_mealprep_sale_checkout(uuid,text,jsonb,jsonb)'::regprocedure) d")).rows[0].d;assert.match(fn,/lr\.available_for_plans/);assert.doesNotMatch(fn,/not cap.published/);
 console.log('PASS original library preserved; one-source price/photo/nutrition/availability; automatic new offers; owner RLS; quote/checkout/payment/replay/lost-response/recovery; old pending settlement preserved; new orders never change stock. Synthetic only.');
}finally{await db.close();}
