import assert from'node:assert/strict';import{generateKeyPairSync,randomUUID}from'node:crypto';
import{prepareStockHandoff}from'../server/stock-handoff-prepare.mjs';import{stockCrypto,TYPES,digest}from'../server/stock-handoff-crypto.mjs';
const roles={};for(const role of Object.keys(TYPES)){const k=generateKeyPairSync('ed25519');roles[role]={kid:role,typ:TYPES[role],privateKey:k.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:k.publicKey.export({type:'spki',format:'pem'})};}
const config={sourceIssuer:'http://127.0.0.1:3120',coreIssuer:'http://127.0.0.1:3151',corePage:'http://127.0.0.1:3151/stock-handoff',tenantId:randomUUID(),companyId:randomUUID(),consumers:['fullness.mealprep-list.stock.v1'],maxIntentAge:600,signingKeys:roles,peerKeys:roles};
const user={id:randomUUID()},actor=randomUUID(),recipe=randomUUID(),product=randomUUID(),item=randomUUID(),balance=randomUUID(),location=randomUUID(),crypto=stockCrypto(config);let attempt,hasBinding=true,calls=0;
const tables={menu_items:[{id:product}],core360_product_mappings:[{uom_code:'un'}]};
const supabase={from(table){let rows=table==='mealprep_stock_handoff_attempts'?(attempt?[attempt]:[]):table==='mealprep_stock_bindings'?(hasBinding?[{core_actor_id:actor}]:[]):tables[table];const query={select(){return query;},eq(){return query;},maybeSingle:async()=>({data:rows[0]||null}),then:resolve=>Promise.resolve({data:rows}).then(resolve)};return query;},rpc:async(_name,p)=>{calls++;if(p.p_action==='prepare'){attempt={id:randomUUID(),source_recipe_id:recipe,source_product_id:product,core_item_id:item,core_tenant_id:config.tenantId,core_company_id:config.companyId,core_actor_id:actor,nonce:'a'.repeat(64),binding_revision:1,consumer_id:p.p_document.consumerId,requested_payload:p.p_document.payload,state:'prepared'};}else{attempt={...attempt,signed_intent:p.p_document.signedIntent,intent_digest:p.p_document.intentDigest};}return{data:attempt};}};
const readStock=async()=>({rows:[{recipeId:recipe,state:'known',coreItemId:item,mappingVersion:'2026-11-01T12:00:00.654321+00:00',balances:[{id:balance,locationId:location,version:4}]}]});
const body={requestKey:randomUUID(),recipeId:recipe,consumerId:config.consumers[0],balanceId:balance,countedQuantityMilli:'12000',reason:'Conteo de unidades listas'};
const prepare=b=>prepareStockHandoff({supabase,user,config,body:b,readStock,clock:()=>1793577600});
await assert.rejects(prepare({...body,coreActorId:randomUUID()}));
await assert.rejects(prepare({...body,countedQuantityMilli:'1500'}));
hasBinding=false;await assert.rejects(prepare(body),/conectada/);assert.equal(calls,0);
hasBinding=true;const result=await prepare(body),intent=crypto.verify('sourceIntent',result.intent);
assert.equal(intent.expectedCoreActorId,actor);assert.equal(intent.coreItemId,item);assert.equal(intent.expectedBalanceVersion,4);assert.equal(intent.linkRevision,'2026-11-01T12:00:00.654321Z');assert.equal(intent.requestKey,attempt.id);assert.equal(digest(intent),attempt.intent_digest);
const replay=await prepare(body);assert.equal(replay.intent,result.intent);assert.equal(calls,2);
await assert.rejects(prepare({...body,countedQuantityMilli:'13000'}),/intento anterior/);
console.log('PASS: Source preparation uses authenticated subject, immutable idempotency, server-resolved product/balance and verified binding; no caller-selected Core actor. Synthetic fixtures only, no inventory writes.');
