import {assertOwnerBackofficeRequest, cleanText, statusError} from "../../server/backoffice-access.mjs";

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT"];
const DEFAULT_SITE_HOST = "fullnesslab.com";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    sendJson(res, 405, {error: "Método no permitido."});
    return;
  }

  try {
    await assertOwnerBackofficeRequest(req);
    const hostname = configuredHostname();
    const records = await Promise.all(DNS_TYPES.map((type) => lookupDns(hostname, type)));

    sendJson(res, 200, {data: {hostname, records}});
  } catch (error) {
    sendJson(res, error.statusCode || 500, {error: error.message || "No pudimos consultar el DNS."});
  }
}

async function lookupDns(hostname, type) {
  try {
    const url = new URL("https://cloudflare-dns.com/dns-query");
    url.searchParams.set("name", hostname);
    url.searchParams.set("type", type);
    const response = await fetch(url, {
      headers: {accept: "application/dns-json"}
    });

    if (!response.ok) throw new Error(`Consulta DNS rechazada (${response.status}).`);

    const payload = await response.json();
    return {
      records: Array.isArray(payload.Answer)
        ? payload.Answer.map((record) => ({
            name: cleanText(record.name),
            ttl: Number(record.TTL) || 0,
            value: cleanText(record.data)
          }))
        : [],
      type
    };
  } catch (error) {
    return {
      error: error.message || "No disponible",
      records: [],
      type
    };
  }
}

function configuredHostname() {
  const candidates = [
    process.env.SITE_URL,
    process.env.CHECKOUT_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  ];

  for (const candidate of candidates) {
    const value = cleanText(candidate);
    if (!value) continue;

    try {
      const hostname = new URL(value.includes("://") ? value : `https://${value}`).hostname;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") return hostname;
    } catch {
      continue;
    }
  }

  throw statusError(500, `No pudimos determinar el dominio del sitio. Configura SITE_URL o usa ${DEFAULT_SITE_HOST}.`);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
