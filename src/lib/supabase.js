const environment = import.meta.env || {};

const supabaseUrl =
  environment.VITE_SUPABASE_URL ||
  environment.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  environment.VITE_SUPABASE_PUBLISHABLE_KEY ||
  environment.VITE_SUPABASE_ANON_KEY ||
  environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let supabaseClientPromise;

export async function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;

  if (!supabaseClientPromise) {
    supabaseClientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      })
    );
  }

  return supabaseClientPromise;
}
