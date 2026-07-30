import sanitizeHtml from "sanitize-html";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export const STAFF_ROLES = ["owner", "content_manager", "editor", "contributor"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function slugify(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

export function safeRichText(value: unknown) {
  return sanitizeHtml(typeof value === "string" ? value : "", {
    allowedTags: ["p", "br", "strong", "em", "u", "a", "ul", "ol", "li", "h2", "h3", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer noopener", target: "_blank" }) },
  });
}

export type AdminIdentity = { id: string; email: string; name: string; role: StaffRole };
export type AdminIdentityResult = { identity: AdminIdentity } | { identity: null; message: string; status: number };

// Resolving access has three distinct outcomes, and the workspace needs to tell
// them apart: no usable session (sign in again), a signed-in account without a
// staff role (ask the Owner), or an infrastructure failure (retry).
export async function resolveAdminIdentity(request: Request, ownerOnly = false): Promise<AdminIdentityResult> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return { identity: null, status: 401, message: "Your session has expired. Sign in again to open the workspace." };

  let client: ReturnType<typeof getSupabaseServerClient>;
  try {
    client = getSupabaseServerClient();
  } catch {
    return { identity: null, status: 500, message: "The server is missing its Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return { identity: null, status: 401, message: "Your session is no longer valid. Sign in again to open the workspace." };
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) return { identity: null, status: 500, message: `Could not read your staff profile: ${profileError.message}` };
  const email = userData.user.email ?? "";
  if (!profile) return { identity: null, status: 403, message: `No profile record exists for ${email}. Ask the Owner to add one.` };
  if (!STAFF_ROLES.includes(profile.role as StaffRole)) {
    return { identity: null, status: 403, message: `${email} is registered as “${String(profile.role).replace(/_/g, " ")}”, which has no admin access. Ask the Owner to grant a staff role.` };
  }
  if (ownerOnly && profile.role !== "owner") return { identity: null, status: 403, message: "Only the Owner can manage people and roles." };
  return { identity: { id: userData.user.id, email, name: profile.full_name ?? "", role: profile.role as StaffRole } };
}

export async function getAdminIdentity(request: Request, ownerOnly = false) {
  return (await resolveAdminIdentity(request, ownerOnly)).identity;
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
