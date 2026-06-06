import {Readable} from "node:stream";
import {
  getR2Config,
  getR2Object,
  headR2Object,
  loadEnvFile,
  MEDIA_CACHE_CONTROL,
  normalizeMediaKey
} from "../server/r2-media.mjs";

const localEnvReady = loadEnvFile(new URL("../.env.local", import.meta.url));

const FORWARDED_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified"
];

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET,HEAD,OPTIONS");
    res.end("Method not allowed");
    return;
  }

  try {
    await localEnvReady;

    const rawKey = Array.isArray(req.query.key) ? req.query.key[0] : req.query.key;
    const key = normalizeMediaKey(rawKey);
    const config = getR2Config();
    const upstream =
      req.method === "HEAD"
        ? await headR2Object({config, key})
        : await getR2Object({
            config,
            key,
            range: req.headers.range
          });

    res.statusCode = upstream.status;
    res.setHeader("Access-Control-Allow-Origin", "*");

    for (const name of FORWARDED_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    if (!upstream.headers.get("cache-control")) {
      res.setHeader("Cache-Control", MEDIA_CACHE_CONTROL);
    }

    if (req.method === "HEAD" || !upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    res.statusCode = error.message.includes("key") ? 400 : 500;
    res.end(error.message);
  }
}
