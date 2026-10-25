import assert from "node:assert/strict";
import {
  applyDispatchCalendar,
  buildMonthlyDeliveries,
  weeklyMenuDispatch,
} from "../src/lib/dispatch-calendar.js";
import { getProductAvailability } from "../src/lib/product-availability.js";
import { resolveDispatchProducts } from "../server/dispatch-calendar.mjs";
import {
  createCheckoutPreference,
  quoteCheckout,
} from "../server/mercadopago-checkout.mjs";

const dates = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"];
const menus = dates.map((date, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  slug: `semana-${i + 1}`,
  name: `Semana ${i + 1}`,
  product_type: "plan",
  plan_frequency: "weekly",
  is_active: true,
  price_clp: 64260,
  metadata: { availability: { mode: "scheduled", starts_on: date } },
  included_items: Array.from({ length: 6 }, (_, j) => ({
    id: `meal-${i}-${j}`,
    name: `Plato ${i}-${j}`,
  })),
}));
const calendar = dates.map((week_of, i) => ({
  week_of,
  weekly_plan_id: menus[i].id,
  published: true,
  revision: 1,
}));
const monthly = {
  id: "00000000-0000-4000-8000-000000000009",
  slug: "mensual",
  name: "Mensual",
  product_type: "plan",
  plan_frequency: "monthly",
  is_active: true,
  price_clp: 237990,
  metadata: {},
  included_items: [],
};
const now = new Date("2026-10-25T18:00:00Z");
const late = new Date("2026-10-29T20:00:01Z");
assert.equal(weeklyMenuDispatch(dates[0], now).dispatchOn, "2026-10-27");
assert.equal(
  weeklyMenuDispatch(dates[0], late),
  null,
  "Un menú pasado no se rueda a la semana siguiente",
);
assert.equal(
  weeklyMenuDispatch(dates[2], late).dispatchOn,
  "2026-11-10",
  "Se permite preventa de otra semana",
);
const shifted = buildMonthlyDeliveries(calendar, late);
assert.deepEqual(
  shifted.map((d) => d.dispatchOn),
  ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"],
);
assert.deepEqual(
  shifted.map((d) => d.weeklyPlanId),
  [menus[1].id, menus[2].id, menus[3].id, null],
);
assert.equal(
  shifted[3].assignmentStatus,
  "pending_menu",
  "No existe repetición automática ni menú inventado",
);
const friday = buildMonthlyDeliveries(
  calendar,
  new Date("2026-10-26T20:00:01Z"),
);
assert.deepEqual(
  friday.map((d) => d.dispatchOn),
  ["2026-10-30", "2026-11-06", "2026-11-13", "2026-11-20"],
);

function db(state = {}, rows = calendar) {
  return {
    from(table) {
      if (table === "weekly_dispatch_menus")
        return {
          select: () => ({
            eq: () => ({ order: async () => ({ data: rows, error: null }) }),
          }),
        };
      if (table === "menu_items")
        return {
          select: () => ({
            in: (key, ids) => ({
              eq: async () => ({
                data: [...menus, monthly].filter((p) => ids.includes(p[key])),
                error: null,
              }),
            }),
          }),
        };
      if (table === "orders")
        return {
          insert(row) {
            (state.orders ||= []).push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: { id: "00000000-0000-4000-8000-000000000099" },
                  error: null,
                }),
              }),
            };
          },
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      if (table === "order_items")
        return {
          insert: async (items) => {
            state.items = items;
            return { error: null };
          },
        };
      throw Error(`Unexpected table ${table}`);
    },
  };
}
const actual = await resolveDispatchProducts([monthly, menus[1]], {
  supabase: db(),
  now: late,
});
assert.deepEqual(actual[0].dispatch_plan, shifted);
assert.equal(actual[1].dispatch_plan[0].dispatchOn, "2026-11-03");
await assert.rejects(
  resolveDispatchProducts([menus[0]], { supabase: db(), now: late }),
  (e) => e.statusCode === 409,
);
await assert.rejects(
  resolveDispatchProducts([monthly], {
    supabase: db({}, [{ ...calendar[0], weekly_plan_id: "missing" }]),
    now,
  }),
  (e) => e.statusCode === 503,
);
const uiProducts = [monthly, ...menus].map((p) => ({
  ...p,
  productType: p.product_type,
  planFrequency: p.plan_frequency,
  includedItems: p.included_items,
  benefits: [{ id: "same", name: "Fibra" }],
  tags: [{ id: "same-tag", name: "Fibra" }],
}));
const ui = applyDispatchCalendar(uiProducts, calendar, late);
assert.equal(ui[0].weeklyPlans[3].pendingMenu, true);
assert.equal(ui[0].benefits.length, 1);
assert.equal(ui[0].tags.length, 1);
assert.equal(getProductAvailability(ui[1], late).available, false);
assert.equal(getProductAvailability(ui[2], late).available, true);
for (const p of [monthly, menus[1]]) {
  const state = {};
  let mpCalls = 0;
  const dependencies = {
    env: {},
    now: late,
    supabase: db(state),
    mercadoPagoRequest: async (_path, body) => {
      mpCalls++;
      return { id: "mock", init_point: "https://mp.example.invalid" };
    },
  };
  await createCheckoutPreference({
    cart: [{ slug: p.slug, quantity: 1 }],
    fulfillment: {
      mode: "pickup",
      name: "QA sintético",
      phone: "+56900000000",
      email: "qa@example.invalid",
    },
    request: {
      headers: { host: "fullness.example.test", "x-forwarded-proto": "https" },
    },
    dependencies,
  });
  assert.equal(mpCalls, 1);
  assert.equal(
    state.items[0].product_snapshot.planStructure,
    "dispatch_calendar_v1",
  );
  assert.equal(
    state.items[0].product_snapshot.dispatchPlan.length,
    p === monthly ? 4 : 1,
  );
  if (p === monthly) {
    assert.equal(
      state.items[0].product_snapshot.monthlyWeeks[0].weeklyPlanId,
      menus[1].id,
    );
    assert.equal(
      state.items[0].product_snapshot.monthlyWeeks[3].mealpreps.length,
      0,
    );
  }
}
const quoteState = {};
const quote = await quoteCheckout({
  cart: [{ slug: monthly.slug, quantity: 1 }],
  fulfillment: { mode: "pickup" },
  dependencies: {
    env: {},
    now: late,
    supabase: db(quoteState),
    mercadoPagoRequest: async () => {
      throw Error("Una cotización no llama a Mercado Pago");
    },
  },
});
assert.equal(quote.amount, 237990);
assert.equal(quoteState.orders, undefined);
console.log(
  "Calendario QA OK: preventa, corte17h, mensual corrido por fechas, 4 entregas, menús pendientes sin ciclo, tags únicos y snapshot servidor. Todo simulado, sin cobros ni tráfico externo.",
);
