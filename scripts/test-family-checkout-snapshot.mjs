import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createCheckoutPreference} from '../server/mercadopago-checkout.mjs';

const modulePath=process.argv[process.argv.indexOf('--pglite-module')+1];
assert.ok(process.argv.includes('--pglite-module')&&modulePath);
const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
const id='80000000-0000-4000-8000-000000000001';
const product={id,slug:'familiar-qa',name:'Familiar QA',product_type:'family',price_clp:18800,is_active:true};
process.env.CHECKOUT_SITE_URL='https://fullness.example.invalid';
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw Error('External requests forbidden');};
try {
 await db.exec(`create table menu_items(id uuid,product_type text);
 create table stock_letters(id uuid);create table order_custom_plans(id uuid);
 create table custom_plan_settings(enabled boolean);insert into custom_plan_settings values(true);
 create table order_items(product_id uuid,product_snapshot jsonb);
 insert into menu_items values('${id}','family');`);
 const sql=await readFile('supabase/migrations/20261031154839_custom_plan_six_twentyfour_max_two.sql','utf8');
 for(const name of ['capture_custom_plan','enforce_custom_plan_selection','validate_custom_plan_totals']){
  const fn=sql.match(new RegExp(`create (?:or replace )?function public\\.${name}\\(\\)[\\s\\S]*?end \\$\\$;`));
  assert.ok(fn, name);await db.exec(fn[0]);
  await db.exec(`create trigger ${name} ${name==='validate_custom_plan_totals'?'after':'before'} insert on order_items for each row execute function ${name}();`);
 }
 const insert=snapshot=>db.query('insert into order_items values($1,$2)',[id,JSON.stringify(snapshot)]);
 await assert.rejects(insert({customPlan:null}),/Identidad de plan incompleta/,'Old serialized snapshot reproduces the bug');
 await insert({});
 let stored,mpCalls=0;
 const supabase={from(table){
  if(table==='menu_items')return {select:()=>({in:()=>({eq:async()=>({data:[product],error:null})})})};
  if(table==='orders')return {insert:row=>({select:()=>({single:async()=>({data:{...row,id},error:null})})}),update:()=>({eq:async()=>({error:null})})};
  if(table==='order_items')return {insert:async rows=>{stored=rows;for(const row of rows)await insert(JSON.parse(JSON.stringify(row.product_snapshot)));return {error:null};}};
  throw Error(`Unexpected table ${table}`);
 }};
 const result=await createCheckoutPreference({cart:[{slug:product.slug,quantity:1}],fulfillment:{mode:'pickup',name:'QA',email:'qa@example.invalid',phone:'999999999'},request:{headers:{}},expectedAmount:18800,dependencies:{supabase,env:{},mercadoPagoRequest:async()=>{mpCalls++;assert.ok(stored);return {id:'qa',init_point:'https://www.mercadopago.cl/qa'};}}});
 assert.equal(result.amount,18800);assert.equal(mpCalls,1);
 assert.equal(Object.hasOwn(stored[0].product_snapshot,'customPlan'),false);
 assert.equal((await db.query('select count(*)::int n from order_items')).rows[0].n,2);
 console.log('PASS: old JSON-null fails; real family checkout snapshot saves through all three SQL guards and reaches mocked MP. No external writes/calls.');
} finally {globalThis.fetch=originalFetch;await db.close();}
