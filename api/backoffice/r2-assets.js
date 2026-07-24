import {Readable} from "node:stream";
import {assertOwnerBackofficeRequest, cleanText, statusError} from "../../server/backoffice-access.mjs";
import {
  contentTypeForPath,
  getR2Config,
  getR2Object,
  listR2Objects,
  normalizeR2Key,
  normalizeR2Prefix
} from "../../server/r2-media.mjs";

const LIST_LIMIT = 25;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    sendJson(res, 405, {error: "Método no permitido."});
    return;
  }

  try {
    await assertOwnerBackofficeRequest(req);
    const key = cleanText(queryValue(req.query?.key));

    if (key) {
      await serveObject(req, res, key);
      return;
    }

    const data = await listObjects(req);
    sendJson(res, 200, {data});
  } catch (error) {
    sendJson(res, error.statusCode || 500, {error: error.message || "No pudimos consultar R2."});
  }
}

async function listObjects(req) {
  const config = getR2Config();
  const prefix = normalizeR2Prefix(queryValue(req.query?.prefix));
  const cursor = cleanText(queryValue(req.query?.cursor));
  const response = await listR2Objects({
    config,
    continuationToken: cursor,
    maxKeys: LIST_LIMIT,
    prefix
  });

  if (!response.ok) {
    throw statusError(response.status || 502, "R2 no pudo listar los archivos.");
  }

  return parseListResponse(await response.text());
}

async function serveObject(req, res, rawKey) {
  const key = normalizeR2Key(rawKey);
  const config = getR2Config();
  const upstream = await getR2Object({config, key, allowAnyKey: true});

  if (!upstream.ok) {
    throw statusError(upstream.status || 502, upstream.status === 404 ? "El archivo ya no existe en R2." : "No pudimos obtener el archivo de R2.");
  }

  const isDownload = cleanText(queryValue(req.query?.download)) === "1";
  const fileName = safeFileName(key);

  res.statusCode = upstream.status;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", upstream.headers.get("content-type") || contentTypeForPath(key));
  res.setHeader(
    "Content-Disposition",
    isDownload
      ? `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      : `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) res.setHeader("Content-Length", contentLength);

  if (!upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(res);
}

function parseListResponse(xml) {
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
    .map((match) => ({
      etag: readXmlValue(match[1], "ETag"),
      key: readXmlValue(match[1], "Key"),
      lastModified: readXmlValue(match[1], "LastModified"),
      size: Number(readXmlValue(match[1], "Size") || 0)
    }))
    .filter((object) => object.key);

  return {
    cursor: readXmlValue(xml, "NextContinuationToken") || null,
    isTruncated: readXmlValue(xml, "IsTruncated") === "true",
    objects
  };
}

function readXmlValue(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`));
  return decodeXml(match?.[1] || "");
}

function decodeXml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function safeFileName(key) {
  return String(key).split("/").pop().replace(/[\r\n"\\]/g, "_") || "archivo";
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
