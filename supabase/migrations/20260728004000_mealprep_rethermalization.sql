begin;

alter table public.meal_library_items
  add column if not exists rethermalization_instructions text not null default '';

comment on column public.meal_library_items.rethermalization_instructions is 'Instrucciones libres para retermalizar o preparar un mealprep individual.';

commit;
