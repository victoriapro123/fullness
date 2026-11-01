// Ephemeral loopback PostgreSQL/PostgREST, never Supabase production. Reuses
// installed binaries; no runner, service installation or remote credentials.
import {spawn} from 'node:child_process';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer,request as httpRequest} from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';

export async function startNativePlanStore({postgresBin,postgrestBin}){
 const root=path.resolve('runtime/plan-native-qa.local'),runDir=path.join(root,randomUUID()),dataDir=path.join(runDir,'postgres-data');
 if(!dataDir.startsWith(root+path.sep)||!path.resolve(postgresBin).includes(`${path.sep}.local${path.sep}`))throw Error('Sólo binarios privados revisados y un directorio nuevo de QA.');
 await mkdir(runDir,{recursive:true});
 const port=await freePort(),restPort=await freePort();let started=false,rest,proxy;
 const command=(binary,args)=>new Promise((resolve,reject)=>{
  const child=spawn(path.join(postgresBin,binary),args,{cwd:runDir,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';
  child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);child.once('error',reject);child.once('exit',code=>code?reject(Error(`${binary}: ${output.slice(-1000)}`)):resolve(output));
 });
 const sql=async query=>{
  const file=path.join(runDir,`query-${randomUUID()}.sql`);await writeFile(file,query);
  return command('psql.exe',['-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-f',file]);
 };
 const stop=async()=>{
  if(proxy)await new Promise(resolve=>proxy.close(resolve));
  if(rest&&rest.exitCode===null){const closed=new Promise(resolve=>rest.once('exit',resolve));rest.kill();await closed;}
  if(started){await command('pg_ctl.exe',['stop','-D',dataDir,'-m','fast','-w','-t','25']);started=false;}
 };
 try{
  await command('initdb.exe',['-D',dataDir,'-U','postgres','--encoding=UTF8','--locale=C','-A','trust']);
  await command('pg_ctl.exe',['start','-D',dataDir,'-l',path.join(runDir,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','-t','25']);started=true;
  await sql(`create extension pgcrypto;create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
create table public.profiles(id uuid primary key,is_admin boolean);
create function public.is_admin() returns boolean language sql stable as $$select false$$;
create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);
create table public.meal_library_items(id uuid primary key,name text,description text,photo_url text,is_active boolean,ingredients text[] default '{}',allergens text[] default '{}',nutrition_facts jsonb default '{}');
create table public.menu_items(id uuid primary key default gen_random_uuid(),slug text unique,sku text,name text,description text,photo_url text,price_clp numeric,currency text default 'CLP',library_meal_id uuid references meal_library_items,product_type text,plan_frequency text,is_active boolean default true,ingredients text[] default '{}',allergens text[] default '{}',nutrition_facts jsonb default '{}',metadata jsonb default '{}',updated_at timestamptz default now(),constraint menu_items_product_type_allowed check(product_type in ('plan','family')),constraint menu_items_product_type_frequency_consistency check((product_type='family' and plan_frequency is null)or(product_type='plan'and plan_frequency in('weekly','monthly'))));
create table public.orders(id uuid primary key default gen_random_uuid(),checkout_mode text default 'live',client_id uuid,status text,payment_status text,delivery_status text,subtotal_clp numeric,discount_clp numeric default 0,delivery_fee_clp numeric default 0,total_clp numeric,currency text,note text,customer_snapshot jsonb default '{}',ordered_at timestamptz default now(),created_at timestamptz default now(),paid_at timestamptz,mercadopago_preference_id text,mercadopago_external_reference text);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid references orders,product_id uuid references menu_items,quantity integer,unit_price_clp numeric,total_clp numeric,product_name text,product_snapshot jsonb,ingredients text[],nutrition_description text);
grant usage on schema public,auth to anon,authenticated,service_role;grant all on all tables in schema public to service_role;`);
  for(const name of ['20261019001000_core360_commerce_integration.sql','20261031151351_stock_letter_custom_plans.sql','20261031154839_custom_plan_six_twentyfour_max_two.sql','20261101144848_restaurant_menu_availability.sql','20261101183957_plan_product_links.sql','20261101190326_plan_checkout_outbox_events.sql'])await sql(await readFile(path.join('supabase/migrations',name),'utf8'));
  const secret=randomBytes(32).toString('hex'),configPath=path.join(runDir,'postgrest.conf');
  await writeFile(configPath,[`db-uri="postgres://postgres@127.0.0.1:${port}/postgres"`,'db-schemas="public"','db-anon-role="anon"',`jwt-secret="${secret}"`,'server-host="127.0.0.1"',`server-port=${restPort}`].join('\n'));
  rest=spawn(postgrestBin,[configPath],{cwd:runDir,windowsHide:true,env:{...process.env,Path:`${postgresBin};${process.env.Path||''}`},stdio:['ignore','ignore','ignore']});
  const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),body=`${encode({alg:'HS256',typ:'JWT'})}.${encode({role:'service_role',exp:Math.floor(Date.now()/1000)+3600})}`,token=`${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;
  const deadline=Date.now()+15000;let ready=false;
  while(Date.now()<deadline){if(rest.exitCode!==null)throw Error('PostgREST no arrancó.');try{ready=(await fetch(`http://127.0.0.1:${restPort}/menu_items?select=id&limit=0`,{headers:{Authorization:`Bearer ${token}`}})).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,75));}
  if(!ready)throw Error('PostgREST aislado no respondió.');
  proxy=createServer((req,res)=>{if(!req.url.startsWith('/rest/v1')){res.writeHead(404).end();return;}const upstream=httpRequest({host:'127.0.0.1',port:restPort,path:req.url.replace(/^\/rest\/v1/,'')||'/',method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});upstream.once('error',()=>res.writeHead(502).end());req.pipe(upstream);});
  await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(0,'127.0.0.1',resolve);});
  const supabase=createClient(`http://127.0.0.1:${proxy.address().port}`,token,{auth:{persistSession:false,autoRefreshToken:false}});
  return {supabase,sql,stop,runDir,postgresPort:port,restPort};
 }catch(e){await stop();throw e;}
}
async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const {port}=server.address();await new Promise(resolve=>server.close(resolve));return port;}
