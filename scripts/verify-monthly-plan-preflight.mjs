const projectIndex = process.argv.indexOf("--project-ref");
const projectRef = projectIndex >= 0 ? process.argv[projectIndex + 1] : "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  throw new Error(
    "Uso: node scripts/verify-monthly-plan-preflight.mjs --project-ref <ref> con SUPABASE_ACCESS_TOKEN inyectado temporalmente."
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
    (select count(*) from public.menu_items where product_type = 'plan' and plan_frequency = 'monthly') as monthly_count,
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
  throw new Error(`Preflight query failed: ${response.status} ${await response.text()}`);
}

const [result = {}] = await response.json();
const summary = {
  monthlyCount: Number(result.monthly_count || 0),
  activeWeeklyCount: Number(result.active_weekly_count || 0),
  validWeeklyCount: Number(result.valid_weekly_count || 0)
};

console.log(JSON.stringify(summary));

if (summary.monthlyCount !== 0 || summary.activeWeeklyCount !== 4 || summary.validWeeklyCount !== 4) {
  throw new Error("El preflight no coincide con el alcance seguro: se esperaban 0 mensuales y 4 semanales válidos de 6 mealpreps.");
}
