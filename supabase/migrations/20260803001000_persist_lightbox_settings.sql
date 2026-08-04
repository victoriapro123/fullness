begin;

alter table public.ecommerce_shop_settings
  add column if not exists lightbox_enabled boolean not null default true,
  add column if not exists lightbox_eyebrow text,
  add column if not exists lightbox_title text,
  add column if not exists lightbox_body text,
  add column if not exists lightbox_cta_label text,
  add column if not exists lightbox_secondary_cta_label text,
  add column if not exists lightbox_success_cta_label text,
  add column if not exists lightbox_background_url text,
  add column if not exists lightbox_background_storage_path text;

comment on column public.ecommerce_shop_settings.lightbox_background_url is
  'Imagen de fondo del lightbox de suscripción, servida desde R2.';
comment on column public.ecommerce_shop_settings.lightbox_background_storage_path is
  'Clave R2 de la imagen de fondo del lightbox de suscripción.';

commit;
