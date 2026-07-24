import {assertOwnerBackofficeRequest, cleanText, statusError} from "../../server/backoffice-access.mjs";

const EXPORT_LOG_METADATA_KEY = "fullness_table_exports";
const EXPORT_TIME_ZONE = "America/Santiago";
const TABLES = [
  {key: "profiles", label: "Perfiles", description: "Cuentas y datos de contacto"},
  {key: "menu_items", label: "Meal preps", description: "Catálogo y productos"},
  {key: "meal_library_items", label: "Biblioteca de platos", description: "Platos reutilizables"},
  {key: "customer_subscriptions", label: "Suscripciones", description: "Planes y estado de clientes"},
  {key: "ecommerce_shop_settings", label: "Configuración de tienda", description: "Contenido de la tienda"},
  {key: "email_subscribers", label: "Suscriptores", description: "Registros de suscripción"},
  {key: "email_deliveries", label: "Envíos de correo", description: "Historial transaccional"},
  {key: "customer_addresses", label: "Direcciones", description: "Direcciones de despacho"},
  {key: "carts", label: "Carritos", description: "Carritos de compra"},
  {key: "cart_items", label: "Ítems de carrito", description: "Productos en carritos"},
  {key: "orders", label: "Órdenes", description: "Ventas y estados"},
  {key: "order_items", label: "Ítems de orden", description: "Detalle de ventas"},
  {key: "payments", label: "Pagos", description: "Pagos registrados"},
  {key: "payment_events", label: "Eventos de pago", description: "Auditoría de pagos"}
];
const TABLE_BY_KEY = new Map(TABLES.map((table) => [table.key, table]));

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    sendJson(res, 405, {error: "Método no permitido."});
    return;
  }

  try {
    const {supabase, user} = await assertOwnerBackofficeRequest(req);
    const requestedTable = cleanText(queryValue(req.query?.table)).toLowerCase();

    if (!requestedTable) {
      sendJson(res, 200, {
        data: {
          tables: tableStatuses(user)
        }
      });
      return;
    }

    const table = TABLE_BY_KEY.get(requestedTable);
    if (!table) throw statusError(422, "La tabla solicitada no está disponible para exportación.");

    await claimDailyExport({supabase, tableKey: table.key, user});
    const rows = await selectAll(() => supabase.from(table.key).select("*"));
    const csv = createCsv(rows);
    const date = localDateKey();

    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="fullness-${table.key}-${date}.csv"`);
    res.end(`\ufeff${csv}`);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "No pudimos preparar el respaldo.",
      exportedToday: Boolean(error.exportedToday)
    });
  }
}

async function claimDailyExport({supabase, tableKey, user}) {
  const today = localDateKey();
  const exports = readExportHistory(user.app_metadata);

  if (exports[tableKey] === today) {
    const error = statusError(429, "Esta tabla ya fue exportada hoy. Vuelve a intentarlo mañana.");
    error.exportedToday = true;
    throw error;
  }

  const nextExports = {
    ...exports,
    [tableKey]: today
  };
  const {error} = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata || {}),
      [EXPORT_LOG_METADATA_KEY]: nextExports
    }
  });

  if (error) {
    throw statusError(502, "No pudimos registrar la exportación diaria.", error);
  }
}

async function selectAll(buildQuery) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const {data, error} = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw statusError(502, "No pudimos leer la tabla para el respaldo.", error);

    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

function tableStatuses(user) {
  const exports = readExportHistory(user.app_metadata);
  const today = localDateKey();

  return TABLES.map((table) => ({
    ...table,
    available: exports[table.key] !== today,
    exportedOn: exports[table.key] || null
  }));
}

function readExportHistory(appMetadata) {
  const history = appMetadata?.[EXPORT_LOG_METADATA_KEY];
  if (!history || Array.isArray(history) || typeof history !== "object") return {};

  return Object.fromEntries(
    Object.entries(history).filter(([tableKey, date]) => TABLE_BY_KEY.has(tableKey) && /^\d{4}-\d{2}-\d{2}$/.test(String(date)))
  );
}

function createCsv(rows) {
  const headers = [];
  const headerSet = new Set();

  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (!headerSet.has(key)) {
        headerSet.add(key);
        headers.push(key);
      }
    }
  }

  return [headers, ...rows.map((row) => headers.map((header) => row?.[header]))]
    .map((row) => row.map(toCsvValue).join(","))
    .join("\r\n");
}

function toCsvValue(value) {
  const rawValue = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  const safeValue = /^[=+\-@]/.test(rawValue) ? `'${rawValue}` : rawValue;

  return `"${safeValue.replaceAll('"', '""')}"`;
}

function localDateKey() {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: EXPORT_TIME_ZONE,
    year: "numeric"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({type, value}) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function queryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
