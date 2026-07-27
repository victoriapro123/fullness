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
  constraint backoffice_drafts_scope_check check (scope in ('meal-prep')),
  constraint backoffice_drafts_owner_scope_key_unique unique (owner_id, scope, draft_key)
);

create index if not exists backoffice_drafts_owner_scope_updated_idx
  on public.backoffice_drafts (owner_id, scope, updated_at desc);

drop trigger if exists set_backoffice_drafts_updated_at on public.backoffice_drafts;
create trigger set_backoffice_drafts_updated_at
before update on public.backoffice_drafts
for each row execute function public.set_updated_at();

alter table public.backoffice_drafts enable row level security;

drop policy if exists backoffice_drafts_owner_all on public.backoffice_drafts;
create policy backoffice_drafts_owner_all
on public.backoffice_drafts for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

grant select, insert, update, delete on public.backoffice_drafts to authenticated;

comment on table public.backoffice_drafts is 'Borradores protegidos del backoffice, aislados por administradora y sincronizados entre dispositivos.';

insert into public.backoffice_drafts (owner_id, scope, draft_key, title, payload)
select
  profiles.id,
  'meal-prep',
  'recovered-video-2026-07-25',
  'Meal prep semanal',
  jsonb_build_object(
    'form',
    jsonb_build_object(
      'id', '',
      'name', 'meal prep semanal',
      'slug', 'meal-prep-semanal',
      'sku', '',
      'productType', 'plan',
      'planFrequency', 'weekly',
      'tag', '6 meal preps',
      'description', '',
      'photoUrl', '',
      'photoStoragePath', '',
      'secondaryPhotoUrl', '',
      'secondaryPhotoStoragePath', '',
      'priceClp', '54780',
      'benefitTags', '',
      'ingredients', '',
      'nutritionDescription', '',
      'nutritionHighlights', '',
      'nutritionDetail', '',
      'nutritionFacts', '{}',
      'recipeSummary', '',
      'recipeSteps', '',
      'allergens', '',
      'includedItems',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'recovered-pollo-camote-curcuma',
          'libraryMealId', '',
          'name', 'Pollo, camote y cúrcuma',
          'tag', 'Energético',
          'description', '',
          'photoUrl', '',
          'photoStoragePath', '',
          'secondaryPhotoUrl', '',
          'secondaryPhotoStoragePath', '',
          'benefitTags', '',
          'ingredients', '',
          'nutritionDescription', '',
          'nutritionHighlights', '',
          'nutritionFacts', '{}',
          'allergens', ''
        )
      ),
      'servingLabel', '',
      'purchaseLabel', '',
      'displayOrder', '40',
      'isActive', true
    )
  )
from public.profiles as profiles
where lower(profiles.email) = 'cecilia.prueba@fullnesslab.com'
on conflict (owner_id, scope, draft_key) do nothing;

commit;
