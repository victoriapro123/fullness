import { getSupabaseClient, isSupabaseConfigured } from "./supabase.js";

function unavailableResult() {
  return { data: null, error: null, configured: false };
}

async function getConfiguredSupabase() {
  if (!isSupabaseConfigured) return null;

  return getSupabaseClient();
}

function mapDraft(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    scope: row.scope,
    draftKey: row.draft_key,
    title: row.title || "Mealprep sin título",
    form: row.payload?.form || {},
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

export async function listBackofficeDrafts({ ownerId, scope = "meal-prep" }) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return { data: [], error: null, configured: false };

  const { data, error } = await supabase
    .from("backoffice_drafts")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("scope", scope)
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error, configured: true };

  return { data: (data || []).map(mapDraft), error: null, configured: true };
}

export async function saveBackofficeDraft({ ownerId, scope = "meal-prep", draftKey, title, form }) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const { data, error } = await supabase
    .from("backoffice_drafts")
    .upsert(
      {
        owner_id: ownerId,
        scope,
        draft_key: draftKey,
        title,
        payload: { form }
      },
      { onConflict: "owner_id,scope,draft_key" }
    )
    .select("*")
    .single();

  if (error) return { data: null, error, configured: true };

  return { data: mapDraft(data), error: null, configured: true };
}

export async function deleteBackofficeDraft({ draftKey, scope = "meal-prep" }) {
  const supabase = await getConfiguredSupabase();
  if (!supabase) return unavailableResult();

  const { error } = await supabase
    .from("backoffice_drafts")
    .delete()
    .eq("scope", scope)
    .eq("draft_key", draftKey);

  return { data: error ? null : draftKey, error, configured: true };
}
