begin;

-- Nutrition belongs to the sellable meal prep, never to its reusable dish records.
update public.meal_library_items
set
  nutrition_description = null,
  nutrition_highlights = '{}',
  nutrition_facts = '{}'::jsonb
where nutrition_description is not null
   or cardinality(nutrition_highlights) > 0
   or nutrition_facts <> '{}'::jsonb;

-- Remove legacy nutrition fields embedded in plans without changing the meal prep's own nutrition.
update public.menu_items
set included_items = coalesce(
  (
    select jsonb_agg(
      item
        - 'nutritionDescription'
        - 'nutrition_description'
        - 'nutritionHighlights'
        - 'nutrition_highlights'
        - 'nutritionFacts'
        - 'nutrition_facts'
    )
    from jsonb_array_elements(included_items) as item
  ),
  '[]'::jsonb
)
where jsonb_typeof(included_items) = 'array';

commit;
