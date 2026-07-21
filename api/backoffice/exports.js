import {assertBackofficeRequest, cleanText, statusError} from "../../server/backoffice-access.mjs";

const EXPORTS = {
  subscribers: {
    fileName: "fullness-suscritos",
    headers: ["Nombre", "Correo", "Teléfono", "Origen", "Suscrito desde", "Baja de suscripción"],
    load: loadSubscribers
  },
  customers: {
    fileName: "fullness-clientes",
    headers: ["Nombre", "Correo", "Teléfono", "Compras", "Total histórico CLP", "Primera compra", "Última compra", "Cuenta creada"],
    load: loadCustomers
  },
  sales: {
    fileName: "fullness-ventas-historicas",
    headers: ["Orden", "Fecha", "Estado pedido", "Estado pago", "Estado entrega", "Cliente", "Correo", "Teléfono", "Total CLP", "Moneda"],
    load: loadSales
  }
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    sendJson(res, 405, {error: "Método no permitido."});
    return;
  }

  try {
    const type = cleanText(queryValue(req.query?.type)).toLowerCase();
    const exportDefinition = EXPORTS[type];

    if (!exportDefinition) {
      throw statusError(422, "El listado solicitado no existe.");
    }

    const {supabase} = await assertBackofficeRequest(req);
    const rows = await exportDefinition.load(supabase);
    const csv = createCsv(exportDefinition.headers, rows);
    const date = new Date().toISOString().slice(0, 10);

    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${exportDefinition.fileName}-${date}.csv\"`);
    res.end(`\ufeff${csv}`);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {error: error.message || "No pudimos preparar el CSV."});
  }
}

async function loadSubscribers(supabase) {
  const subscribers = await selectAll(() => supabase
    .from("email_subscribers")
    .select("name,email,phone,source,subscribed_at,unsubscribed_at")
    .order("subscribed_at", {ascending: false}));

  return subscribers.map((subscriber) => [
    subscriber.name,
    subscriber.email,
    subscriber.phone,
    subscriber.source,
    formatDate(subscriber.subscribed_at),
    formatDate(subscriber.unsubscribed_at)
  ]);
}

async function loadCustomers(supabase) {
  const [profiles, orders] = await Promise.all([
    selectAll(() => supabase
      .from("profiles")
      .select("email,full_name,phone,created_at,is_admin")
      .order("created_at", {ascending: false})),
    selectAll(() => supabase
      .from("orders")
      .select("customer_snapshot,total_clp,ordered_at,payment_status,status")
      .order("ordered_at", {ascending: false}))
  ]);

  const customerEmails = new Set(
    orders
      .map((order) => cleanText(order.customer_snapshot?.email).toLowerCase())
      .filter(Boolean)
  );
  const customers = new Map();

  for (const profile of profiles) {
    const email = cleanText(profile.email).toLowerCase();
    if (profile.is_admin || !customerEmails.has(email)) continue;
    mergeCustomer(customers, {
      accountCreatedAt: profile.created_at,
      email: profile.email,
      name: profile.full_name,
      phone: profile.phone
    });
  }

  for (const order of orders) {
    const snapshot = order.customer_snapshot || {};
    const customer = mergeCustomer(customers, {
      email: snapshot.email,
      name: snapshot.name,
      phone: snapshot.phone
    });

    if (!customer) continue;

    customer.orderCount += 1;
    customer.totalClp += Number(order.total_clp || 0);
    customer.firstOrderAt = earliestDate(customer.firstOrderAt, order.ordered_at);
    customer.lastOrderAt = latestDate(customer.lastOrderAt, order.ordered_at);
  }

  return [...customers.values()]
    .sort((left, right) => String(right.lastOrderAt || right.accountCreatedAt || "").localeCompare(String(left.lastOrderAt || left.accountCreatedAt || "")))
    .map((customer) => [
      customer.name,
      customer.email,
      customer.phone,
      customer.orderCount,
      Math.round(customer.totalClp),
      formatDate(customer.firstOrderAt),
      formatDate(customer.lastOrderAt),
      formatDate(customer.accountCreatedAt)
    ]);
}

async function loadSales(supabase) {
  const orders = await selectAll(() => supabase
    .from("orders")
    .select("id,ordered_at,status,payment_status,delivery_status,total_clp,currency,customer_snapshot")
    .order("ordered_at", {ascending: false}));

  return orders.map((order) => {
    const customer = order.customer_snapshot || {};
    return [
      order.id,
      formatDate(order.ordered_at),
      order.status,
      order.payment_status,
      order.delivery_status,
      customer.name,
      customer.email,
      customer.phone,
      Math.round(Number(order.total_clp || 0)),
      order.currency || "CLP"
    ];
  });
}

async function selectAll(buildQuery) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const {data, error} = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw statusError(502, "No pudimos leer la información para el CSV.", error);

    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

function mergeCustomer(customers, {accountCreatedAt, email, name, phone}) {
  const normalizedEmail = cleanText(email).toLowerCase();
  if (!normalizedEmail) return null;

  const current = customers.get(normalizedEmail) || {
    accountCreatedAt: "",
    email: normalizedEmail,
    firstOrderAt: "",
    lastOrderAt: "",
    name: "",
    orderCount: 0,
    phone: "",
    totalClp: 0
  };

  current.name = current.name || cleanText(name);
  current.phone = current.phone || cleanText(phone);
  current.accountCreatedAt = earliestDate(current.accountCreatedAt, accountCreatedAt);
  customers.set(normalizedEmail, current);
  return current;
}

function earliestDate(current, candidate) {
  if (!current) return candidate || "";
  if (!candidate) return current;
  return String(candidate) < String(current) ? candidate : current;
}

function latestDate(current, candidate) {
  if (!current) return candidate || "";
  if (!candidate) return current;
  return String(candidate) > String(current) ? candidate : current;
}

function createCsv(headers, rows) {
  return [headers, ...rows]
    .map((row) => row.map(toCsvValue).join(","))
    .join("\r\n");
}

function toCsvValue(value) {
  const text = cleanText(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `\"${safeText.replaceAll('\"', '\"\"')}\"`;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Santiago"
  }).format(date);
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
