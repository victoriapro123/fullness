begin;

create table if not exists public.ecommerce_content_versions (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('shop', 'lightbox', 'community')),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists ecommerce_content_versions_scope_created_at_idx
  on public.ecommerce_content_versions (scope, created_at desc);

alter table public.ecommerce_content_versions enable row level security;

drop policy if exists "Admins view ecommerce content history" on public.ecommerce_content_versions;
create policy "Admins view ecommerce content history"
  on public.ecommerce_content_versions
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins append ecommerce content history" on public.ecommerce_content_versions;
create policy "Admins append ecommerce content history"
  on public.ecommerce_content_versions
  for insert
  to authenticated
  with check (public.is_admin());

create or replace function public.capture_ecommerce_content_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_shop jsonb;
  next_shop jsonb;
  previous_lightbox jsonb;
  next_lightbox jsonb;
  previous_community jsonb;
  next_community jsonb;
  version_created_at timestamptz;
begin
  previous_shop := jsonb_build_object(
    'heroEyebrow', old.hero_eyebrow,
    'heroTitle', old.hero_title,
    'heroBody', old.hero_body,
    'heroImageUrl', old.hero_image_url,
    'heroImageStoragePath', old.hero_image_storage_path,
    'heroPrimaryLabel', old.hero_primary_label,
    'heroSecondaryLabel', old.hero_secondary_label,
    'heroMetrics', coalesce(to_jsonb(old.hero_metrics), '[]'::jsonb),
    'subscriptionEyebrow', old.subscription_eyebrow,
    'subscriptionTitle', old.subscription_title,
    'subscriptionBody', old.subscription_body,
    'subscriptionCtaLabel', old.subscription_cta_label,
    'subscriptionBenefits', coalesce(to_jsonb(old.subscription_benefits), '[]'::jsonb),
    'subscriptionComparison', coalesce(old.subscription_comparison, '[]'::jsonb)
  );
  next_shop := jsonb_build_object(
    'heroEyebrow', new.hero_eyebrow,
    'heroTitle', new.hero_title,
    'heroBody', new.hero_body,
    'heroImageUrl', new.hero_image_url,
    'heroImageStoragePath', new.hero_image_storage_path,
    'heroPrimaryLabel', new.hero_primary_label,
    'heroSecondaryLabel', new.hero_secondary_label,
    'heroMetrics', coalesce(to_jsonb(new.hero_metrics), '[]'::jsonb),
    'subscriptionEyebrow', new.subscription_eyebrow,
    'subscriptionTitle', new.subscription_title,
    'subscriptionBody', new.subscription_body,
    'subscriptionCtaLabel', new.subscription_cta_label,
    'subscriptionBenefits', coalesce(to_jsonb(new.subscription_benefits), '[]'::jsonb),
    'subscriptionComparison', coalesce(new.subscription_comparison, '[]'::jsonb)
  );
  previous_lightbox := jsonb_build_object(
    'enabled', old.lightbox_enabled,
    'eyebrow', old.lightbox_eyebrow,
    'title', old.lightbox_title,
    'body', old.lightbox_body,
    'ctaLabel', old.lightbox_cta_label,
    'secondaryCtaLabel', old.lightbox_secondary_cta_label,
    'successCtaLabel', old.lightbox_success_cta_label,
    'backgroundUrl', old.lightbox_background_url,
    'backgroundStoragePath', old.lightbox_background_storage_path
  );
  next_lightbox := jsonb_build_object(
    'enabled', new.lightbox_enabled,
    'eyebrow', new.lightbox_eyebrow,
    'title', new.lightbox_title,
    'body', new.lightbox_body,
    'ctaLabel', new.lightbox_cta_label,
    'secondaryCtaLabel', new.lightbox_secondary_cta_label,
    'successCtaLabel', new.lightbox_success_cta_label,
    'backgroundUrl', new.lightbox_background_url,
    'backgroundStoragePath', new.lightbox_background_storage_path
  );
  previous_community := jsonb_build_object(
    'communityActivities', old.community_activities,
    'communityActivitiesConfigured', old.community_activities is not null
  );
  next_community := jsonb_build_object(
    'communityActivities', new.community_activities,
    'communityActivitiesConfigured', new.community_activities is not null
  );
  version_created_at := coalesce(old.updated_at, now());

  if previous_shop is distinct from next_shop then
    insert into public.ecommerce_content_versions (scope, snapshot, created_at, created_by)
    values ('shop', previous_shop, version_created_at, auth.uid());
  end if;

  if previous_lightbox is distinct from next_lightbox then
    insert into public.ecommerce_content_versions (scope, snapshot, created_at, created_by)
    values ('lightbox', previous_lightbox, version_created_at, auth.uid());
  end if;

  if previous_community is distinct from next_community then
    insert into public.ecommerce_content_versions (scope, snapshot, created_at, created_by)
    values ('community', previous_community, version_created_at, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists capture_ecommerce_content_versions on public.ecommerce_shop_settings;
create trigger capture_ecommerce_content_versions
  before update on public.ecommerce_shop_settings
  for each row
  execute function public.capture_ecommerce_content_version();

comment on table public.ecommerce_content_versions is
  'Versiones archivadas automáticamente del contenido web administrado desde Backoffice.';

commit;
