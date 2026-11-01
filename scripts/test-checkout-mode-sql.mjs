import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.argv[process.argv.indexOf('--pglite-module')+1];
assert.ok(process.argv.includes('--pglite-module')&&modulePath);
const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
 create table orders(id uuid primary key default gen_random_uuid(),ordered_at timestamptz default now());
 create table payments(id uuid primary key default gen_random_uuid(),order_id uuid,provider text,provider_payment_id text);
 create table payment_events(id uuid primary key default gen_random_uuid(),provider text,provider_event_id text);
 insert into orders default values;insert into payments(provider,provider_payment_id) values('mercado_pago','historical');
 create unique index payments_provider_payment_unique_idx on payments(provider,provider_payment_id);`);
 const migration=await readFile('supabase/migrations/20261021001000_isolated_mercadopago_test_checkout.sql','utf8');
 await db.exec(migration);await db.exec(migration);
 assert.equal((await db.query('select checkout_mode from orders')).rows[0].checkout_mode,'live');
 assert.equal((await db.query('select checkout_mode from payments')).rows[0].checkout_mode,'live');
 await db.exec("insert into payments(provider,provider_payment_id,checkout_mode)values('mercado_pago','historical','test')");
 await assert.rejects(db.exec("insert into payments(provider,provider_payment_id,checkout_mode)values('mercado_pago','historical','live')"),/duplicate/);
 assert.equal((await db.query("select relrowsecurity from pg_class where relname='checkout_test_sessions'")).rows[0].relrowsecurity,true);
 console.log('PASS: checkout-mode migration preserves historical LIVE, isolates TEST identity, prevents duplicates and keeps private sessions RLS.');
}finally{await db.close();}
