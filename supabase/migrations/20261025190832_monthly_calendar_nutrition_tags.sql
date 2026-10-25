begin;
create or replace view public.monthly_plan_nutrition_tags with (security_invoker=true) as
with clock as (select now() at time zone 'America/Santiago' as local_time,
 date_trunc('week',now() at time zone 'America/Santiago')::date as monday),
first_week as (select case when local_time <= monday+interval '3 days 17 hours' then monday else monday+7 end as week_of from clock)
select monthly.id as monthly_plan_id,
 coalesce(array_agg(distinct tag.tag_id order by tag.tag_id) filter(where tag.tag_id is not null),'{}'::uuid[]) as tag_ids
from public.menu_items monthly cross join first_week
left join public.weekly_dispatch_menus calendar on calendar.published and calendar.week_of between first_week.week_of and first_week.week_of+21
left join public.menu_items menu on menu.id=calendar.weekly_plan_id and menu.is_active and coalesce(menu.metadata->'availability'->>'mode','always')<>'paused'
left join public.weekly_plan_nutrition_tags weekly on weekly.weekly_plan_id=menu.id
left join lateral unnest(coalesce(weekly.tag_ids,'{}'::uuid[])) as tag(tag_id) on true
where monthly.product_type='plan' and monthly.plan_frequency='monthly'
group by monthly.id;
comment on view public.monthly_plan_nutrition_tags is 'Tags únicos desde mealpreps de los menús programados para las próximas cuatro entregas; sin repetición automática ni copia estática.';
notify pgrst,'reload schema';
commit;
