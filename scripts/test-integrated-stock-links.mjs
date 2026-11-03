import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {generateKeyPairSync,sign,verify} from 'node:crypto';
import {createStockLinksService,readDirectMealprepStock} from '../server/integrated-stock-links.mjs';
import {LINK_TYPES,callLinks} from '../server/integrated-stock-links-crypto.mjs';
import {validateIntegrationConfig,digest} from '../server/integrated-stock-crypto.mjs';
import {stable} from '../server/stock-handoff-crypto.mjs';
const modulePath=process.argv[process.argv.indexOf('--pglite-module')+1];assert.ok(process.argv.includes('--pglite-module'));
const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,user={id:id(1)},recipe=id(2),item=id(3),location=id(4),balance=id(5),other=id(6);
const keys={},peer={};for(const role of Object.keys(LINK_TYPES)){const k=generateKeyPairSync('ed25519');keys[role]={kid:'qa-links-'+role,typ:LINK_TYPES[role],environment:'qa',publicKey:k.publicKey.export({type:'spki',format:'pem'}),privateKey:k.privateKey.export({type:'pkcs8',format:'pem'})};const{privateKey,...p}=keys[role];peer[role]=p;}
const config=validateIntegrationConfig({version:1,environment:'qa',enabled:true,sourceIssuer:'http://127.0.0.1:3120',coreIssuer:'http://127.0.0.1:3151',integrationId:id(7),tenantId:id(8),companyId:id(9),maxTransportAge:60,maxIntentAge:600,maxReviewAge:300,maxResponseAge:300,signingKeys:{request:keys.request},peerKeys:peer},{},LINK_TYPES);
const target={coreItemId:item,sku:'FIXTURE',name:'Fixture portion',unit:'un',locationId:location,warehouseCode:'FIXTURE',balanceId:balance,balanceVersion:1,onHandMilli:'18000',reservedMilli:'2000',selectable:true,reasonCode:null};
let calls=0,links=0,loseResponse=false,badSignature=false;const records=new Map(),encode=v=>Buffer.from(JSON.stringify(stable(v))).toString('base64url');
async function fakeFetch(url,options){
 calls++;assert.equal(url,config.coreIssuer+'/api/inventory/integrations/v1/links');assert.equal(options.headers.Authorization,undefined);
 const [h,p,s]=JSON.parse(options.body).signedRequest.split('.'),r=JSON.parse(Buffer.from(p,'base64url'));
 assert.equal(JSON.parse(Buffer.from(h,'base64url')).typ,LINK_TYPES.request);assert.ok(verify(null,Buffer.from(h+'.'+p),keys.request.publicKey,Buffer.from(s,'base64url')));assert.equal(r.sourceOperator.subject,user.id);assert.ok(Math.abs(r.iat-r.sourceOperator.verifiedAt)<=60);
 let status='catalog',receipt=null;if(r.action!=='catalog'){
  let record=records.get(r.requestId);if(!record){record={status:r.action==='cancel'?'cancelled':'review'};records.set(r.requestId,record);}
  if(r.action==='confirm'&&record.status==='review'){assert.equal(r.confirmed,true);assert.equal(r.reviewEnvelope,'fixture-link-review');record.status='linked';links++;}
  if(r.action==='cancel'&&record.status!=='linked')record.status='cancelled';status=record.status;
  if(['linked','cancelled'].includes(status)){const hash=digest([r.requestId,status]);record.receipt??={receiptRef:'link:'+r.requestId,status,receiptHash:hash,resultId:digest([config.integrationId,r.requestId,status,hash]),principal:{type:'integration',integrationId:config.integrationId},sourceOperator:{issuer:config.sourceIssuer,subject:user.id}};receipt=record.receipt;}
 }
 const selection=['linked','review'].includes(status)?Object.fromEntries(['sourceMealprepId','linkRef','linkRevision','coreItemId','locationId','unit','equivalenceMilli'].map(k=>[k,r.intent[k]])):null;
 const response={version:1,iss:config.coreIssuer,aud:config.sourceIssuer,integrationId:config.integrationId,requestId:r.requestId,action:r.action,requestHash:digest(r),iat:r.iat,exp:r.iat+300,status,targets:status==='catalog'?[target]:null,selection,reviewEnvelope:status==='review'?'fixture-link-review':null,receipt};
 if(r.action==='confirm'&&loseResponse){loseResponse=false;throw Error('Lost after canonical linkage');}
 const message=encode({alg:'EdDSA',kid:keys.response.kid,typ:LINK_TYPES.response})+'.'+encode(response);
 return new Response(JSON.stringify({signedResponse:message+'.'+sign(null,Buffer.from(message),badSignature?keys.request.privateKey:keys.response.privateKey).toString('base64url')}));
}
function query(table){assert.match(table,/^[a-z_]+$/);const params=[],filters=[];let cols='*';const q={select(v){cols=v;return q;},eq(k,v){assert.match(k,/^[a-z_]+$/);params.push(v);filters.push(k+'=$'+params.length);return q;},not(k,op,v){assert.match(k,/^[a-z_]+$/);assert.equal(op,'in');const values=v.slice(1,-1).split(',');filters.push(k+' not in ('+values.map(value=>{params.push(value);return '$'+params.length;}).join(',')+')');return q;},async execute(){assert.match(cols,/^[a-z_*,]+$/);return {data:(await db.query(`select ${cols} from ${table}${filters.length?' where '+filters.join(' and '):''}`,params)).rows,error:null};},async maybeSingle(){const r=await q.execute();return{data:r.data[0]||null,error:null};},then(resolve,reject){return q.execute().then(resolve,reject);}};return q;}
const supabase={from:query,async rpc(name,args){try{const r=await db.query(`select ${name}($1,$2::jsonb,$3::uuid,$4) result`,[args.p_action,JSON.stringify(args.p_document),args.p_actor,args.p_expected_revision]);return{data:r.rows[0].result,error:null};}catch(e){return{data:null,error:{message:e.message}};}}};
const coreCall=args=>callLinks({...args,fetchImpl:fakeFetch}),service=createStockLinksService({supabase,config,coreCall}),run=body=>service.run({user,body}),prepare=n=>({action:'prepare',recipeId:recipe,requestKey:id(n),coreItemId:item,locationId:location,unit:'un',equivalenceConfirmed:true});
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create table profiles(id uuid primary key,is_admin boolean);create table meal_library_items(id uuid primary key,name text);create table menu_items(id uuid primary key,library_meal_id uuid,product_type text,is_active boolean);create table core360_product_mappings(source_menu_item_id uuid,core_item_id text,is_active boolean,updated_at timestamptz);create table mealprep_stock_handoff_attempts(source_user_id uuid,source_recipe_id uuid,kind text,state text);insert into profiles values('${user.id}',true),('${other}',true);insert into meal_library_items values('${recipe}','Fixture portion');grant usage on schema public to service_role;grant all on all tables in schema public to service_role;`);
 await db.exec(await readFile('supabase/migrations/20261102233503_integrated_inventory_metadata.sql','utf8'));
 await db.exec('set role service_role');
 const unlinked=await readDirectMealprepStock({supabase,user,config,coreCall});assert.equal(unlinked.rows[0].state,'unlinked');
 const p=prepare(20);assert.equal((await run(p)).status,'review');assert.equal(links,0);assert.equal((await run(p)).status,'review');
 await assert.rejects(run({...p,unit:'UN'}));
 const complete=await run({action:'confirm',recipeId:recipe,requestKey:p.requestKey});assert.equal(complete.status,'linked');assert.equal(links,1);
 assert.equal((await run({action:'confirm',recipeId:recipe,requestKey:p.requestKey})).receiptId,complete.receiptId);assert.equal(links,1);
 const stock=await readDirectMealprepStock({supabase,user,config,coreCall});assert.equal(stock.rows[0].state,'known');assert.equal(stock.rows[0].availableMilli,null);assert.equal(stock.rows[0].physicalMilli,'18000');assert.equal((await db.query('select count(*) n from menu_items')).rows[0].n,0);
 const l=(await db.query('select * from mealprep_stock_links')).rows[0];assert.equal(String(l.revision),'1');
 const countDoc={requestKey:id(30),recipeId:recipe,directLinkId:l.id,coreItemId:item,integrationId:config.integrationId,tenantId:config.tenantId,companyId:config.companyId,sourceOrigin:config.sourceIssuer,linkRevision:'1',payload:{fixture:true},intent:{locationId:location,unit:'un'}};
 const count=await supabase.rpc('transition_stock_integration',{p_action:'prepare',p_document:countDoc,p_actor:user.id,p_expected_revision:null});assert.equal(count.error,null);assert.equal(count.data.direct_link_id,l.id);assert.equal(count.data.source_product_id,null);
 await assert.rejects(run(prepare(21)));assert.equal(links,1);
 await supabase.rpc('transition_stock_integration',{p_action:'cancel',p_document:{attemptId:count.data.id,cancellationProof:{fixture:true}},p_actor:user.id,p_expected_revision:1});
 const second=prepare(22);await run(second);loseResponse=true;await assert.rejects(run({action:'confirm',recipeId:recipe,requestKey:second.requestKey}));assert.equal(links,2);
 assert.equal((await run({action:'inspect',recipeId:recipe,requestKey:second.requestKey})).status,'linked');assert.equal(links,2);
 const third=prepare(23);await run(third);const before=calls;await db.exec(`update profiles set is_admin=false where id='${user.id}'`);await assert.rejects(run({action:'confirm',recipeId:recipe,requestKey:third.requestKey}));assert.equal(calls,before);await db.exec(`update profiles set is_admin=true where id='${user.id}'`);
 assert.equal((await run({action:'cancel',recipeId:recipe,requestKey:third.requestKey})).status,'cancelled');assert.equal(links,2);
 badSignature=true;await assert.rejects(run({action:'catalog'}),/verificar/);badSignature=false;
 const paused=createStockLinksService({supabase,config:{...config,enabled:false},coreCall});await assert.rejects(paused.run({user,body:prepare(24)}));
 assert.equal((await db.query("select has_table_privilege('authenticated','mealprep_stock_links','select') ok")).rows[0].ok,false);
 console.log('PASS direct links: real Source SQL + Ed25519 fixture, explicit review, two synthetic enrollments, replay, lost response recovery, admin revoked before call, count/setup exclusion, no menu products/stock writes, private RLS, no inferred available. Native Core crossing pending.');
}finally{await db.close();}
