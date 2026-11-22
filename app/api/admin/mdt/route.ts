import { apiError, canAnswerQuestions, jsonObject, resolveAdminIdentity, type AdminIdentity } from "../../../lib/admin-server";
import { MDT_LIMITS, mdtDeleteAfter, type MdtStatus } from "../../../lib/mdt-inquiries";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

/**
 * /api/admin/mdt — the MDT-inquiry list in the Admin Inbox.
 *
 * Same access rule as /api/admin/questions: the Owner and Contributors only,
 * for reads as well as writes. Replies go from the team's own mailbox, so this
 * route never sends email; it records that contact was made.
 *
 *   GET            the list (expired rows are deleted first)
 *   POST action    save | mark-contacted | set-status
 *   DELETE ?id=    removes one inquiry
 */

const NO_STORE = { "cache-control": "no-store" };
const LIST_LIMIT = 500;
const COLUMNS = "id,name,role,institution,country,email,phone,interest,message,locale,status,contacted_at,internal_note,team_alerted_at,created_at,updated_at,contacter:profiles!mdt_inquiries_contacted_by_fkey(full_name)";
const MIGRATION_HINT = "The MDT inquiries table is not in the database yet. Apply supabase/migrations/0027_mdt_inquiries.sql, then reload.";
const SETTABLE: readonly MdtStatus[] = ["new", "closed", "spam", "wrong_form"];

function missingTable(message: string | undefined) {
  return Boolean(message) && /mdt_inquiries/.test(message!) && /does not exist|find the table|schema cache/i.test(message!);
}

function dbError(message: string | undefined, fallback: string) {
  return apiError(missingTable(message) ? MIGRATION_HINT : message ?? fallback, 500);
}

type Staff = { identity: AdminIdentity; client: ReturnType<typeof getSupabaseServerClient> };

async function staff(request: Request): Promise<Staff | Response> {
  const access = await resolveAdminIdentity(request);
  if (!access.identity) return apiError(access.message, access.status);
  if (!canAnswerQuestions(access.identity.role)) return apiError("MDT inquiries are open to the Owner and Contributors only.", 403);
  return { identity: access.identity, client: getSupabaseServerClient() };
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET(request: Request) {
  const access = await staff(request);
  if (access instanceof Response) return access;
  const { client } = access;

  // Retention runs when the inbox is opened, as for patient questions.
  const purge = await client.from("mdt_inquiries").delete().lt("delete_after", new Date().toISOString());
  if (purge.error && !missingTable(purge.error.message)) console.error("[admin/mdt] retention purge failed:", purge.error.message);

  const { data, error } = await client
    .from("mdt_inquiries")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) return dbError(error.message, "Could not read the MDT inquiries.");
  return Response.json({ data: data ?? [] }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const access = await staff(request);
  if (access instanceof Response) return access;
  const { client, identity } = access;

  const body = jsonObject(await request.json().catch(() => null));
  if (!body) return apiError("Invalid request.");
  if (!validId(body.id)) return apiError("Unknown inquiry.");
  const id = body.id;

  const { data: row, error: readError } = await client.from("mdt_inquiries").select("id,status").eq("id", id).maybeSingle<{ id: string; status: MdtStatus }>();
  if (readError) return dbError(readError.message, "Could not read this inquiry.");
  if (!row) return apiError("This inquiry no longer exists. It may have been deleted.", 404);

  let note: string | null | undefined;
  if (body.internal_note !== undefined) {
    if (typeof body.internal_note !== "string") return apiError("The internal note must be text.");
    const text = body.internal_note.replace(/\r\n?/g, "\n").trim();
    if (text.length > MDT_LIMITS.noteMax) return apiError(`The internal note must be at most ${MDT_LIMITS.noteMax} characters.`);
    note = text || null;
  }

  const now = new Date();
  const update = (patch: Record<string, unknown>) =>
    client.from("mdt_inquiries").update({ ...patch, ...(note !== undefined ? { internal_note: note } : {}), updated_at: now.toISOString() }).eq("id", id);

  switch (body.action) {
    case "save": {
      const { error } = await update({});
      if (error) return dbError(error.message, "Could not save the note.");
      return Response.json({ ok: true, message: "Note saved." }, { headers: NO_STORE });
    }

    case "mark-contacted": {
      if (row.status === "spam") return apiError("This inquiry is marked as spam. Reopen it first.");
      const { error } = await update({ status: "contacted", contacted_by: identity.id, contacted_at: now.toISOString(), delete_after: mdtDeleteAfter("contacted", now).toISOString() });
      if (error) return dbError(error.message, "Could not record the contact.");
      return Response.json({ ok: true, message: "Marked as contacted." }, { headers: NO_STORE });
    }

    case "set-status": {
      const status = body.status as MdtStatus;
      if (!SETTABLE.includes(status)) return apiError("Unknown status.");
      const patch: Record<string, unknown> = { status, delete_after: mdtDeleteAfter(status, now).toISOString() };
      // Reopening clears the contacted stamp so it counts as waiting again.
      if (status === "new") Object.assign(patch, { contacted_by: null, contacted_at: null });
      const { error } = await update(patch);
      if (error) return dbError(error.message, "Could not change the status.");
      const message = status === "spam" ? "Marked as spam. It will be deleted in 30 days."
        : status === "closed" ? "Closed."
          : status === "wrong_form" ? "Marked as sent by a patient through the wrong form."
            : "Reopened.";
      return Response.json({ ok: true, message }, { headers: NO_STORE });
    }

    default:
      return apiError("Unknown action.");
  }
}

export async function DELETE(request: Request) {
  const access = await staff(request);
  if (access instanceof Response) return access;
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return apiError("Unknown inquiry.");
  const { error } = await access.client.from("mdt_inquiries").delete().eq("id", id);
  if (error) return dbError(error.message, "Could not delete this inquiry.");
  return Response.json({ ok: true, message: "Inquiry deleted permanently." }, { headers: NO_STORE });
}
