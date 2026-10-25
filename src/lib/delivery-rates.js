export const DELIVERY_RATES_VERSION = "2026-10-25";
export const DELIVERY_COMMUNES = Object.freeze([
  {name: "Lo Barnechea", feeClp: 3990},
  {name: "Las Condes", feeClp: 5990},
  {name: "Vitacura", feeClp: 5990}
]);

const clean = (value) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
const key = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");

export function normalizeDeliveryCommune(value) {
  return DELIVERY_COMMUNES.find((entry) => key(entry.name) === key(value))?.name || clean(value);
}

// A missing/unknown rate is deliberately null, never a free shipment.
// The browser displays this quote; the server recomputes it independently.
export function getDeliveryQuote({mode, comuna} = {}) {
  if (mode === "pickup") {
    return {status: "pickup", commune: "", feeClp: 0, canPayOnline: true, message: "Retiro sin costo de envío."};
  }
  const commune = normalizeDeliveryCommune(comuna);
  if (mode !== "delivery" || !commune) {
    return {status: "missing", commune, feeClp: null, canPayOnline: false, message: "Ingresa tu comuna para conocer el costo de envío."};
  }
  const rate = DELIVERY_COMMUNES.find((entry) => entry.name === commune);
  if (!rate) {
    return {status: "coordination", commune, feeClp: null, canPayOnline: false, message: "El despacho a esta comuna se coordina por WhatsApp antes de pagar."};
  }
  return {status: "quoted", commune, feeClp: rate.feeClp, canPayOnline: true, message: `Despacho a ${commune}.`};
}

export function serializeDeliveryQuote(quote) {
  return {ratesVersion: DELIVERY_RATES_VERSION, status: quote.status, commune: quote.commune, feeClp: quote.feeClp};
}
