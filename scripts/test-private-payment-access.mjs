import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler from '../api/mercadopago/test-session.js';
import {resolveMercadoPagoProfile} from '../server/mercadopago-test-checkout.mjs';
import {createTestCheckoutSession} from '../server/mercadopago-checkout.mjs';
for(const method of ['GET','POST']){
 let status,body;const res={setHeader(){},set statusCode(s){status=s;},end(b){body=JSON.parse(b);}};
 await handler({method,headers:{}},res);assert.equal(status,401);assert.ok(body.error);assert.equal(body.data,undefined);
}
let creates=0,verifications=0;
const dependencies={assertOwnerBackofficeRequest:async()=>({user:{id:'owner-id'}}),resolveMercadoPagoProfile:async({mode,verifyTestIdentity})=>{assert.equal(mode,'test');assert.equal(verifyTestIdentity,true);verifications++;},authorizeTestCheckoutSession:async({ownerUserId})=>{assert.equal(ownerUserId,'owner-id');creates++;return{testSessionToken:'synthetic'};},supabase:{}};
assert.equal((await createTestCheckoutSession({inspectOnly:true,dependencies})).ready,true);assert.equal(creates,0);assert.equal(verifications,1);
await createTestCheckoutSession({dependencies});assert.equal(creates,1);
await assert.rejects(createTestCheckoutSession({dependencies:{...dependencies,assertOwnerBackofficeRequest:async()=>{throw Object.assign(Error('Not owner'),{statusCode:403});}}}),/Not owner/);assert.equal(creates,1);
const env={MERCADOPAGO_TEST_ACCESS_TOKEN:'same',MERCADOPAGO_ACCESS_TOKEN:'same',MERCADOPAGO_TEST_USER_ID:'1',MERCADOPAGO_TEST_PUBLIC_KEY:'public',MERCADOPAGO_TEST_WEBHOOK_SECRET:'secret'};
await assert.rejects(resolveMercadoPagoProfile({env,mode:'test'}),e=>e.code==='TEST_PROFILE_NOT_ISOLATED');
await assert.rejects(resolveMercadoPagoProfile({env:{MERCADOPAGO_ACCESS_TOKEN:'live-only'},mode:'test'}),e=>e.code==='TEST_PROFILE_NOT_CONFIGURED');
await assert.rejects(resolveMercadoPagoProfile({env:{...env,MERCADOPAGO_ACCESS_TOKEN:'different'},mode:'test',verifyTestIdentity:true,fetchImpl:async()=>new Response(JSON.stringify({id:'1',site_id:'MLC',tags:[]}))}),e=>e.code==='TEST_PROFILE_IDENTITY_MISMATCH');
const main=await readFile('src/main.jsx','utf8'),shop=await readFile('src/components/approved-shop.jsx','utf8'),privateUi=await readFile('src/components/private-payment-test.jsx','utf8');
assert.doesNotMatch(main,/testCheckoutSessionToken|Compra de prueba autorizada|testCheckoutAccessOpen/);
assert.doesNotMatch(shop,/testSessionToken|Compra de prueba/);
assert.match(main,/activeBackofficeModule === "operations"[\s\S]*?activeIsAdmin && <PrivatePaymentTest/);
assert.equal((main.match(/<PrivatePaymentTest/g)||[]).length,1);
assert.doesNotMatch(privateUi,/localStorage\.(setItem|removeItem)|fullness_pending_order|fullness_last_order/);
assert.match(privateUi,/payload.data\?\.testMode!==true/);
console.log('PASS private payment access: anonymous denied GET/POST, owner-only issuance, read-only readiness, no LIVE fallback/equal tokens, verified test identity, no public controls.');
