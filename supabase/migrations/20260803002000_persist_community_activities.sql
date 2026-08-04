begin;

alter table public.ecommerce_shop_settings
  add column if not exists community_activities jsonb;

comment on column public.ecommerce_shop_settings.community_activities is
  'Agenda de Comunidad gestionada desde Backoffice. Nulo conserva la agenda local heredada hasta su primera publicación.';

commit;
