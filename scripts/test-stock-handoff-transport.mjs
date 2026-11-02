import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {createStockMetadata,linkTimestamp} from '../server/stock-handoff-metadata.mjs';
import {TYPES,digest,stable,stockCrypto} from '../server/stock-handoff-crypto.mjs';
import {metadataHandler} from '../api/backoffice/mealprep-stock-handoff.js';
const {PGlite}=await import(pathToFileURL(process.argv[process.argv.indexOf('--pglite-module')+1]).href);
const db=new PGlite(),roles={};for(const role of Object.keys(TYPES)){const k=generateKeyPairSync('ed25519');roles[role]={kid:`test-only-${role}`,typ:TYPES[role],privateKey:k.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:k.publicKey.export({type:'spki',format:'pem'})};}
const config={environment:'qa',sourceIssuer:'http://127.0.0.1:3120',coreIssuer:'http://127.0.0.1:3151',consumers:['fullness.mealprep-list.stock.v1','fullness.mealprep-detail.stock.v1'],maxIntentAge:600,maxResultAge:300,maxMetadataAge:60,signingKeys:{sourceIntent:roles.sourceIntent,sourceMetadata:roles.sourceMetadata},peerKeys:roles};
const crypto=stockCrypto(config),now=Math.floor(Date.now()/1000),user=randomUUID(),actor=randomUUID(),tenant=randomUUID(),company=randomUUID(),recipe=randomUUID(),product=randomUUID(),item=randomUUID(),location=randomUUID(),balance=randomUUID();
const link='2026-11-01T20:00:00.123456Z';let passed=0,readFails=true;
const check=(value,message)=>{assert.ok(value,message);passed++;};
const transition=async(action,document,subject=user)=>(await db.query('select transition_mealprep_stock_handoff($1,$2::jsonb,$3::uuid,null) result',[action,JSON.stringify(document),subject])).rows[0].result;
const supabase={
 rpc:async(_name,p)=>{try{return {data:await transition(p.p_action,p.p_document,p.p_actor)};}catch(error){return {error};}},
 from:table=>({select:()=>({eq:(_key,id)=>({maybeSingle:async()=>({data:(await db.query(`select *,to_char(link_revision at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') link_revision from ${table} where id=$1`,[id])).rows[0]})})})})
};
const service=createStockMetadata({supabase,config,clock:()=>now,refresh:async()=>{if(readFails)throw Error('simulated read interruption');return {verified:true,observation:{fixture:'isolated canonical read',version:8}};}});
const encode=value=>Buffer.from(JSON.stringify(stable(value))).toString('base64url');
const coreSign=(role,payload)=>{const key=roles[role],message=encode({alg:'EdDSA',kid:key.kid,typ:key.typ})+'.'+encode(payload);return message+'.'+sign(null,Buffer.from(message),key.privateKey).toString('base64url');};
let intent,signedIntent,a;
const request=(action,extra={})=>({version:1,iss:config.coreIssuer,aud:config.sourceIssuer,purpose:'inventory.absolute_count.metadata',requestId:randomUUID(),iat:now,exp:now+60,action,intent:signedIntent,coreActorId:actor,...extra});
const exchange=payload=>service.exchange({signedRequest:coreSign('coreMetadata',payload)});
let server;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create table profiles(id uuid primary key,is_admin boolean);create table meal_library_items(id uuid primary key);create table menu_items(id uuid primary key,library_meal_id uuid,product_type text,is_active boolean);create table core360_product_mappings(source_menu_item_id uuid,core_item_id text,is_active boolean,updated_at timestamptz);insert into profiles values('${user}',true);insert into meal_library_items values('${recipe}');insert into menu_items values('${product}','${recipe}','mealprep',true);insert into core360_product_mappings values('${product}','${item}',true,'${link}');`);
 await db.exec(await readFile('supabase/migrations/20261101233935_stock_handoff_metadata.sql','utf8'));
 const b=await transition('binding_prepare',{requestKey:randomUUID(),tenantId:tenant,companyId:company,sourceOrigin:config.sourceIssuer,consumerId:config.consumers[0],payload:{fixture:true}});
 await transition('binding_result',{attemptId:b.id,coreActorId:actor,nonce:b.nonce,confirmed:true,proof:'EXPLICIT SYNTHETIC QA BINDING - NOT A REAL SESSION',receiptId:randomUUID()});
 a=await transition('prepare',{requestKey:randomUUID(),tenantId:tenant,companyId:company,sourceOrigin:config.sourceIssuer,consumerId:config.consumers[0],recipeId:recipe,productId:product,coreItemId:item,linkRevision:link,payload:{fixture:true}});
 intent={version:1,iss:config.sourceIssuer,aud:config.coreIssuer,consumerId:config.consumers[0],purpose:'inventory.absolute_count',requestKey:a.id,nonce:a.nonce,iat:now,exp:now+600,tenantId:tenant,companyId:company,sourceSubjectRef:user,identityBindingRevision:String(a.binding_revision),expectedCoreActorId:actor,sourceMealprepId:recipe,linkRef:product,linkRevision:link,coreItemId:item,locationId:location,balanceId:balance,unit:'un',expectedBalanceVersion:7,countedQuantityMilli:'24000',issuedOn:'2026-11-01',reason:'Conteo físico QA aislado'};
 signedIntent=crypto.sign('sourceIntent',intent);a=await transition('seal',{attemptId:a.id,signedIntent,intentDigest:digest(intent)});
 check(linkTimestamp(link)==='2026-11-01T20:00:00.123456Z','Microsecond revision retained');
 const r=request('authorize',{phase:'preview'}),answer=await exchange(r),ack=crypto.verify('sourceIntent',signedIntent);check(ack.requestKey===a.id,'Stored Source signature verifies');
 const responsePayload=JSON.parse(Buffer.from(answer.signedResponse.split('.')[1],'base64url'));check(responsePayload.requestHash===digest(r)&&responsePayload.authorization.state==='held','Signed attestation correlates exact peer request and durable claim');
 const claimId=responsePayload.authorization.claimId;
 const replayPayload=JSON.parse(Buffer.from((await exchange(r)).signedResponse.split('.')[1],'base64url'));check(replayPayload.authorization.claimId===claimId,'HTTP retry preserves one claim');
 await assert.rejects(exchange({...r,coreActorId:randomUUID()}));passed++;
 await assert.rejects(exchange({...r,exp:now-1}));passed++;
 await assert.rejects(service.exchange({signedRequest:coreSign('coreResult',r)}));passed++;
 await assert.rejects(service.exchange({signedRequest:coreSign('coreMetadata',r),action:'authorize'}));passed++;
 await assert.rejects(exchange({...r,phase:'confirm',signedResult:'extra'}));passed++;
 const result={version:1,iss:config.coreIssuer,aud:config.sourceIssuer,consumerId:intent.consumerId,purpose:'inventory.absolute_count.result',requestKey:a.id,nonce:a.nonce,intentHash:digest(intent),claimId,coreActorId:actor,tenantId:tenant,companyId:company,sourceSubjectRef:user,identityBindingRevision:intent.identityBindingRevision,sourceMealprepId:recipe,linkRef:product,linkRevision:link,coreItemId:item,locationId:location,balanceId:balance,status:'confirmed',receiptRef:a.id,receiptHash:'a'.repeat(64),resultId:digest([a.id,'confirmed','a'.repeat(64)]),iat:now,exp:now+300,snapshot:null};
 await assert.rejects(exchange(request('reconcile',{signedResult:coreSign('coreResult',{...result,claimId:randomUUID()})})));passed++;
 let reconciliation=JSON.parse(Buffer.from((await exchange(request('reconcile',{signedResult:coreSign('coreResult',result)}))).signedResponse.split('.')[1],'base64url')).reconciliation;
 check(reconciliation.receiptRecorded&&reconciliation.sourceState==='result_pending'&&!reconciliation.canonicalRefreshVerified,'Core evidence retained without pretending interrupted refresh saved Source');
 readFails=false;
 reconciliation=JSON.parse(Buffer.from((await exchange(request('reconcile',{signedResult:coreSign('coreResult',result)}))).signedResponse.split('.')[1],'base64url')).reconciliation;
 check(reconciliation.sourceState==='committed'&&reconciliation.canonicalRefreshVerified,'Reconciliation retries only canonical read, then commits metadata');
 const handler=metadataHandler({loadConfig:async()=>config,getDatabase:()=>supabase,createService:()=>service});
 server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const endpoint=`http://127.0.0.1:${server.address().port}`;
 let http=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({signedRequest:coreSign('coreMetadata',request('authorize',{phase:'recovery'}))})});
 check(http.status===200&&!!(await http.json()).signedResponse,'Actual HTTP handler parses native request and returns signed envelope');
 http=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',Origin:config.sourceIssuer},body:'{}'});check(http.status===403,'Browser origin is not server peer authority');
 http=await fetch(endpoint);check(http.status===405,'GET cannot mutate coordination');
 console.log(`PASS ${passed}: real Ed25519 purpose/scope/correlation, PGlite claims/receipt recovery and native HTTP. Synthetic identities only; no real Core inventory or production writes.`);
}finally{if(server)await new Promise(resolve=>server.close(resolve));await db.close();}
