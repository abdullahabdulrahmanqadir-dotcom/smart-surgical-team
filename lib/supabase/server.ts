import { createClient } from "@supabase/supabase-js";

function decodedKeyRole(key: string) {
  const payload = key.split(".")[1];
  if (!payload) return null;
  try {
    return (JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");

  // A publishable key in this slot leaves every staff query subject to
  // row-level security, which silently returns empty results rather than
  // failing. Reject it here so the cause is reported instead of guessed at.
  if (serviceRoleKey.startsWith("sb_publishable_") || decodedKeyRole(serviceRoleKey) === "anon") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY holds a publishable key. Set it to the project's secret key (sb_secret_…).");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
