import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import net from "node:net";
import path from "node:path";

const bin = process.argv[process.argv.indexOf("--postgres-bin") + 1];
assert.ok(
  process.argv.includes("--postgres-bin") && path.isAbsolute(bin),
  "Indica los binarios PostgreSQL locales aprobados",
);
const run = path.resolve("runtime", "dispatch-calendar-sql", randomUUID());
await mkdir(run, { recursive: true });
const data = path.join(run, "data");
const port = await new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, "127.0.0.1", () => {
    const p = server.address().port;
    server.close(() => resolve(p));
  });
});
function command(name, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(path.join(bin, name + ".exe"), args, {
      windowsHide: true,
      env: { ...process.env, Path: `${bin};${process.env.Path || ""}` },
    });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(output) : reject(Error(output)),
    );
  });
}
let started = false;
try {
  await command("initdb", [
    "-D",
    data,
    "-U",
    "postgres",
    "--encoding=UTF8",
    "--locale=C",
    "-A",
    "trust",
  ]);
  await command("pg_ctl", [
    "start",
    "-D",
    data,
    "-l",
    path.join(run, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${port}`,
    "-w",
    "-t",
    "25",
  ]);
  started = true;
  const previous = await readFile(
    "supabase/migrations/20260810001000_monthly_plan_weeks.sql",
    "utf8",
  );
  const validation = previous.match(
    /create or replace function public\.validate_menu_item_plan_composition\(\)[\s\S]*?\n\$\$;/i,
  )?.[0];
  assert.ok(validation);
  const migration = await readFile(
    "supabase/migrations/20261025184224_dated_weekly_menu_calendar.sql",
    "utf8",
  );
  const fixture = `create role anon;create role authenticated;create role service_role bypassrls;
create table public.profiles(id uuid primary key,is_admin boolean);
create table public.menu_items(id uuid primary key,name text,slug text,sku text,product_type text,plan_frequency text,is_active boolean,metadata jsonb default '{}',included_items jsonb default '[]',updated_at timestamptz default now());
create table public.orders(id uuid primary key,status text,payment_status text,delivery_status text);
create table public.order_items(id uuid primary key,order_id uuid references public.orders,product_id uuid references public.menu_items,quantity integer,product_snapshot jsonb);
create table public.monthly_plan_weeks(monthly_plan_id uuid,weekly_plan_id uuid);
grant usage on schema public to anon,authenticated,service_role;
grant select on public.menu_items to anon,authenticated;
grant all on all tables in schema public to service_role;
insert into public.profiles values('10000000-0000-4000-8000-000000000001',true),('10000000-0000-4000-8000-000000000002',false);
insert into public.menu_items select ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'Menú QA '||i,'menu-'||i,'QA-'||i,'plan','weekly',true,jsonb_build_object('availability',jsonb_build_object('mode','scheduled','starts_on',to_char(date_trunc('week',now() at time zone 'America/Santiago')::date+7*i,'YYYY-MM-DD'))),(select jsonb_agg(jsonb_build_object('id','meal-'||j,'name','Plato QA '||j)) from generate_series(1,6) j),now() from generate_series(1,4) i;
insert into public.menu_items values('20000000-0000-4000-8000-000000000009','Mensual QA','mensual','QA-M','plan','monthly',false,'{}','[]',now());
insert into public.monthly_plan_weeks select '20000000-0000-4000-8000-000000000009',id from public.menu_items where plan_frequency='weekly';
${validation}
create trigger validate_menu before insert or update on public.menu_items for each row execute function public.validate_menu_item_plan_composition();
update public.menu_items set is_active=true where plan_frequency='monthly';
`;
  const nutritionMigration = await readFile(
    "supabase/migrations/20261025190832_monthly_calendar_nutrition_tags.sql",
    "utf8",
  );
  const nutritionFixture = `create view public.weekly_plan_nutrition_tags with(security_invoker=true) as select id as weekly_plan_id,array['50000000-0000-4000-8000-000000000001'::uuid] as tag_ids from public.menu_items where plan_frequency='weekly';
 create view public.monthly_plan_nutrition_tags with(security_invoker=true) as select id as monthly_plan_id,'{}'::uuid[] as tag_ids from public.menu_items where plan_frequency='monthly';
 grant select on public.weekly_plan_nutrition_tags,public.monthly_plan_nutrition_tags to anon,authenticated,service_role;`;
  const tests = `begin;
create function public.qa_assert(value boolean,msg text) returns void language plpgsql as $$begin if value is distinct from true then raise exception '%',msg;end if;end$$;
select qa_assert((select count(*) from weekly_dispatch_menus)=4,'Exactamente cuatro fechas originales');
select qa_assert((select count(*) from menu_items where metadata->>'dispatch_policy'='calendar_v1')=1,'Mensual por calendario');
select qa_assert((select cardinality(tag_ids) from monthly_plan_nutrition_tags)=1,'Tags de cuatro menús deduplicados');
select qa_assert(next_plan_dispatch('2026-10-26T20:00:00Z')='2026-10-27','Lunes17 incluido');
select qa_assert(next_plan_dispatch('2026-10-29T20:00:00Z')='2026-10-30','Jueves17 incluido');
select qa_assert(next_plan_dispatch('2026-10-29T20:00:00.001Z')='2026-11-03','Jueves17 vencido');
set local role anon;
select public.qa_assert((select count(*) from public.weekly_dispatch_menus)=4,'Lectura pública');
do $$begin perform public.save_dispatch_menu(current_date,'20000000-0000-4000-8000-000000000001',true,1,'10000000-0000-4000-8000-000000000001',false);raise exception 'Anon pudo guardar';exception when insufficient_privilege then null;end$$;
do $$begin perform 1 from public.order_plan_deliveries;raise exception 'Anon vio pedidos';exception when insufficient_privilege then null;end$$;
reset role;
do $$begin perform public.save_dispatch_menu((select min(week_of) from weekly_dispatch_menus),'20000000-0000-4000-8000-000000000001',true,1,'10000000-0000-4000-8000-000000000002',false);raise exception 'No admin pudo guardar';exception when insufficient_privilege then null;end$$;
select save_dispatch_menu((select max(week_of) from weekly_dispatch_menus),'20000000-0000-4000-8000-000000000004',false,1,'10000000-0000-4000-8000-000000000001',false);
do $$begin perform save_dispatch_menu((select max(week_of) from weekly_dispatch_menus),'20000000-0000-4000-8000-000000000004',true,1,'10000000-0000-4000-8000-000000000001',false);raise exception 'CAS viejo pudo guardar';exception when serialization_failure then null;end$$;
insert into orders values('30000000-0000-4000-8000-000000000001','paid','approved','pending');
insert into order_items select '40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000009',1,
jsonb_build_object('productType','plan','planFrequency','monthly','planStructure','dispatch_calendar_v1','dispatchPlan',(select jsonb_agg(jsonb_build_object('deliveryNumber',i+1,'dispatchOn',next_plan_dispatch()+7*i,'weekOf',date_trunc('week',(next_plan_dispatch()+7*i)::timestamp)::date,'calendarRevision',c.revision) order by i) from generate_series(0,3) i left join weekly_dispatch_menus c on c.week_of=date_trunc('week',(next_plan_dispatch()+7*i)::timestamp)::date and c.published));
select qa_assert((select count(*) from order_plan_deliveries)=4,'Cuatro entregas durables');
select qa_assert((select count(*) from order_plan_deliveries where weekly_plan_id is null)=1,'Fecha sin menú pendiente');
select save_dispatch_menu((select max(week_of) from weekly_dispatch_menus),'20000000-0000-4000-8000-000000000004',true,2,'10000000-0000-4000-8000-000000000001',false);
select qa_assert((select count(*) from order_plan_deliveries where weekly_plan_id is null)=0,'Asignación posterior al programar');
do $$begin perform save_dispatch_menu((select max(week_of) from weekly_dispatch_menus),'20000000-0000-4000-8000-000000000001',true,3,'10000000-0000-4000-8000-000000000001',false);raise exception 'Reasignación sin confirmar';exception when raise_exception then if sqlerrm='Reasignación sin confirmar' then raise;end if;end$$;
select save_dispatch_menu((select max(week_of) from weekly_dispatch_menus),'20000000-0000-4000-8000-000000000001',true,3,'10000000-0000-4000-8000-000000000001',true);
select qa_assert((select count(*) from dispatch_calendar_audit where action='delivery_assigned')=2,'Auditoría conservada');
select qa_assert((select count(*) from weekly_dispatch_menus)=4,'Sin ciclos ni fechas extras');
select 'CALENDAR_SQL_QA_PASSED' as result;
rollback;`;
  const file = path.join(run, "fixture-and-qa.sql");
  await writeFile(
    file,
    fixture +
      "\n" +
      migration +
      "\n" +
      nutritionFixture +
      "\n" +
      nutritionMigration +
      "\n" +
      tests,
  );
  const output = await command("psql", [
    "-X",
    "-q",
    "-h",
    "127.0.0.1",
    "-p",
    String(port),
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    file,
  ]);
  assert.match(output, /CALENDAR_SQL_QA_PASSED/);
  const receipt = {
    passed: true,
    postgres: "17.11 loopback aislado",
    testRun: run,
    checks: [
      "cuatro fechas iniciales sin ciclo",
      "RLS anon sin pedidos ni escrituras",
      "propietario validado",
      "CAS obsoleto rechazado",
      "cortes17h exactos",
      "cuatro entregas persistidas",
      "menú pendiente asignado posteriormente",
      "reasignación requiere confirmación",
      "auditoría íntegra",
    ],
    remoteMutations: 0,
  };
  await writeFile(
    path.join(run, "receipt.json"),
    JSON.stringify(receipt, null, 2),
  );
  console.log(JSON.stringify(receipt));
} finally {
  if (started)
    await command("pg_ctl", [
      "stop",
      "-D",
      data,
      "-m",
      "fast",
      "-w",
      "-t",
      "25",
    ]);
}
