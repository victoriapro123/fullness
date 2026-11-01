import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const path=process.argv[process.argv.indexOf('--pglite-module')+1];assert.ok(process.argv.includes('--pglite-module')&&path,'Indica --pglite-module con PGlite ya instalado.');
const {PGlite}=await import(pathToFileURL(path).href);const db=new PGlite();
const admin='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',meal='20000000-0000-4000-8000-000000000001';
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create table public.profiles(id uuid primary key,is_admin boolean);create table public.meal_library_items(id uuid primary key,is_active boolean);insert into profiles values('${admin}',true),('${other}',false);insert into meal_library_items values('${meal}',true);grant usage on schema public to service_role;grant select on profiles,meal_library_items to service_role;`);
 await db.exec(await readFile('supabase/migrations/20261101144848_restaurant_menu_availability.sql','utf8'));
 const item={id:'real-library',name:'Receta real',description:'Descripción',section:'individuales',libraryMealId:meal,lunchSlot:1,price:9800,state:'available',startsOn:'',endsOn:''};
 const document={lunchPrice:13500,lunchDescription:'Menú completo',items:[item]};
 const save=(doc,rev,publish=false,actor=admin)=>db.query('select save_local_menu($1::jsonb,$2,$3,$4::uuid) result',[JSON.stringify(doc),rev,publish,actor]);
 await assert.rejects(save(document,1,false,other),/Administración/);
 await db.exec('set role service_role');
 await save(document,1);assert.equal((await db.query('select published_document from local_menu_settings')).rows[0].published_document,null);
 await assert.rejects(save(document,1),/cambió/);
 await save(document,2,true);assert.equal((await db.query('select published_document from local_menu_settings')).rows[0].published_document.items[0].name,'Receta real');
 await save({...document,lunchPrice:14000},3);assert.equal((await db.query('select published_document from local_menu_settings')).rows[0].published_document.lunchPrice,13500);
 await assert.rejects(save({...document,items:[item,{...item,id:'other'}]},4),/repetidos/);
 await assert.rejects(save({...document,items:[{...item,price:9800.5}]},4),/producto/);
 await assert.rejects(save({...document,items:[{...item,lunchSlot:6}]},4),/Lunch/);
 await assert.rejects(save({...document,items:[{...item,libraryMealId:admin}]},4),/receta/);
 const av=(rev,state='available',start='2026-11-01',end='2026-11-21',actor=admin)=>db.query('select save_mealprep_availability($1::uuid,$2,$3::date,$4::date,$5,$6::uuid) result',[meal,state,start,end,rev,actor]);
 await av(1);await assert.rejects(av(1),/cambió/);await assert.rejects(av(2,'available','2026-11-02','2026-11-01'),/check constraint/);await assert.rejects(av(2,'available',null,null,other),/Administración/);await av(2,'sold_out');
 assert.equal((await db.query('select count(*)::int n from mealprep_availability_audit')).rows[0].n,2);
 assert.equal((await db.query('select count(*)::int n from local_menu_versions')).rows[0].n,3);
 await db.exec('reset role');
 for(const table of ['mealprep_availability','mealprep_availability_audit','local_menu_settings','local_menu_versions']){
  assert.equal((await db.query('select relrowsecurity ok from pg_class where oid=$1::regclass',[table])).rows[0].ok,true);
  assert.equal((await db.query("select has_table_privilege('anon',$1,'select') ok",[table])).rows[0].ok,false);
  assert.equal((await db.query("select has_table_privilege('authenticated',$1,'update') ok",[table])).rows[0].ok,false);
 }
 assert.equal((await db.query("select has_function_privilege('anon','public.save_local_menu(jsonb,integer,boolean,uuid)','execute') ok")).rows[0].ok,false);
 console.log('PASS SQL local menu: service-only/RLS, admin recheck, CAS, drafts/publication, audit, real recipe FK, no destructive stock changes.');
} finally {await db.close();}
