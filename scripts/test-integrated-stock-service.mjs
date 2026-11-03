import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,verify} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createIntegratedStockService} from '../server/integrated-stock.mjs';
import {TYPES,validateIntegrationConfig,integrationCrypto,digest} from '../server/integrated-stock-crypto.mjs';
import {stable} from '../server/stock-handoff-crypto.mjs';
import {createIntegratedStockHandler} from '../api/backoffice/mealprep-stock-integration.js';
const modulePath=process.argv[process.argv.indexOf('--pglite-module')+1];assert.ok(process.argv.includes('--pglite-module')&&modulePath);
const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,user={id:id(1)},recipe=id(2),product=id(3),coreItem=id(4),location=id(5),balance=id(6);
const keys={},pub={};for(const role of Object.keys(TYPES)){const k=generateKeyPairSync('ed25519');keys[role]={kid:'qa-fixture-'+role,typ:TYPES[role],environment:'qa',publicKey:k.publicKey.export({type:'spki',format:'pem'}),privateKey:k.privateKey.export({type:'pkcs8',format:'pem'})};const{privateKey,...p}=keys[role];pub[role]=p;}
const config=validateIntegrationConfig({version:1,environment:'qa',enabled:true,sourceIssuer:'http://127.0.0.1:3120',coreIssuer:'http://127.0.0.1:3151',integrationId:id(7),tenantId:id(8),companyId:id(9),maxTransportAge:60,maxIntentAge:600,maxReviewAge:300,maxResponseAge:300,signingKeys:{request:keys.request},peerKeys:pub},{});
const encode=v=>Buffer.from(JSON.stringify(stable(v))).toString('base64url');
let physical='20000',version=1,effects=0,refreshFails=false,loseConfirm=false,badSignature=false,coreCalls=0;
const records=new Map();
async function fakeCore(url,options){
 coreCalls++;assert.equal(url,config.coreIssuer+'/api/inventory/integrations/v1/counts');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,undefined);
 const token=JSON.parse(options.body).signedRequest,[h,p,s]=token.split('.'),request=JSON.parse(Buffer.from(p,'base64url'));
 assert.equal(JSON.parse(Buffer.from(h,'base64url')).typ,TYPES.request);assert.ok(verify(null,Buffer.from(h+'.'+p),keys.request.publicKey,Buffer.from(s,'base64url')));
 assert.equal(request.intent.sourceOperator.role,'admin');assert.equal(request.intent.sourceOperator.subject,user.id);assert.equal(request.intent.linkRevision,'2026-11-02T12:00:00.123456Z');
 let record=records.get(request.requestId);
 if(!record){record={status:'review',receipt:null};records.set(request.requestId,record);}
 if(request.action==='confirm'&&record.status==='review'){
  assert.equal(request.confirmed,true);assert.equal(request.reviewEnvelope,'fixture-core-review-envelope');
  assert.equal(request.intent.expectedBalanceVersion,version);physical=request.intent.countedQuantityMilli;version++;effects++;record.status='confirmed';
 }
 if(request.action==='cancel'&&record.status!=='confirmed')record.status='cancelled';
 if(['confirmed','cancelled'].includes(record.status)&&!record.receipt){const receiptHash=digest({id:request.requestId,status:record.status});record.receipt={receiptRef:'fixture-receipt:'+request.requestId,status:record.status,receiptHash,resultId:digest([config.integrationId,request.requestId,record.status,receiptHash]),principal:{type:'integration',integrationId:config.integrationId},sourceOperator:{issuer:config.sourceIssuer,subject:user.id}};}
 const now=Math.floor(Date.now()/1000),projection=record.status==='cancelled'?null:{coreItemId:coreItem,locationId:location,balanceId:balance,unit:'un',balanceVersion:version,onHandMilli:physical,reservedMilli:'3000',countedQuantityMilli:request.intent.countedQuantityMilli,deltaMilli:(BigInt(request.intent.countedQuantityMilli)-BigInt(physical)).toString()};
 const response={version:1,iss:config.coreIssuer,aud:config.sourceIssuer,integrationId:config.integrationId,requestId:request.requestId,action:request.action,requestHash:digest(request),iat:now,exp:now+300,status:record.status,projection,reviewEnvelope:record.status==='review'?'fixture-core-review-envelope':null,receipt:record.receipt};
 if(request.action==='confirm'&&loseConfirm){loseConfirm=false;throw Error('Fixture response lost after native effect');}
 const message=encode({alg:'EdDSA',kid:keys.response.kid,typ:TYPES.response})+'.'+encode(response);
 const signedResponse=message+'.'+sign(null,Buffer.from(message),badSignature?keys.request.privateKey:keys.response.privateKey).toString('base64url');
 return new Response(JSON.stringify({signedResponse}),{status:200});
}
function query(table){
 assert.ok(/^[a-z_][a-z0-9_]*$/.test(table));const filters=[],params=[];let columns='*';
 const q={select(value){columns=value;return q;},eq(key,value){assert.ok(/^[a-z_][a-z0-9_]*$/.test(key));params.push(value);filters.push(`${key}=$${params.length}`);return q;},
 async execute(){assert.ok(/^[a-z_*,]+$/.test(columns));const selected=columns.split(',').map(k=>k==='updated_at'?'updated_at::text as updated_at':k).join(',');const r=await db.query(`select ${selected} from ${table}${filters.length?' where '+filters.join(' and '):''}`,params);return{data:r.rows,error:null};},async maybeSingle(){const r=await q.execute();return{data:r.data[0]||null,error:null};},then(resolve,reject){return q.execute().then(resolve,reject);}};return q;
}
const supabase={from:query,async rpc(name,args){try{const r=await db.query('select transition_stock_integration($1,$2::jsonb,$3::uuid,$4) result',[args.p_action,JSON.stringify(args.p_document),args.p_actor,args.p_expected_revision]);return{data:r.rows[0].result,error:null};}catch(e){return{data:null,error:{code:e.code,message:e.message}};}}};
const readStock=async()=>{if(refreshFails)throw Error('Fixture canonical read unavailable');return{observedAt:new Date().toISOString(),rows:[{recipeId:recipe,state:'known',coreItemId:coreItem,availableMilli:null,balances:[{id:balance,locationId:location,version,physicalMilli:physical,reservedMilli:'3000'}]}]};};
const service=createIntegratedStockService({supabase,config,readStock,fetchImpl:fakeCore});
const body=(n,quantity='24000')=>({action:'prepare',recipeId:recipe,requestKey:id(n),balanceId:balance,countedQuantityMilli:quantity,reason:'Fixture physical count',consumerId:'fullness.mealprep-list.stock.v1'});
const run=body=>service.run({user,body});
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create table profiles(id uuid primary key,is_admin boolean);create table meal_library_items(id uuid primary key);create table menu_items(id uuid primary key,library_meal_id uuid,product_type text,is_active boolean);create table core360_product_mappings(source_menu_item_id uuid,core_item_id text,is_active boolean,updated_at timestamptz,uom_code text);create table mealprep_stock_handoff_attempts(source_user_id uuid,source_recipe_id uuid,kind text,state text);insert into profiles values('${user.id}',true);insert into meal_library_items values('${recipe}');insert into menu_items values('${product}','${recipe}','mealprep',true);insert into core360_product_mappings values('${product}','${coreItem}',true,'2026-11-02T12:00:00.123456Z','un');grant usage on schema public to service_role;grant all on all tables in schema public to service_role;`);
 await db.exec(await readFile('supabase/migrations/20261102233503_integrated_inventory_metadata.sql','utf8'));
 // Explicit no-effect failure before the metadata RPC: preserve key/draft but
 // release the UI pending lock. This must not cover later uncertain failures.
 refreshFails=true;const callsBeforeReadFailure=coreCalls;
 await assert.rejects(run(body(19)),e=>e.preparationNotStarted===true&&e.statusCode===503);
 assert.equal(coreCalls,callsBeforeReadFailure);
 assert.equal((await db.query('select count(*) n from mealprep_stock_integration_attempts')).rows[0].n,0);
 refreshFails=false;
 const p=body(20);assert.equal((await run(p)).status,'review');assert.equal(effects,0);
 const scope={recipeId:recipe,requestKey:p.requestKey};
 await assert.rejects(run({...p,userId:id(99)}));
 const complete=await run({action:'confirm',...scope});assert.equal(complete.status,'committed');assert.equal(effects,1);assert.equal(physical,'24000');
 assert.equal((await run({action:'confirm',...scope})).receiptId,complete.receiptId);assert.equal(effects,1);
 const second=body(21,'25000');assert.equal((await run(second)).status,'review');loseConfirm=true;
 await assert.rejects(run({action:'confirm',recipeId:recipe,requestKey:second.requestKey}));assert.equal(effects,2);
 assert.equal((await run({action:'inspect',recipeId:recipe,requestKey:second.requestKey})).status,'committed');assert.equal(effects,2);
 const third=body(22,'26000');await run(third);refreshFails=true;
 const registered=await run({action:'confirm',recipeId:recipe,requestKey:third.requestKey});assert.equal(registered.status,'registered');assert.equal(registered.refreshPending,true);assert.equal(effects,3);
 refreshFails=false;assert.equal((await run({action:'inspect',recipeId:recipe,requestKey:third.requestKey})).status,'committed');assert.equal(effects,3);
 const fourth=body(23,'27000');await run(fourth);const before=coreCalls;
 await db.exec(`update profiles set is_admin=false where id='${user.id}'`);await assert.rejects(run({action:'confirm',recipeId:recipe,requestKey:fourth.requestKey}));assert.equal(coreCalls,before);
 await db.exec(`update profiles set is_admin=true where id='${user.id}'`);assert.equal((await run({action:'cancel',recipeId:recipe,requestKey:fourth.requestKey})).cancellationVerified,true);assert.equal(effects,3);
 badSignature=true;await assert.rejects(run(body(24,'28000')),/verificar/);badSignature=false;
 assert.equal((await run({action:'cancel',recipeId:recipe,requestKey:id(24)})).status,'cancelled');
 const fifth=body(25,'28000');await run(fifth);
 const pausedConfig=validateIntegrationConfig({...config,enabled:false},{}),paused=createIntegratedStockService({supabase,config:pausedConfig,readStock,fetchImpl:fakeCore}),pausedRun=body=>paused.run({user,body}),beforePaused=coreCalls;
 await assert.rejects(pausedRun(body(26,'29000')),/pausado/);await assert.rejects(pausedRun({action:'confirm',recipeId:recipe,requestKey:id(25)}),/pausado/);assert.equal(coreCalls,beforePaused);
 await pausedRun({action:'inspect',recipeId:recipe,requestKey:id(25)});assert.equal((await pausedRun({action:'cancel',recipeId:recipe,requestKey:id(25)})).status,'cancelled');assert.equal(effects,3);
 assert.throws(()=>validateIntegrationConfig({...config,maxIntentAge:601},{}));
 assert.throws(()=>validateIntegrationConfig({...config,signingKeys:{...config.signingKeys,response:keys.response}},{}));
 assert.throws(()=>validateIntegrationConfig(config,{VERCEL_ENV:'production'}));
 const handler=createIntegratedStockHandler({authenticate:async req=>{if(req.headers.authorization!=='Bearer fixture-owner')throw Object.assign(Error('Sesión requerida'),{statusCode:401});return{supabase,user};},configLoader:async()=>config,serviceFactory:()=>service});
 async function api(body,authorized=true,method='POST'){
  let statusCode,payload;const res={setHeader(){},set statusCode(v){statusCode=v;},get statusCode(){return statusCode;},end(text){payload=JSON.parse(text);}};
  await handler({method,body,headers:{authorization:authorized?'Bearer fixture-owner':''}},res);return{statusCode,payload};
 }
 const priorCalls=coreCalls;
 assert.equal((await api(body(27),false)).statusCode,401);
 assert.equal((await api(body(27),true,'GET')).statusCode,405);
 assert.equal((await api({...body(27),tenantId:id(99)})).statusCode,403);
 assert.equal(coreCalls,priorCalls);
 assert.equal((await api(body(27))).payload.data.status,'review');
 assert.equal((await api({action:'cancel',recipeId:recipe,requestKey:id(27)})).payload.data.status,'cancelled');
 const crypto=integrationCrypto(config);assert.throws(()=>crypto.verify(crypto.sign({test:true})),/verificar/);
 console.log(`PASS Source service+SQL+Ed25519: preview/confirm/replay, lost confirm response→inspect, receipt-known fresh-read failure→registered, owner revoked before Core call, cancellation and signature mismatch. ${effects} synthetic effects, no real providers/stock.`);
}finally{await db.close();}
