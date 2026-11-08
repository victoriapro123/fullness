import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { DEFAULT_LOCAL_PHOTOS, validateLocalPhotos, createLocalGalleryRepository } from '../src/lib/landing-local.js';

const path = process.argv[process.argv.indexOf('--pglite-module') + 1];
assert.ok(process.argv.includes('--pglite-module'));
const { PGlite } = await import(pathToFileURL(path).href);
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const regular = '00000000-0000-4000-8000-000000000002';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    create table public.profiles(id uuid primary key,is_admin boolean);
    insert into profiles values('${admin}',true),('${regular}',false);
    alter table profiles enable row level security;
    create policy profiles_self on profiles for select to authenticated using(id=auth.uid());
    grant select on profiles to authenticated;
    create table ecommerce_shop_settings(id text primary key,content jsonb);
    insert into ecommerce_shop_settings values('main','{"shop":"untouched","lightbox":"untouched","community":"untouched"}');`);
  await db.exec(await readFile('supabase/migrations/20261108155006_landing_local_gallery.sql', 'utf8'));
  const before = (await db.query('select * from ecommerce_shop_settings')).rows;
  await db.exec('set role anon');
  assert.equal((await db.query("select id,photos,revision from landing_local_gallery where id='main'")).rows[0].photos.length, 6);
  await assert.rejects(db.exec("update landing_local_gallery set photos='[]'"), /permission denied/);
  await assert.rejects(db.exec('select updated_by from landing_local_gallery'), /permission denied/);
  await db.exec('reset role;set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [regular]);
  assert.equal((await db.query("update landing_local_gallery set photos='[]' where id='main' returning id")).rows.length, 0);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
  const replacement = [{...DEFAULT_LOCAL_PHOTOS[2], label:'Foto de prueba'}];
  const client = { from(table) {
    assert.equal(table,'landing_local_gallery'); let payload; const conditions = {};
    const query = { update(value){payload=value;return query;},select(){return query;},eq(k,v){conditions[k]=v;return query;},async single(){return query.maybeSingle();},async maybeSingle(){
      try {
        const response = payload ? await db.query('update landing_local_gallery set photos=$1::jsonb where id=$2 and revision=$3 returning id,photos,revision', [JSON.stringify(payload.photos),conditions.id,conditions.revision]) : await db.query('select id,photos,revision from landing_local_gallery where id=$1',[conditions.id]);
        const data=response.rows[0]||null; if(data)data.revision=Number(data.revision);return {data,error:null};
      }catch(error){return {data:null,error};}
    }};return query;
  }};
  const repo=createLocalGalleryRepository(async()=>client);
  let saved=await repo.load(); assert.equal(saved.revision,1);
  saved=await repo.save(replacement,saved.revision); assert.equal(saved.revision,2); assert.deepEqual((await repo.load()).photos,replacement);
  await assert.rejects(repo.save(DEFAULT_LOCAL_PHOTOS,1), e=>e.code==='CONFLICT');
  saved=await repo.save([],saved.revision);assert.equal(saved.photos.length,0);
  saved=await repo.save(DEFAULT_LOCAL_PHOTOS,saved.revision);assert.equal(saved.photos.length,6);
  await assert.rejects(db.exec("update landing_local_gallery set revision=1"),/permission denied/);
  for(const photos of [[...DEFAULT_LOCAL_PHOTOS,DEFAULT_LOCAL_PHOTOS[0]],[{...replacement[0],url:'javascript:alert(1)'}],[{...replacement[0],url:'https://untrusted.test/a.png'}],[{...replacement[0],label:''}]]){
    assert.throws(()=>validateLocalPhotos(photos));
    await assert.rejects(db.query('update landing_local_gallery set photos=$1::jsonb',[JSON.stringify(photos)]),/check constraint/);
  }
  await assert.rejects(db.exec("insert into landing_local_gallery(id) values('other')"),/permission denied/);
  await db.exec('reset role');
  assert.deepEqual((await db.query('select * from ecommerce_shop_settings')).rows,before);
  assert.equal((await db.query('select updated_by from landing_local_gallery')).rows[0].updated_by,admin);
  console.log('PASS: six originals; anon read/no write; member no write; admin save/reload/remove/restore; stale revision rejected; unsafe photos rejected; audit actor; unrelated scopes unchanged. Local PostgreSQL engine, not remote production.');
} finally { await db.close(); }
