import {
  getDispatchOptions,
  getDispatchSchedule,
  getProductAvailability,
  isCalendarDate,
  isPlanProduct,
  santiagoDate,
} from "./product-availability.js";

export const MONTHLY_MENU_RULE_TEXT =
  "Cuatro entregas semanales con el menú único que Fullnesslab programe para cada fecha. No eliges platos ni se repiten menús automáticamente.";
export const CALENDAR_COLUMNS =
  "week_of,weekly_plan_id,published,revision,updated_at";

export function addCalendarDays(value, days) {
  if (!isCalendarDate(value)) return "";
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekOf(value) {
  return getDispatchOptions(value)?.weekOf || "";
}

export function nextPlanDispatch(now = new Date()) {
  return getDispatchSchedule(santiagoDate(now), now);
}

// A weekly menu belongs to its configured week. Never roll an old recipe
// forward to a date that belongs to a different menu.
export function weeklyMenuDispatch(value, now = new Date()) {
  const reference = getDispatchOptions(value);
  if (!reference) return null;
  const dispatch = getDispatchSchedule(reference.weekOf, now);
  return dispatch.weekOf === reference.weekOf ? dispatch : null;
}

export function buildMonthlyDeliveries(calendar, now = new Date()) {
  const first = nextPlanDispatch(now);
  return Array.from({ length: 4 }, (_, index) => {
    const dispatchOn = addCalendarDays(first.dispatchOn, index * 7);
    const menuWeek = weekOf(dispatchOn);
    const row = calendar.find(
      (entry) => entry.week_of === menuWeek && entry.published === true,
    );
    return {
      deliveryNumber: index + 1,
      weekOf: menuWeek,
      dispatchOn,
      weeklyPlanId: row?.weekly_plan_id || null,
      calendarRevision: row?.revision || null,
      assignmentStatus: row ? "assigned" : "pending_menu",
    };
  });
}

export function applyDispatchCalendar(products, calendar, now = new Date()) {
  const byId = new Map(products.map((item) => [item.id, item]));
  return products.map((product) => {
    if (!isPlanProduct(product)) return product;
    const frequency = product.planFrequency || product.plan_frequency;
    if (frequency === "weekly") {
      const rows = calendar
        .filter((row) => row.published && row.weekly_plan_id === product.id)
        .sort((a, b) => a.week_of.localeCompare(b.week_of));
      const active = rows.find((row) => weeklyMenuDispatch(row.week_of, now));
      return {
        ...product,
        dispatchCalendar: {
          configured: true,
          weekOf: active?.week_of || rows.at(-1)?.week_of || "",
          revision: active?.revision || null,
          published: Boolean(active),
        },
      };
    }
    if (frequency !== "monthly") return product;
    const deliveries = buildMonthlyDeliveries(calendar, now);
    const weeks = deliveries.map((delivery) => {
      const candidate = byId.get(delivery.weeklyPlanId);
      const menu =
        candidate && getProductAvailability(candidate, now).available
          ? candidate
          : null;
      return menu
        ? {
            ...menu,
            weekPosition: delivery.deliveryNumber,
            dispatchOn: delivery.dispatchOn,
            dispatchWeekOf: delivery.weekOf,
            dispatchCalendar: {
              configured: true,
              published: true,
              weekOf: delivery.weekOf,
              revision: delivery.calendarRevision,
            },
          }
        : {
            id: `pending-${delivery.weekOf}`,
            name: "Menú por programar",
            pendingMenu: true,
            includedItems: [],
            weekPosition: delivery.deliveryNumber,
            dispatchOn: delivery.dispatchOn,
          };
    });
    const includedItems = weeks.flatMap((week) => week.includedItems || []);
    const unique = (rows) => [
      ...new Map(
        rows.map((row) => [
          row.id ||
            row.benefitId ||
            row.slug ||
            String(row.name || "")
              .trim()
              .toLocaleLowerCase("es"),
          row,
        ]),
      ).values(),
    ];
    const benefits = unique(weeks.flatMap((week) => week.benefits || []));
    const tags = unique(weeks.flatMap((week) => week.tags || []));
    return {
      ...product,
      includedItems,
      benefits,
      benefitAssignments: benefits,
      benefitTags: benefits.map((row) => row.name),
      tags,
      tagIds: tags.map((row) => row.id).filter(Boolean),
      planDeliveries: deliveries,
      weeklyPlans: weeks,
      weeklyPlanIds: deliveries.map((row) => row.weeklyPlanId).filter(Boolean),
      monthlyWeekCount: 4,
      dispatchPolicy: "calendar_v1",
      dispatchCalendarInvalid: deliveries.some(
        (row) =>
          row.weeklyPlanId &&
          (!byId.has(row.weeklyPlanId) ||
            !getProductAvailability(byId.get(row.weeklyPlanId), now).available),
      ),
      calendarRows: calendar,
      calendarWeekMenus: products.filter(
        (p) =>
          isPlanProduct(p) &&
          (p.planFrequency || p.plan_frequency) === "weekly",
      ),
    };
  });
}
