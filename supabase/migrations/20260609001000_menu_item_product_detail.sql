begin;

alter table public.menu_items
  add column if not exists nutrition_highlights text[] not null default '{}',
  add column if not exists nutrition_detail text,
  add column if not exists recipe_summary text,
  add column if not exists recipe_steps text[] not null default '{}';

comment on column public.menu_items.nutrition_highlights is 'Caracteristicas nutricionales breves para lightbox y pagina de producto.';
comment on column public.menu_items.nutrition_detail is 'Detalle nutricional editorial para la pagina individual del menu.';
comment on column public.menu_items.recipe_summary is 'Resumen de receta/preparacion visible en lightbox.';
comment on column public.menu_items.recipe_steps is 'Pasos resumidos de receta/preparacion para la pagina individual del menu.';

commit;
