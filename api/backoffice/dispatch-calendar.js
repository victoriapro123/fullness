import {
  assertOwnerBackofficeRequest,
  cleanText,
  statusError,
} from "../../server/backoffice-access.mjs";
import { readJsonBody } from "../../server/mercadopago-checkout.mjs";
import { CALENDAR_COLUMNS, weekOf } from "../../src/lib/dispatch-calendar.js";
import {
  isCalendarDate,
  santiagoDate,
} from "../../src/lib/product-availability.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { supabase, user } = await assertOwnerBackofficeRequest(req);
    if (req.method === "GET") {
      const [calendar, deliveries, audit] = await Promise.all([
        supabase
          .from("weekly_dispatch_menus")
          .select(CALENDAR_COLUMNS)
          .order("week_of", { ascending: true }),
        supabase
          .from("order_plan_deliveries")
          .select(
            "id,order_item_id,delivery_number,week_of,dispatch_on,weekly_plan_id,menu_name:menu_snapshot->>name,updated_at,order_items!inner(order_id,quantity,orders!inner(status,payment_status,delivery_status))",
          )
          .gte("dispatch_on", santiagoDate())
          .order("dispatch_on", { ascending: true })
          .limit(500),
        supabase
          .from("dispatch_calendar_audit")
          .select("id,week_of,action,created_at")
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      if (calendar.error || deliveries.error || audit.error)
        throw statusError(502, "No pudimos cargar la programación.");
      send(res, 200, {
        data: {
          calendar: calendar.data || [],
          deliveries: deliveries.data || [],
          audit: audit.data || [],
        },
      });
      return;
    }
    if (req.method !== "PUT") {
      res.setHeader("Allow", "GET, PUT");
      throw statusError(405, "Método no permitido.");
    }
    const body = await readJsonBody(req);
    if (!isCalendarDate(body.weekOf) || weekOf(body.weekOf) !== body.weekOf)
      throw statusError(422, "Selecciona el lunes de la semana de despacho.");
    if (
      !/^[0-9a-f-]{36}$/i.test(cleanText(body.weeklyPlanId)) ||
      !Number.isInteger(body.revision) ||
      body.revision < 0 ||
      typeof body.published !== "boolean"
    )
      throw statusError(422, "Revisa el menú y la programación.");
    const { data, error } = await supabase.rpc("save_dispatch_menu", {
      p_week_of: body.weekOf,
      p_weekly_plan_id: body.weeklyPlanId,
      p_published: body.published,
      p_revision: body.revision,
      p_actor: user.id,
      p_reassign: body.reassign === true,
    });
    if (error)
      throw statusError(
        error.code === "40001" ? 409 : 422,
        error.message || "No pudimos guardar la programación.",
      );
    send(res, 200, { data });
  } catch (error) {
    send(res, error.statusCode || 500, {
      error: error.message || "No pudimos gestionar la programación.",
    });
  }
}
function send(res, code, body) {
  res.statusCode = code;
  res.end(JSON.stringify(body));
}
