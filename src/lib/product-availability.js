// Calendar dates describe dispatch, not a window restricting purchases.
export const AVAILABILITY_TIME_ZONE = "America/Santiago";
export const DISPATCH_RULE_TEXT = "Planes: pedidos hasta el lunes a las 17:00 se despachan el martes. Después, hasta el jueves a las 17:00, se despachan el viernes. Pasado ese corte, se despachan el martes siguiente. Horario de Santiago.";
export const DISPATCH_CUTOFF_TEXT = "Cortes de planes: lunes y jueves a las 17:00 (Santiago).";
export const MEALPREP_DISPATCH_RULE_TEXT = "Los mealpreps sueltos, normales y familiares, se preparan a pedido. Fullnesslab coordina su fecha de despacho; no se rigen por los cortes de los planes.";
const MODES = new Set(["always", "paused", "scheduled"]);
const santiagoClock = new Intl.DateTimeFormat("en-CA", {timeZone: AVAILABILITY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"});

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

export function isPlanProduct(product) {
  return (product?.productType || product?.product_type) === "plan";
}

export function getProductDispatchRule(product) {
  return isPlanProduct(product) ? DISPATCH_RULE_TEXT : MEALPREP_DISPATCH_RULE_TEXT;
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
  if (!isCalendarDate(schedule.startsOn)) return "Indica una fecha de despacho válida.";
  if (schedule.endsOn && (!isCalendarDate(schedule.endsOn) || schedule.endsOn <= schedule.startsOn)) {
    return "Revisa las fechas guardadas del producto.";
  }
  return "";
}

export function formatAvailabilityDate(value) {
  if (!isCalendarDate(value)) return "";
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(new Date(`${value}T12:00:00Z`));
}

export function getDispatchOptions(value) {
  if (!isCalendarDate(value)) return null;
  const monday = new Date(`${value}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const day = (offset) => {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  return {weekOf: day(0), tuesday: day(1), friday: day(4), rule: DISPATCH_RULE_TEXT, timeZone: AVAILABILITY_TIME_ZONE};
}

export function getDispatchSchedule(value, now = new Date()) {
  const reference = getDispatchOptions(value);
  if (!reference) return null;
  const parts = santiagoClock.formatToParts(now);
  const part = (name) => parts.find((entry) => entry.type === name).value;
  const today = ["year", "month", "day"].map(part).join("-");
  const current = getDispatchOptions(today);
  let week = reference.weekOf > current.weekOf ? reference : current;
  let day = "tuesday";
  if (week.weekOf === current.weekOf) {
    const seconds = Number(part("hour")) * 3600 + Number(part("minute")) * 60 + Number(part("second")) + now.getUTCMilliseconds() / 1000;
    const thursday = new Date(`${current.weekOf}T12:00:00Z`);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const thursdayDate = thursday.toISOString().slice(0, 10);
    if (today > thursdayDate || (today === thursdayDate && seconds > 17 * 3600)) {
      const nextMonday = new Date(`${current.weekOf}T12:00:00Z`);
      nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
      week = getDispatchOptions(nextMonday.toISOString().slice(0, 10));
    } else {
      if (today > current.weekOf || seconds > 17 * 3600) day = "friday";
    }
  }
  return {...week, referenceWeekOf: reference.weekOf, dispatchOn: week[day]};
}

export function getProductAvailability(product, now = new Date()) {
  const schedule = normalizeAvailability(product?.availability ?? product?.metadata?.availability);
  const invalid = availabilityValidationError(schedule);
  const hidden = product?.isActive === false || product?.is_active === false;
  let status = "active";
  if (hidden) status = "hidden";
  else if (invalid || schedule.mode === "paused") status = "inactive";
  // Existing starts_on is now the dispatch date. Legacy ends_on remains in
  // the snapshot for traceability, but neither date limits a valid purchase.
  const available = status === "active";
  const dispatch = isPlanProduct(product) && schedule.mode === "scheduled" ? getDispatchSchedule(schedule.startsOn, now) : null;
  const label = status === "hidden" ? "Oculto" : available ? "Disponible" : "Inactivo";
  const message = status === "hidden" ? "No visible en la tienda"
    : available && !isPlanProduct(product) ? "Preparación a pedido. Despacho a coordinar con Fullnesslab"
    : available && dispatch
      ? `Despacho el ${formatAvailabilityDate(dispatch.dispatchOn)}`
      : available ? "Disponible para comprar" : "No disponible para comprar";
  return {available, status, label, message, schedule, dispatch};
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
