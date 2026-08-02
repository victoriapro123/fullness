import {createClient} from "@supabase/supabase-js";
import {
  getR2Config,
  loadEnvFile,
  MEDIA_CACHE_CONTROL,
  normalizeMediaKey,
  putR2Object
} from "../server/r2-media.mjs";

const localEnvReady = loadEnvFile(new URL("../.env.local", import.meta.url));
const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_BENEFIT_ICON_BYTES = 3 * 1024 * 1024;
const IMAGE_CONTENT_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST,OPTIONS");
    res.end("Method not allowed");
    return;
  }

  try {
    await localEnvReady;
    await assertAdminRequest(req);

    const body = await readJsonBody(req);
    const contentType = String(body.contentType || "image/jpeg").toLowerCase();

    if (!IMAGE_CONTENT_TYPES.has(contentType)) {
      throw statusError(415, "Formato de imagen no soportado.");
    }

    const folder = sanitizeFolder(body.folder || process.env.MULTIMEDIA_UPLOAD_PREFIX || "images/meal-preps");
    const buffer = Buffer.from(String(body.dataBase64 || ""), "base64");
    const maxBytes = folder === "images/benefits"
      ? Number(process.env.MULTIMEDIA_MAX_BENEFIT_ICON_BYTES || DEFAULT_MAX_BENEFIT_ICON_BYTES)
      : Number(process.env.MULTIMEDIA_MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);

    if (!buffer.byteLength) {
      throw statusError(400, "La imagen está vacía.");
    }

    if (buffer.byteLength > maxBytes) {
      throw statusError(413, folder === "images/benefits"
        ? "El ícono debe pesar como máximo 3 MB. Reduce su tamaño e inténtalo nuevamente."
        : "La imagen supera el tamaño máximo permitido.");
    }

    const extension = extensionForContentType(contentType, body.fileName);
    const randomId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const key = normalizeMediaKey(`${folder}/${new Date().toISOString().slice(0, 7)}/${randomId}.${extension}`);
    const response = await putR2Object({
      body: buffer,
      cacheControl: MEDIA_CACHE_CONTROL,
      config: getR2Config(),
      contentType,
      key
    });

    if (!response.ok) {
      throw statusError(response.status, `R2 respondió ${response.status}: ${await response.text()}`);
    }

    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      key,
      publicUrl: `/api/media?key=${encodeURIComponent(key)}`
    }));
  } catch (error) {
    const status = error.statusCode || 500;
    res.statusCode = status;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({error: error.message || "No pudimos subir la imagen."}));
  }
}

async function assertAdminRequest(req) {
  const authorization = req.headers.authorization || req.headers.Authorization || "";
  const token = String(authorization).match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw statusError(401, "Debes iniciar sesión como administrador.");
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw statusError(500, "Falta configurar Supabase para validar administradores.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const {data: userData, error: userError} = await supabase.auth.getUser(token);

  if (userError || !userData?.user?.id) {
    throw statusError(401, "Sesión de administrador inválida.");
  }

  const {data: profile, error: profileError} = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw statusError(403, "Tu cuenta no tiene permisos de administración.");
  }
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  let total = 0;
  const maxBodyBytes = Number(process.env.MULTIMEDIA_MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES) * 1.4;

  for await (const chunk of req) {
    total += chunk.byteLength;
    if (total > maxBodyBytes) {
      throw statusError(413, "La solicitud supera el tamaño máximo permitido.");
    }
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(rawBody || "{}");
}

function sanitizeFolder(value) {
  const folder = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((part) => part.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, ""))
    .filter(Boolean)
    .join("/");

  if (!folder.startsWith("images/") && folder !== "images") {
    return "images/meal-preps";
  }

  return folder || "images/meal-preps";
}

function extensionForContentType(contentType, fileName = "") {
  const explicit = String(fileName).split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (["avif", "gif", "jpeg", "jpg", "png", "webp"].includes(explicit)) {
    return explicit === "jpeg" ? "jpg" : explicit;
  }

  return {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  }[contentType] || "jpg";
}

function statusError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
