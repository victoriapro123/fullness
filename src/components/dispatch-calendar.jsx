import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase.js";
import {
  addCalendarDays,
  MONTHLY_MENU_RULE_TEXT,
  weekOf,
} from "../lib/dispatch-calendar.js";
import {
  DISPATCH_RULE_TEXT,
  formatAvailabilityDate,
  santiagoDate,
} from "../lib/product-availability.js";

async function calendarRequest(method, body) {
  const client = await getSupabaseClient();
  const { data } = await client.auth.getSession();
  if (!data.session?.access_token)
    throw new Error("Inicia sesión para gestionar el calendario.");
  const response = await fetch("/api/backoffice/dispatch-calendar", {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || "No pudimos guardar el calendario.");
  return payload.data;
}

export function DispatchCalendarAdmin({
  plans,
  onChanged,
  request = calendarRequest,
  draftKey,
}) {
  const [data, setData] = useState({ calendar: [], deliveries: [], audit: [] });
  const [form, setForm] = useState({
    weekOf: weekOf(addCalendarDays(santiagoDate(), 7)),
    weeklyPlanId: "",
    published: true,
    revision: 0,
    reassign: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const choices = plans.filter(
    (p) =>
      p.productType === "plan" &&
      p.planFrequency === "weekly" &&
      p.isActive &&
      (p.includedItems || []).length === 6,
  );
  const pending = data.deliveries.filter(
    (d) =>
      d.week_of === form.weekOf &&
      !["cancelled", "refunded"].includes(d.order_items?.orders?.status) &&
      !["delivered", "cancelled"].includes(
        d.order_items?.orders?.delivery_status,
      ),
  );
  async function reload(preserveDraft = true) {
    setLoading(true);
    setError("");
    try {
      const result = await request("GET");
      setData(result);
      if (dirty && preserveDraft !== false) {
        const revision =
          result.calendar.find((r) => r.week_of === form.weekOf)?.revision || 0;
        const next = { ...form, revision };
        setForm(next);
        setConfirming(false);
        if (draftKey) localStorage.setItem(draftKey, JSON.stringify(next));
        setMessage(
          "Calendario actualizado sin perder tu borrador. Revisa los cambios del servidor y vuelve a confirmar antes de guardar.",
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    request("GET")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request]);
  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (saved?.weekOf) {
        setForm(saved);
        setDirty(true);
        setMessage(
          "Borrador recuperado en este dispositivo; aún no está publicado.",
        );
      }
    } catch {}
  }, [draftKey]);
  function change(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    setDirty(true);
    setMessage("");
    setConfirming(false);
    if (draftKey)
      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
      } catch {
        setError(
          "No se pudo respaldar el borrador en este dispositivo. Mantén abierta esta vista hasta guardar.",
        );
      }
  }
  function selectWeek(value) {
    const monday = weekOf(value);
    const current = data.calendar.find((r) => r.week_of === monday);
    change({
      weekOf: monday,
      weeklyPlanId: current?.weekly_plan_id || "",
      published: current?.published ?? true,
      revision: current?.revision || 0,
      reassign: false,
    });
  }
  async function save(event) {
    event.preventDefault();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await request("PUT", form);
      setDirty(false);
      setConfirming(false);
      if (draftKey) localStorage.removeItem(draftKey);
      await reload(false);
      setForm((current) => ({
        ...current,
        revision: result.calendar.revision,
        reassign: false,
      }));
      setMessage(
        `Programación guardada en el servidor. ${result.assignedDeliveries || 0} entregas asignadas.`,
      );
      try {
        await onChanged?.();
      } catch {
        setMessage(
          "Programación guardada. Actualiza la tienda para ver el calendario nuevo.",
        );
      }
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="dispatch-calendar-admin"
      aria-labelledby="dispatch-calendar-title"
    >
      <header>
        <p className="eyebrow">Producción y despachos</p>
        <h3 id="dispatch-calendar-title">MENÚS POR FECHA</h3>
        <p>
          Un menú único por semana. Programa cada fecha expresamente; nunca se
          repetirá un ciclo automáticamente.
        </p>
        <details>
          <summary>Ver reglas de los planes</summary>
          <p>{DISPATCH_RULE_TEXT}</p>
          <p>{MONTHLY_MENU_RULE_TEXT}</p>
        </details>
      </header>
      <button
        type="button"
        className="backoffice-command"
        onClick={reload}
        disabled={loading || saving}
      >
        {dirty
          ? "Actualizar calendario sin perder borrador"
          : "Actualizar calendario"}
      </button>
      {error && (
        <p className="backoffice-alert is-error" role="alert">
          {error} {dirty ? "El borrador no se ha eliminado." : ""}
        </p>
      )}
      {message && (
        <p className="backoffice-alert" role="status">
          {message}
        </p>
      )}
      <form className="dispatch-calendar-form" onSubmit={save}>
        <label>
          Semana de despacho (lunes)
          <input
            type="date"
            required
            value={form.weekOf}
            min={weekOf(santiagoDate())}
            onChange={(e) => selectWeek(e.target.value)}
            disabled={saving || loading}
          />
        </label>
        <label>
          Menú semanal
          <select
            required
            value={form.weeklyPlanId}
            onChange={(e) => change({ weeklyPlanId: e.target.value })}
            disabled={saving || loading}
          >
            <option value="">Selecciona un plan completo</option>
            {choices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="dispatch-calendar-wide">
          Producción: semana del{" "}
          {form.weekOf
            ? formatAvailabilityDate(addCalendarDays(form.weekOf, -7))
            : "—"}
          . Despachos: {formatAvailabilityDate(addCalendarDays(form.weekOf, 1))}{" "}
          y {formatAvailabilityDate(addCalendarDays(form.weekOf, 4))}.
        </p>
        <label className="dispatch-calendar-check">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => change({ published: e.target.checked })}
            disabled={saving || loading}
          />
          Publicar esta semana y permitir su preventa
        </label>
        <p>
          {pending.length} entregas registradas para esta semana. Las entregas
          sin menú recibirán esta asignación al guardar.
        </p>
        <label className="dispatch-calendar-check">
          <input
            type="checkbox"
            checked={form.reassign}
            onChange={(e) => change({ reassign: e.target.checked })}
            disabled={saving}
          />
          Confirmo aplicar el menú nuevo también a las entregas pendientes ya
          asignadas, si existen. Se conservará la trazabilidad del cambio.
        </label>
        {confirming && (
          <div className="dispatch-calendar-confirm" role="alert">
            <strong>¿Guardar la programación de esta semana?</strong>
            <p>
              Se asignará el menú seleccionado a sus entregas pendientes. No se
              modifican pagos ni entregas completadas.
            </p>
            <button
              type="button"
              className="backoffice-command"
              onClick={() => setConfirming(false)}
              disabled={saving}
            >
              Volver sin guardar
            </button>
          </div>
        )}
        <button
          className="primary-button"
          type="submit"
          disabled={saving || loading || !form.weeklyPlanId}
        >
          {saving
            ? "Guardando…"
            : confirming
              ? "Confirmar y guardar programación"
              : "Guardar programación"}
        </button>
        {dirty && !discarding && (
          <button
            type="button"
            className="backoffice-command"
            disabled={saving}
            onClick={() => setDiscarding(true)}
          >
            Descartar borrador
          </button>
        )}
        {discarding && (
          <div className="dispatch-calendar-confirm">
            <p>
              ¿Descartar sólo los cambios locales sin guardar? La programación
              del servidor no se elimina.
            </p>
            <button
              type="button"
              className="backoffice-command"
              onClick={() => setDiscarding(false)}
            >
              Seguir editando
            </button>
            <button
              type="button"
              className="backoffice-command"
              onClick={() => {
                if (draftKey) localStorage.removeItem(draftKey);
                setDirty(false);
                setDiscarding(false);
                setConfirming(false);
                setForm({
                  weekOf: weekOf(addCalendarDays(santiagoDate(), 7)),
                  weeklyPlanId: "",
                  published: true,
                  revision: 0,
                  reassign: false,
                });
                setMessage(
                  "Borrador local descartado. La programación del servidor se conserva.",
                );
              }}
            >
              Confirmar descarte local
            </button>
          </div>
        )}
        <small>
          {dirty
            ? "Borrador local: aún no está publicado. No se pierde al cambiar de módulo."
            : "Los cambios guardados se persisten en el servidor."}
        </small>
      </form>
      <div className="dispatch-calendar-list" aria-label="Semanas programadas">
        {data.calendar.map((row) => (
          <article key={row.week_of}>
            <div>
              <strong>{formatAvailabilityDate(row.week_of)}</strong>
              <p>
                {plans.find((p) => p.id === row.weekly_plan_id)?.name ||
                  "Menú no disponible"}
              </p>
              <small>
                {row.published ? "Publicada" : "Sin publicar"} · Revisión{" "}
                {row.revision}
              </small>
            </div>
            <button
              className="backoffice-command"
              type="button"
              disabled={saving || dirty || row.week_of < weekOf(santiagoDate())}
              onClick={() => selectWeek(row.week_of)}
            >
              Configurar semana
            </button>
          </article>
        ))}
      </div>
      <h4>PRÓXIMAS ENTREGAS DE PLANES</h4>
      <p>
        Las fechas sin menú quedan pendientes de programación, no se sustituyen
        por menús antiguos.
      </p>
      <div className="dispatch-calendar-list">
        {data.deliveries.length ? (
          data.deliveries.map((d) => (
            <article key={d.id}>
              <div>
                <strong>{formatAvailabilityDate(d.dispatch_on)}</strong>
                <p>
                  Pedido #
                  {String(d.order_items?.order_id || "")
                    .slice(0, 8)
                    .toUpperCase()}{" "}
                  · Entrega {d.delivery_number} · {d.order_items?.quantity || 1}{" "}
                  plan(es)
                </p>
                <p>{d.menu_name || "Menú por programar"}</p>
                <small>
                  {d.order_items?.orders?.payment_status === "approved"
                    ? "Pago aprobado"
                    : "Pago pendiente"}{" "}
                  · {d.order_items?.orders?.delivery_status || "Pendiente"}
                </small>
              </div>
            </article>
          ))
        ) : (
          <p>Aún no hay entregas registradas con este calendario.</p>
        )}
      </div>
      {data.deliveries.length === 500 && (
        <p>
          Se muestran las próximas 500 entregas. La programación se aplica a
          todas las entregas pendientes de la semana seleccionada.
        </p>
      )}
      <details>
        <summary>Últimos cambios de programación</summary>
        {data.audit.map((a) => (
          <p key={a.id}>
            {a.week_of} ·{" "}
            {a.action === "calendar_saved"
              ? "Programación guardada"
              : a.action === "delivery_assigned"
                ? "Menú asignado a entrega"
                : "Registro de calendario"}{" "}
            ·{" "}
            {new Date(a.created_at).toLocaleString("es-CL", {
              timeZone: "America/Santiago",
            })}
          </p>
        ))}
      </details>
    </section>
  );
}
