begin;

create table if not exists public.backoffice_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'meal-prep',
  draft_key text not null,
  title text not null default 'Meal prep sin titulo',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint backoffice_drafts_scope_check check (scope in ('meal-prep', 'meal-library')),
  constraint backoffice_drafts_owner_scope_key_unique unique (owner_id, scope, draft_key)
);

alter table public.backoffice_drafts
  drop constraint if exists backoffice_drafts_scope_check;

alter table public.backoffice_drafts
  drop constraint if exists backoffice_drafts_owner_key_unique;

alter table public.backoffice_drafts
  add constraint backoffice_drafts_scope_check
  check (scope in ('meal-prep', 'meal-library'));

create unique index if not exists backoffice_drafts_owner_scope_key_unique
  on public.backoffice_drafts (owner_id, scope, draft_key);

create index if not exists backoffice_drafts_owner_scope_updated_idx
  on public.backoffice_drafts (owner_id, scope, updated_at desc);

create or replace function public.touch_backoffice_drafts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_backoffice_drafts_updated_at on public.backoffice_drafts;
create trigger set_backoffice_drafts_updated_at
before update on public.backoffice_drafts
for each row execute function public.touch_backoffice_drafts_updated_at();

alter table public.backoffice_drafts enable row level security;

drop policy if exists backoffice_drafts_owner_all on public.backoffice_drafts;
create policy backoffice_drafts_owner_all
on public.backoffice_drafts for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

grant select, insert, update, delete on public.backoffice_drafts to authenticated;

comment on table public.backoffice_drafts is 'Borradores protegidos del backoffice, aislados por administradora y sincronizados entre dispositivos.';

commit;
