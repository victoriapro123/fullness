begin;

-- A separate scope prevents legacy shop/lightbox upserts from replacing the landing gallery.
create function public.valid_landing_local_photos(value jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare photo jsonb; seen text[] := '{}';
begin
  if jsonb_typeof(value) <> 'array' or jsonb_array_length(value) > 12 then return false; end if;
  for photo in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(photo) <> 'object'
      or photo - array['id','label','url','storagePath'] <> '{}'::jsonb
      or coalesce(photo->>'id','') !~ '^[a-zA-Z0-9-]{1,64}$'
      or (photo->>'id') = any(seen)
      or length(trim(coalesce(photo->>'label',''))) not between 1 and 120
      or length(coalesce(photo->>'storagePath','')) > 512
      or not (coalesce(photo->>'url','') ~ '^/images/landing-local/[a-z0-9-]+[.]jpeg$'
        or coalesce(photo->>'url','') ~ '^/api/media[?]key=images(%2F|/)landing-local(%2F|/)[A-Za-z0-9%/_.-]+$')
    then return false; end if;
    seen := array_append(seen, photo->>'id');
  end loop;
  return true;
end;
$$;

create table public.landing_local_gallery (
  id text primary key check (id = 'main'),
  photos jsonb not null default '[]'::jsonb check (public.valid_landing_local_photos(photos)),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create function public.touch_landing_local_gallery()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := statement_timestamp();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger landing_local_gallery_revision before update on public.landing_local_gallery
for each row execute function public.touch_landing_local_gallery();

alter table public.landing_local_gallery enable row level security;
create policy landing_local_gallery_read on public.landing_local_gallery for select to anon, authenticated using (true);
create policy landing_local_gallery_admin_update on public.landing_local_gallery for update to authenticated
using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true))
with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true));

revoke all on public.landing_local_gallery from public, anon, authenticated;
grant select (id,photos,revision) on public.landing_local_gallery to anon,authenticated;
grant update (photos) on public.landing_local_gallery to authenticated;
grant all on public.landing_local_gallery to service_role;
revoke all on function public.valid_landing_local_photos(jsonb) from public;
grant execute on function public.valid_landing_local_photos(jsonb) to authenticated,service_role;
revoke all on function public.touch_landing_local_gallery() from public;

insert into public.landing_local_gallery(id,photos) values ('main', '[
  {"id":"exterior","label":"Exterior y terraza","url":"/images/landing-local/exterior.jpeg","storagePath":""},
  {"id":"interior","label":"Interior del local","url":"/images/landing-local/interior.jpeg","storagePath":""},
  {"id":"meson","label":"Mesón de cafetería","url":"/images/landing-local/meson.jpeg","storagePath":""},
  {"id":"terraza","label":"Terraza Fullness Lab","url":"/images/landing-local/terraza.jpeg","storagePath":""},
  {"id":"experiencia","label":"Experiencia en el local","url":"/images/landing-local/experiencia.jpeg","storagePath":""},
  {"id":"preparaciones","label":"Preparaciones Fullness Lab","url":"/images/landing-local/preparaciones.jpeg","storagePath":""}
]');

comment on table public.landing_local_gallery is 'Landing: galería del local. Edición administrativa con revisión optimista; sin efectos en otros ámbitos ni borrado de medios.';
commit;
