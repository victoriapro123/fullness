begin;

create table if not exists public.ecommerce_shop_settings (
  id text primary key default 'main',
  hero_eyebrow text,
  hero_title text,
  hero_body text,
  hero_image_url text,
  hero_image_storage_path text,
  hero_primary_label text,
  hero_secondary_label text,
  hero_metrics text[] not null default '{}',
  subscription_eyebrow text,
  subscription_title text,
  subscription_body text,
  subscription_cta_label text,
  subscription_benefits text[] not null default '{}',
  subscription_comparison jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecommerce_shop_settings_singleton check (id = 'main'),
  constraint ecommerce_shop_settings_comparison_array check (jsonb_typeof(subscription_comparison) = 'array')
);

alter table public.ecommerce_shop_settings
  add column if not exists hero_eyebrow text,
  add column if not exists hero_title text,
  add column if not exists hero_body text,
  add column if not exists hero_image_url text,
  add column if not exists hero_image_storage_path text,
  add column if not exists hero_primary_label text,
  add column if not exists hero_secondary_label text,
  add column if not exists hero_metrics text[] not null default '{}',
  add column if not exists subscription_eyebrow text,
  add column if not exists subscription_title text,
  add column if not exists subscription_body text,
  add column if not exists subscription_cta_label text,
  add column if not exists subscription_benefits text[] not null default '{}',
  add column if not exists subscription_comparison jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ecommerce_shop_settings_singleton') then
    alter table public.ecommerce_shop_settings
      add constraint ecommerce_shop_settings_singleton check (id = 'main') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'ecommerce_shop_settings_comparison_array') then
    alter table public.ecommerce_shop_settings
      add constraint ecommerce_shop_settings_comparison_array check (jsonb_typeof(subscription_comparison) = 'array') not valid;
  end if;
end $$;

insert into public.ecommerce_shop_settings (
  id,
  hero_eyebrow,
  hero_title,
  hero_body,
  hero_primary_label,
  hero_secondary_label,
  hero_metrics,
  subscription_eyebrow,
  subscription_title,
  subscription_body,
  subscription_cta_label,
  subscription_benefits,
  subscription_comparison
)
values (
  'main',
  'Nutrir desde la raíz',
  'Alimentación consciente, organizada para toda la semana.',
  'Platos diseñados por chef y nutricionista para que comer bien sea simple, práctico y delicioso.',
  'Ver planes semanales',
  'Suscribirme',
  array['5 proteínas independientes', '5 acompañamientos independientes', 'Combina como quieras durante la semana'],
  'Suscripción Fullness',
  'La forma más conveniente de alimentarte toda la semana.',
  'Recibe 4 semanas al mes con mejor valor que la compra semanal.',
  'Suscribirme ahora',
  array['4 semanas diferentes cada mes', 'Menús renovados constantemente', 'Mejor precio', 'Prioridad de producción', 'Cancela cuando quieras'],
  '[
    {"label": "Precio", "subscription": "Mejor valor", "weekly": "Precio normal"},
    {"label": "Renovación", "subscription": "Automática", "weekly": "Manual"},
    {"label": "Menús", "subscription": "4 semanas", "weekly": "1 semana"},
    {"label": "Prioridad", "subscription": "Sí", "weekly": "No"},
    {"label": "Flexibilidad", "subscription": "Cancela cuando quieras", "weekly": "Compra cuando quieras"}
  ]'::jsonb
)
on conflict (id) do nothing;

alter table public.ecommerce_shop_settings enable row level security;

drop policy if exists "Shop settings are public" on public.ecommerce_shop_settings;
create policy "Shop settings are public"
  on public.ecommerce_shop_settings
  for select
  using (true);

drop policy if exists "Admins manage shop settings" on public.ecommerce_shop_settings;
create policy "Admins manage shop settings"
  on public.ecommerce_shop_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_ecommerce_shop_settings_updated_at on public.ecommerce_shop_settings;
create trigger set_ecommerce_shop_settings_updated_at
  before update on public.ecommerce_shop_settings
  for each row
  execute function public.set_updated_at();

comment on table public.ecommerce_shop_settings is 'Contenido autogestionable para la tienda meal prep.';
comment on column public.ecommerce_shop_settings.hero_image_url is 'Imagen pública del hero ecommerce, usualmente servida desde R2.';
comment on column public.ecommerce_shop_settings.hero_metrics is 'Tres métricas cortas visibles bajo los CTA del hero.';
comment on column public.ecommerce_shop_settings.subscription_comparison is 'Filas del cuadro comparativo de suscripción versus compra semanal.';

commit;
