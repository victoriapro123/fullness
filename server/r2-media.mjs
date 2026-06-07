import {createHash, createHmac} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";

export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const MEDIA_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp4",
  ".png",
  ".svg",
  ".webm",
  ".webp"
]);

const CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".mov", "video/quicktime"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webm", "video/webm"],
  [".webp", "image/webp"]
]);

export function loadEnvFile(filePath) {
  return readFile(filePath, "utf8")
    .then((contents) => {
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);

        if (!match) continue;

        const [, name, rawValue] = match;
        const value = rawValue.replace(/^["']|["']$/g, "");

        if (process.env[name] === undefined) {
          process.env[name] = value;
        }
      }
    })
    .catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
}

export function getR2Config(env = process.env) {
  const config = {
    accessKeyId: env.R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY,
    bucket: env.R2_BUCKET_NAME,
    endpoint: (env.R2_ENDPOINT_URL || env.R2_EDPOINT_URL)?.replace(/\/+$/, ""),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing R2 config: ${missing.join(", ")}`);
  }

  return config;
}

export function normalizeMediaKey(input) {
  const key = String(input || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const parts = key.split("/");

  if (!key || parts.some((part) => part === ".." || part === "")) {
    throw new Error("Invalid media key");
  }

  if (!key.startsWith("assets/") && !key.startsWith("images/")) {
    throw new Error("Unsupported media key");
  }

  return key;
}

export function contentTypeForPath(filePath) {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

export function isMediaFile(filePath) {
  return MEDIA_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export async function putR2Object({body, cacheControl = MEDIA_CACHE_CONTROL, config, contentType, key}) {
  return r2Request({
    body,
    config,
    headers: {
      "cache-control": cacheControl,
      "content-length": String(body.byteLength),
      "content-type": contentType
    },
    key,
    method: "PUT",
    payloadHash: sha256Hex(body)
  });
}

export function headR2Object({config, key}) {
  return r2Request({config, key, method: "HEAD"});
}

export function getR2Object({config, key, range}) {
  return r2Request({
    config,
    headers: range ? {range} : undefined,
    key,
    method: "GET"
  });
}

export function r2Request({body, config, headers = {}, key, method, payloadHash = sha256Hex("")}) {
  const url = buildObjectUrl(config, normalizeMediaKey(key));
  const signedHeaders = signRequest({
    config,
    headers,
    method,
    payloadHash,
    url
  });

  return fetch(url, {
    body,
    headers: signedHeaders,
    method
  });
}

function buildObjectUrl(config, key) {
  const encodedBucket = encodeURIComponent(config.bucket);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return new URL(`${config.endpoint}/${encodedBucket}/${encodedKey}`);
}

function signRequest({config, headers, method, payloadHash, url}) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const requestHeaders = normalizeHeaders({
    ...headers,
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  });
  const headerNames = Object.keys(requestHeaders).sort();
  const canonicalHeaders = headerNames.map((name) => `${name}:${requestHeaders[name]}\n`).join("");
  const signedHeaderNames = headerNames.join(";");
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaderNames,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signature = hmac(signingKey(config.secretAccessKey, dateStamp), stringToSign, "hex");

  return {
    ...requestHeaders,
    authorization: [
      `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaderNames}`,
      `Signature=${signature}`
    ].join(", ")
  };
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([name, value]) => [
        name.toLowerCase(),
        String(value).replace(/\s+/g, " ").trim()
      ])
  );
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signingKey(secretAccessKey, dateStamp) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");

  return hmac(serviceKey, "aws4_request");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}
