import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.argv[process.argv.indexOf('--pglite-module')+1];
assert.ok(process.argv.includes('--pglite-module')&&modulePath,'Indica --pglite-module con el módulo PostgreSQL aislado ya instalado.');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table public.profiles(id uuid primary key,is_admin boolean);
 create table public.meal_library_items(id uuid primary key);
 create table public.menu_items(id uuid primary key,product_type text,plan_frequency text,is_active boolean,
 constraint menu_items_product_type_allowed check(product_type in ('plan','family')),
 constraint menu_items_product_type_frequency_consistency check((product_type='family' and plan_frequency is null)or(product_type='plan'and plan_frequency in('weekly','monthly'))));
 create table public.orders(id uuid primary key);
 create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid references public.orders,product_id uuid references public.menu_items,quantity integer,total_clp bigint,product_snapshot jsonb);
 create table public.core360_product_mappings(id uuid primary key,source_menu_item_id uuid,core_item_id uuid,is_active boolean);
 create table public.core360_catalog_projection(source_menu_item_id uuid,core_item_id uuid,price_available boolean,core_item_available boolean,uom_compatible boolean,factor_compatible boolean,currency text,gross_minor bigint);
 insert into public.profiles values('10000000-0000-4000-8000-000000000001',true),('10000000-0000-4000-8000-000000000002',false);
 grant usage on schema public to anon,authenticated,service_role;grant all on all tables in schema public to service_role;`);
 await db.exec(await readFile('supabase/migrations/20261031151351_stock_letter_custom_plans.sql','utf8'));
 const letter=(await db.query('select * from stock_letters')).rows[0];
 assert.equal(letter.state,'draft');assert.equal((await db.query('select * from stock_letter_items')).rows.length,15);
 assert.equal((await db.query('select enabled from custom_plan_settings')).rows[0].enabled,false);
 assert.equal((await db.query("select has_table_privilege('anon','stock_letters','select') ok")).rows[0].ok,false);
 const document={id:letter.id,title:'Carta QA',startsOn:letter.starts_on,endsOn:letter.ends_on,state:'draft',planSizes:[7],familyInPlans:false,items:[{position:1,title:'Plato QA'}]};
 const save=(doc,revision=1,actor='10000000-0000-4000-8000-000000000001')=>db.query('select save_stock_letter($1::jsonb,$2,$3::uuid) result',[JSON.stringify(doc),revision,actor]);
 await assert.rejects(save(document,1,'10000000-0000-4000-8000-000000000002'),/Administración/);
 await save(document);await assert.rejects(save(document),/cambió/);
 await assert.rejects(save({...document,state:'active'},2),/identidad y precio|vigente/);
 const closed=await save({...document,state:'closed'},2);assert.equal(closed.rows[0].result.state,'closed');
 await assert.rejects(save(document,3),/cerrada/);
 assert.equal((await db.query('select * from stock_letter_audit')).rows.length,2);
 const menuId='30000000-0000-4000-8000-000000000001',coreId='40000000-0000-4000-8000-000000000001',orderId='50000000-0000-4000-8000-000000000001';
 await db.exec(`insert into menu_items values('${menuId}','mealprep',null,true);
 insert into core360_product_mappings values('60000000-0000-4000-8000-000000000001','${menuId}','${coreId}',true);
 insert into core360_catalog_projection values('${menuId}','${coreId}',true,true,true,true,'CLP',6500);
 insert into orders values('${orderId}');`);
 const dates=(await db.query("select current_date::text start,(current_date+21)::text finish")).rows[0];
 const active=(await save({...document,id:undefined,startsOn:dates.start,endsOn:dates.finish,state:'active',items:[{position:1,title:'Plato QA',menuItemId:menuId}]},0)).rows[0].result;
 const group={id:'70000000-0000-4000-8000-000000000001',letterId:active.id,revision:active.revision,size:7,quantity:1,unitTotal:45500};
 const snapshot={planStructure:'custom_stock_plan_v1',customPlan:group};
 await db.query('insert into order_items(order_id,product_id,quantity,total_clp,product_snapshot) values($1,$2,7,45500,$3)',[orderId,menuId,JSON.stringify(snapshot)]);
 assert.equal((await db.query('select * from order_custom_plans')).rows.length,1);
 await assert.rejects(db.query('insert into order_items(order_id,product_id,quantity,total_clp,product_snapshot) values($1,$2,6,39000,$3)',[orderId,menuId,JSON.stringify({...snapshot,customPlan:{...group,id:'70000000-0000-4000-8000-000000000002'}})]),/todos sus platos/);
 await assert.rejects(db.query("insert into order_items(order_id,product_id,quantity,total_clp,product_snapshot) values($1,$2,1,6500,'{}')",[orderId,menuId]),/sólo se compran/);
 assert.equal((await db.query('select * from order_custom_plans')).rows.length,1);
 const persisted=(await db.query('select snapshot from order_custom_plans')).rows[0].snapshot;
 await save({...document,id:active.id,startsOn:dates.start,endsOn:dates.finish,state:'closed'},active.revision);
 assert.deepEqual((await db.query('select snapshot from order_custom_plans')).rows[0].snapshot,persisted);
 await db.exec(await readFile('supabase/migrations/20261031154839_custom_plan_six_twentyfour_max_two.sql','utf8'));
 assert.deepEqual((await db.query('select snapshot from order_custom_plans')).rows[0].snapshot,persisted,'No reescribir el grupo histórico');
 const uid=i=>`30000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
 for(const i of [2,3,4,5])await db.exec(`insert into menu_items values('${uid(i)}','mealprep',null,true);
 insert into core360_product_mappings values('60000000-0000-4000-8000-00000000000${i}','${uid(i)}','40000000-0000-4000-8000-00000000000${i}',true);
 insert into core360_catalog_projection values('${uid(i)}','40000000-0000-4000-8000-00000000000${i}',true,true,true,true,'CLP',6500);`);
 const nextDocument={...document,id:undefined,startsOn:dates.start,endsOn:dates.finish,state:'active',planSizes:[6,24],items:[1,2,3,4,5].map(i=>({position:i,title:`Plato QA ${i}`,menuItemId:uid(i)}))};
 const next=(await save(nextDocument,0)).rows[0].result;
 assert.deepEqual(next.plan_sizes,[6,24]);assert.equal(next.max_per_meal,2);
 const nextGroup={...group,id:'70000000-0000-4000-8000-000000000010',letterId:next.id,revision:next.revision,size:6,unitTotal:39000,items:[1,2,3,4,5].map(i=>({menuItemId:uid(i),coreItemId:`40000000-0000-4000-8000-${String(i).padStart(12,'0')}`,week:1,quantity:i===1?2:1}))};
 async function insertGroup(g,quantities=[2,1,1,1,1]){
  await db.exec('begin');try{for(let i=0;i<5;i++)await db.query('insert into order_items(order_id,product_id,quantity,total_clp,product_snapshot) values($1,$2,$3,$4,$5)',[orderId,uid(i+1),quantities[i],quantities[i]*6500,JSON.stringify({planStructure:'custom_stock_plan_v1',customPlan:g})]);await db.exec('commit');}catch(e){await db.exec('rollback');throw e;}
 }
 await insertGroup(nextGroup);
 await assert.rejects(insertGroup({...nextGroup,id:'70000000-0000-4000-8000-000000000011',items:nextGroup.items.map((r,i)=>i===0?{...r,quantity:3}:r)}),/Máximo 2/);
 await assert.rejects(insertGroup({...nextGroup,id:'70000000-0000-4000-8000-000000000012',items:[...nextGroup.items.slice(0,4),{...nextGroup.items[0],quantity:1}]}),/Máximo 2/);
 await assert.rejects(insertGroup({...nextGroup,id:'70000000-0000-4000-8000-000000000013'},[1,2,1,1,1]),/líneas no coinciden/);
 await assert.rejects(insertGroup({...nextGroup,id:'70000000-0000-4000-8000-000000000015',items:nextGroup.items.slice(0,4).map((r,i)=>i===1?{...r,quantity:2}:r)}),/Sólo un plato/);
 await insertGroup({...nextGroup,id:'70000000-0000-4000-8000-000000000014',quantity:2},[4,2,2,2,2]);
 await insertGroup({...nextGroup,id:'70000000-0000-4000-8000-000000000016',size:24,unitTotal:156000,items:[1,2,3,4].flatMap(week=>nextGroup.items.map(r=>({...r,week})))},[8,4,4,4,4]);
 await db.exec(`update custom_plan_settings set enabled=true;insert into menu_items values('80000000-0000-4000-8000-000000000001','family',null,true);`);
 await db.query("insert into order_items(order_id,product_id,quantity,total_clp,product_snapshot) values($1,'80000000-0000-4000-8000-000000000001',3,56400,'{}')",[orderId]);
 console.log('PASS SQL: history,6/24,one duplicated canonical dish per week,split-ID bypass rejected,actual quantities,multiple plans,monthly four weeks,family sales.');
}finally{await db.close();}
