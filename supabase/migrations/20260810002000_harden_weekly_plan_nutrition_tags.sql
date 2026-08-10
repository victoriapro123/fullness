begin;

-- A hidden weekly draft may exist before it has a valid included_items array.
-- Keep it readable by Backoffice without allowing malformed legacy JSON to
-- make the tag view fail for every plan.
create or replace view public.weekly_plan_nutrition_tags
with (security_invoker = true)
as
select
  weekly.id as weekly_plan_id,
  coalesce(
    (
      select array_agg(distinct definition.id order by definition.id)
      from jsonb_array_elements(
        case
          when jsonb_typeof(coalesce(weekly.included_items, '[]'::jsonb)) = 'array'
            then weekly.included_items
          else '[]'::jsonb
        end
      ) as meal(value)
      left join public.meal_library_items library
        on library.id::text = coalesce(
          nullif(meal.value ->> 'libraryMealId', ''),
          nullif(meal.value ->> 'library_meal_id', '')
        )
      cross join lateral jsonb_array_elements_text(
        case
          when library.id is not null then to_jsonb(library.tag_ids)
          when jsonb_typeof(meal.value -> 'tagIds') = 'array'
            then meal.value -> 'tagIds'
          when jsonb_typeof(meal.value -> 'tag_ids') = 'array'
            then meal.value -> 'tag_ids'
          else '[]'::jsonb
        end
      ) as inherited_tag(tag_id)
      join public.tag_definitions definition
        on definition.id::text = inherited_tag.tag_id
    ),
    '{}'::uuid[]
  ) as tag_ids
from public.menu_items weekly
where weekly.product_type = 'plan'
  and weekly.plan_frequency = 'weekly';

grant select on public.weekly_plan_nutrition_tags to anon, authenticated;
comment on view public.weekly_plan_nutrition_tags is 'Tags nutricionales únicos heredados desde mealpreps de cada semana; tolera borradores con JSON no-array.';

notify pgrst, 'reload schema';

commit;
