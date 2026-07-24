import {createClient} from "@supabase/supabase-js";
import {loadEnvFile} from "./r2-media.mjs";

const localEnvReady = loadEnvFile(new URL("../.env.local", import.meta.url));
let supabaseAdmin;

export async function assertBackofficeRequest(req) {
  await localEnvReady;

  const authorization = req.headers?.authorization || req.headers?.Authorization || "";
  const token = String(authorization).match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw statusError(401, "Debes iniciar sesión para usar el backoffice.");
  }

  const supabase = getSupabaseAdmin();
  const {data: userData, error: userError} = await supabase.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user?.id) {
    throw statusError(401, "La sesión ya no es válida. Vuelve a iniciar sesión.");
  }

  const {data: profile, error: profileError} = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw statusError(502, "No pudimos validar los permisos del backoffice.", profileError);
  }

  const isOwner = Boolean(profile?.is_admin);
  const isOperator = String(user.app_metadata?.backoffice_role || "").toLowerCase() === "operator";

  if (!isOwner && !isOperator) {
    throw statusError(403, "Tu cuenta no tiene permisos para esta operación.");
  }

  return {
    role: isOwner ? "owner" : "operator",
    supabase,
    user
  };
}

export async function assertOwnerBackofficeRequest(req) {
  const access = await assertBackofficeRequest(req);

  if (access.role !== "owner") {
    throw statusError(403, "Esta herramienta está disponible sólo para la cuenta propietaria.");
  }

  return access;
}

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = cleanText(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) {
    throw statusError(500, "Falta configurar Supabase para el backoffice.");
  }

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {autoRefreshToken: false, persistSession: false}
  });

  return supabaseAdmin;
}

export function cleanText(value) {
  return String(value || "").trim();
}

export function statusError(statusCode, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.statusCode = statusCode;
  return error;
}
