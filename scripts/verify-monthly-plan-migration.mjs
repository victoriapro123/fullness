const projectIndex = process.argv.indexOf("--project-ref");
const projectRef = projectIndex >= 0 ? process.argv[projectIndex + 1] : "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  throw new Error(
    "Uso: node scripts/verify-monthly-plan-migration.mjs --project-ref <ref> con SUPABASE_ACCESS_TOKEN inyectado temporalmente."
  );
}

const query = `
  with weekly as (
    select
      jsonb_array_length(included_items) as meal_count,
      (
        select count(distinct coalesce(
          nullif(item ->> 'libraryMealId', ''),
          nullif(item ->> 'library_meal_id', ''),
          nullif(item ->> 'id', '')
        ))
        from jsonb_array_elements(included_items) as item
      ) as distinct_meal_count
    from public.menu_items
    where product_type = 'plan'
      and plan_frequency = 'weekly'
      and is_active is true
  )
  select
    to_regclass('public.monthly_plan_weeks') is not null as link_table_exists,
    exists (
      select 1 from pg_proc proc
      join pg_namespace ns on ns.oid = proc.pronamespace
      where ns.nspname = 'public'
        and proc.proname = 'replace_monthly_plan_weeks'
    ) as replacement_rpc_exists,
    exists (
      select 1 from pg_views
      where schemaname = 'public' and viewname = 'weekly_plan_nutrition_tags'
    ) as weekly_tag_view_exists,
    exists (
      select 1 from pg_views
      where schemaname = 'public' and viewname = 'monthly_plan_nutrition_tags'
    ) as monthly_tag_view_exists,
    (select count(*) from public.monthly_plan_weeks) as link_count,
    count(*) as active_weekly_count,
    count(*) filter (where meal_count = 6 and distinct_meal_count = 6) as valid_weekly_count
  from weekly;
`;

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query })
});

if (!response.ok) {
  throw new Error(`Migration verification failed: ${response.status} ${await response.text()}`);
}

const [result = {}] = await response.json();
const summary = {
  linkTableExists: Boolean(result.link_table_exists),
  replacementRpcExists: Boolean(result.replacement_rpc_exists),
  weeklyTagViewExists: Boolean(result.weekly_tag_view_exists),
  monthlyTagViewExists: Boolean(result.monthly_tag_view_exists),
  linkCount: Number(result.link_count || 0),
  activeWeeklyCount: Number(result.active_weekly_count || 0),
  validWeeklyCount: Number(result.valid_weekly_count || 0)
};

console.log(JSON.stringify(summary));

if (
  !summary.linkTableExists ||
  !summary.replacementRpcExists ||
  !summary.weeklyTagViewExists ||
  !summary.monthlyTagViewExists ||
  summary.linkCount !== 0 ||
  summary.activeWeeklyCount !== 4 ||
  summary.validWeeklyCount !== 4
) {
  throw new Error("La verificación posterior a la migración no alcanzó el estado esperado.");
}
