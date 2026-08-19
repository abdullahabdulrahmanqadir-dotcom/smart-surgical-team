import { createClient } from "@supabase/supabase-js";

const SUPABASE_REQUEST_TIMEOUT_MS = 10_000;
let cachedClient: ReturnType<typeof createClient> | undefined;
let cachedConfiguration: string | undefined;

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", abortFromCaller);
  }
};

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

  const configuration = `${url}\0${serviceRoleKey}`;
  if (cachedClient && cachedConfiguration === configuration) return cachedClient;

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // A network stall must become a reportable server error instead of leaving
    // an admin page request open forever.
    global: { fetch: fetchWithTimeout },
  });
  cachedConfiguration = configuration;
  return cachedClient;
}
