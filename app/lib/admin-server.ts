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

export async function getAdminIdentity(request: Request, ownerOnly = false) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return null;

  const client = getSupabaseServerClient();
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return null;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError || !profile || !STAFF_ROLES.includes(profile.role as StaffRole)) return null;
  if (ownerOnly && profile.role !== "owner") return null;
  return { id: userData.user.id, email: userData.user.email ?? "", name: profile.full_name ?? "", role: profile.role as StaffRole };
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
