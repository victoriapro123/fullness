import {
  buildMonthlyDeliveries,
  CALENDAR_COLUMNS,
  weeklyMenuDispatch,
} from "../src/lib/dispatch-calendar.js";
import {
  getProductAvailability,
  isPlanProduct,
} from "../src/lib/product-availability.js";

export function calendarError(message, statusCode = 409) {
  return Object.assign(new Error(message), {
    statusCode,
    code: "DISPATCH_CALENDAR_ERROR",
  });
}
function completeMenu(menu) {
  const meals = menu?.included_items;
  return (
    menu?.product_type === "plan" &&
    menu?.plan_frequency === "weekly" &&
    menu?.is_active === true &&
    getProductAvailability(menu).available &&
    Array.isArray(meals) &&
    meals.length === 6 &&
    new Set(
      meals
        .map((item) => item.libraryMealId || item.library_meal_id || item.id)
        .filter(Boolean),
    ).size === 6
  );
}
export async function resolveDispatchProducts(
  products,
  { supabase, now = new Date() } = {},
) {
  if (!products.some(isPlanProduct)) return products;
  const { data: calendar, error } = await supabase
    .from("weekly_dispatch_menus")
    .select(CALENDAR_COLUMNS)
    .eq("published", true)
    .order("week_of", { ascending: true });
  if (error)
    throw calendarError(
      "No pudimos validar la programación de menús. Intenta nuevamente.",
      503,
    );
  const plans = products.some(
    (p) => p.product_type === "plan" && p.plan_frequency === "monthly",
  )
    ? buildMonthlyDeliveries(calendar || [], now)
    : [];
  const menuIds = [
    ...new Set(plans.map((row) => row.weeklyPlanId).filter(Boolean)),
  ];
  const menus = menuIds.length
    ? await supabase
        .from("menu_items")
        .select("*")
        .in("id", menuIds)
        .eq("is_active", true)
    : { data: [], error: null };
  if (menus.error)
    throw calendarError("No pudimos validar los menús de las entregas.", 503);
  const byId = new Map((menus.data || []).map((menu) => [menu.id, menu]));
  for (const id of menuIds)
    if (!completeMenu(byId.get(id)))
      throw calendarError(
        "Hay un menú programado oculto, pausado o incompleto. Fullnesslab debe revisar esa semana.",
        503,
      );
  return products.map((product) => {
    if (!isPlanProduct(product)) return product;
    if (product.plan_frequency === "monthly")
      return {
        ...product,
        dispatch_plan: plans,
        monthly_weeks: menus.data || [],
      };
    const row = (calendar || []).find(
      (entry) =>
        entry.weekly_plan_id === product.id &&
        weeklyMenuDispatch(entry.week_of, now),
    );
    if (!row || !completeMenu(product))
      throw calendarError(
        `${product.name}: elige un menú con una semana de despacho vigente o futura.`,
      );
    const dispatch = weeklyMenuDispatch(row.week_of, now);
    return {
      ...product,
      dispatchCalendar: {
        configured: true,
        published: true,
        weekOf: row.week_of,
        revision: row.revision,
      },
      dispatch_plan: [
        {
          deliveryNumber: 1,
          weekOf: row.week_of,
          dispatchOn: dispatch.dispatchOn,
          weeklyPlanId: product.id,
          calendarRevision: row.revision,
          assignmentStatus: "assigned",
        },
      ],
    };
  });
}
