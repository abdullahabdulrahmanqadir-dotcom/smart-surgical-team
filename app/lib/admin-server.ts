import sanitizeHtml from "sanitize-html";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export const STAFF_ROLES = ["owner", "content_manager", "editor", "contributor"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type AdminResource = "overview" | "content" | "topics" | "events" | "contributors" | "people" | "research" | "research-topics";

// Membership in STAFF_ROLES alone used to grant every staff tier the power to
// delete any record. The four tiers are now actually enforced: writing content
// is broadly delegated, but reshaping the taxonomy and destroying records stay
// with the senior roles.
// Research topics sit with the other taxonomy: renaming one rewrites the label
// and cover colour of every paper filed under it, so it is a senior-role edit
// even though writing an individual paper is not.
const WRITABLE: Record<StaffRole, AdminResource[]> = {
  owner: ["content", "research", "research-topics", "topics", "events", "contributors", "people"],
  content_manager: ["content", "research", "research-topics", "topics", "events", "contributors"],
  editor: ["content", "research", "events", "contributors"],
  contributor: ["content", "research"],
};

const DELETABLE: Record<StaffRole, AdminResource[]> = {
  owner: ["content", "research", "research-topics", "topics", "events", "contributors"],
  content_manager: ["content", "research", "research-topics", "topics", "events", "contributors"],
  editor: ["content", "research"],
  contributor: [],
};

export function canWrite(role: StaffRole, resource: AdminResource) {
  return WRITABLE[role].includes(resource);
}

export function canDelete(role: StaffRole, resource: AdminResource) {
  return DELETABLE[role].includes(resource);
}

const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Owner",
  content_manager: "Content manager",
  editor: "Editor",
  contributor: "Contributor",
};

export function roleLabel(role: StaffRole) {
  return ROLE_LABEL[role];
}

export function slugify(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

const RICH_TEXT_SIZES = ["2", "3", "4", "5"];

// The editor normalises its output before saving, but browsers and pasted
// documents still produce `<b>`, `<i>` and `<div>`. Those were being stripped
// outright, so bold and italic looked applied in the workspace and arrived
// plain on the public page: accept them and fold them into the kept tag.
export function safeRichText(value: unknown) {
  return sanitizeHtml(typeof value === "string" ? value : "", {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h2", "h3", "blockquote", "font"],
    allowedAttributes: { a: ["href", "target", "rel"], font: ["size"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer noopener", target: "_blank" }),
      b: "strong",
      i: "em",
      div: "p",
      // Only the four documented steps have styling on the public page; any
      // other size would render as an unstyled inline wrapper.
      font: (_tagName, attribs) => ({ tagName: "font", attribs: (RICH_TEXT_SIZES.includes(attribs.size) ? { size: attribs.size } : {}) as Record<string, string> }),
    },
  });
}

type ProfileRow = { id: string; full_name: string | null; role: string };
type ProfileRead = { data: ProfileRow | null; error: { message: string } | null };

// `getSupabaseServerClient` rejects publishable keys outright, so this read
// always runs as service-role and row-level security never hides the row: an
// empty result genuinely means the profile is missing. An earlier retry-as-the-
// caller fallback lived here; it was unreachable, and its key fallback could
// have sent the secret key as the `apikey` header on an untrusted request.
async function readStaffProfile(client: ReturnType<typeof getSupabaseServerClient>, userId: string): Promise<ProfileRead> {
  return await client.from("profiles").select("id, full_name, role").eq("id", userId).maybeSingle() as ProfileRead;
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
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    return { identity: null, status: 500, message: `Server configuration problem: ${detail}` };
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return { identity: null, status: 401, message: "Your session is no longer valid. Sign in again to open the workspace." };
  const email = userData.user.email ?? "";

  const { data: profile, error: profileError } = await readStaffProfile(client, userData.user.id);
  if (profileError) return { identity: null, status: 500, message: `Could not read your staff profile: ${profileError.message}` };
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
