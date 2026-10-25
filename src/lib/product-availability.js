// Calendar dates are interpreted in Santiago, identically in browser and server.
export const AVAILABILITY_TIME_ZONE = "America/Santiago";
const MODES = new Set(["always", "paused", "scheduled"]);

export function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function santiagoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AVAILABILITY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key).value).join("-");
}

export function normalizeAvailability(value = {}) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    mode: input.mode || "always",
    startsOn: String(input.startsOn ?? input.starts_on ?? ""),
    endsOn: String(input.endsOn ?? input.ends_on ?? "")
  };
}

export function availabilityValidationError(value) {
  const schedule = normalizeAvailability(value);
  if (!MODES.has(schedule.mode)) return "Selecciona un estado de disponibilidad válido.";
  if (schedule.mode !== "scheduled") return "";
  if (!isCalendarDate(schedule.startsOn)) return "Indica una fecha de activación válida.";
  if (schedule.endsOn && (!isCalendarDate(schedule.endsOn) || schedule.endsOn <= schedule.startsOn)) {
    return "La desactivación debe ser posterior a la activación.";
  }
  return "";
}

export function formatAvailabilityDate(value) {
  if (!isCalendarDate(value)) return "";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(new Date(`${value}T12:00:00Z`));
}

export function getProductAvailability(product, now = new Date()) {
  const schedule = normalizeAvailability(product?.availability ?? product?.metadata?.availability);
  const today = santiagoDate(now);
  const invalid = availabilityValidationError(schedule);
  const hidden = product?.isActive === false || product?.is_active === false;
  let status = "active";
  if (hidden) status = "hidden";
  else if (invalid || schedule.mode === "paused") status = "inactive";
  else if (schedule.mode === "scheduled" && today < schedule.startsOn) status = "upcoming";
  else if (schedule.mode === "scheduled" && schedule.endsOn && today >= schedule.endsOn) status = "inactive";
  const available = status === "active";
  const label = status === "hidden" ? "Oculto" : available ? "Activo" : status === "upcoming" ? "Próximamente" : "Inactivo";
  const message = status === "upcoming"
    ? `Se activa el ${formatAvailabilityDate(schedule.startsOn)}`
    : status === "hidden" ? "No visible en la tienda"
      : available && schedule.mode === "scheduled" && schedule.endsOn
        ? `Se desactiva el ${formatAvailabilityDate(schedule.endsOn)}`
        : available ? "Disponible para comprar" : "Sin próxima activación programada";
  return {available, status, label, message, schedule};
}

export function serializeAvailability(value) {
  const schedule = normalizeAvailability(value);
  const error = availabilityValidationError(schedule);
  if (error) throw new Error(error);
  return {
    mode: schedule.mode,
    starts_on: schedule.mode === "scheduled" ? schedule.startsOn : null,
    ends_on: schedule.mode === "scheduled" && schedule.endsOn ? schedule.endsOn : null,
    time_zone: AVAILABILITY_TIME_ZONE
  };
}
