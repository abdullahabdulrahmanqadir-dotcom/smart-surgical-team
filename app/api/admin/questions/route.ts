import { apiError, canAnswerQuestions, jsonObject, resolveAdminIdentity, type AdminIdentity } from "../../../lib/admin-server";
import { deleteAfter, QUESTION_LIMITS, type QuestionStatus } from "../../../lib/patient-questions";
import { answerEmail, sendEmail } from "../../../lib/patient-questions-server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

/**
 * /api/admin/questions — the patient-question inbox.
 *
 * Its own route rather than another case in /api/admin/[resource]: the static
 * segment wins over the dynamic one, and patient data stays in one file with
 * one access rule. Only the Owner and Contributors get past `staff()`; every
 * other staff role is refused even a read.
 *
 *   GET            the inbox (expired rows are deleted first)
 *   POST action    save | send-email | mark-whatsapp | set-status
 *   DELETE ?id=    removes one question
 */

const NO_STORE = { "cache-control": "no-store" };
const INBOX_LIMIT = 500;
const COLUMNS = "id,name,phone,email,reply_via,topic,question,locale,status,email_confirmed_at,answer,answered_by,answered_at,answered_via,internal_note,created_at,updated_at,answerer:profiles!patient_questions_answered_by_fkey(full_name)";
const MIGRATION_HINT = "The patient questions table is not in the database yet. Apply supabase/migrations/0026_patient_questions.sql, then reload.";

function missingTable(message: string | undefined) {
  return Boolean(message) && /patient_questions/.test(message!) && /does not exist|find the table|schema cache/i.test(message!);
}

function dbError(message: string | undefined, fallback: string) {
  return apiError(missingTable(message) ? MIGRATION_HINT : message ?? fallback, 500);
}

type Staff = { identity: AdminIdentity; client: ReturnType<typeof getSupabaseServerClient> };

async function staff(request: Request): Promise<Staff | Response> {
  const access = await resolveAdminIdentity(request);
  if (!access.identity) return apiError(access.message, access.status);
  if (!canAnswerQuestions(access.identity.role)) return apiError("Patient questions are open to the Owner and Contributors only.", 403);
  return { identity: access.identity, client: getSupabaseServerClient() };
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n?/g, "\n").trim();
  return text.length <= max ? text : null;
}

export async function GET(request: Request) {
  const access = await staff(request);
  if (access instanceof Response) return access;
  const { client } = access;

  // Retention runs here rather than on a schedule: the inbox is opened often
  // enough, and v1 has no scheduled jobs. A failure is logged, not fatal.
  const purge = await client.from("patient_questions").delete().lt("delete_after", new Date().toISOString());
  if (purge.error && !missingTable(purge.error.message)) console.error("[admin/questions] retention purge failed:", purge.error.message);

  const { data, error } = await client
    .from("patient_questions")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(INBOX_LIMIT);
  if (error) return dbError(error.message, "Could not read the questions.");
  return Response.json({ data: data ?? [] }, { headers: NO_STORE });
}

type QuestionRow = { id: string; name: string; email: string | null; email_confirmed_at: string | null; question: string; locale: "en" | "ar"; status: QuestionStatus };

export async function POST(request: Request) {
  const access = await staff(request);
  if (access instanceof Response) return access;
  const { client, identity } = access;

  const body = jsonObject(await request.json().catch(() => null));
  if (!body) return apiError("Invalid request.");
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError("Unknown question.");

  const { data: row, error: readError } = await client
    .from("patient_questions")
    .select("id,name,email,email_confirmed_at,question,locale,status")
    .eq("id", id)
    .maybeSingle<QuestionRow>();
  if (readError) return dbError(readError.message, "Could not read this question.");
  if (!row) return apiError("This question no longer exists. It may have been deleted.", 404);

  const now = new Date();
  const stamp = now.toISOString();
  const update = (patch: Record<string, unknown>) => client.from("patient_questions").update({ ...patch, updated_at: stamp }).eq("id", id);

  const answer = body.answer === undefined ? undefined : cleanText(body.answer, QUESTION_LIMITS.answerMax);
  if (answer === null) return apiError(`The answer must be text of at most ${QUESTION_LIMITS.answerMax} characters.`);
  const note = body.internal_note === undefined ? undefined : cleanText(body.internal_note, QUESTION_LIMITS.noteMax);
  if (note === null) return apiError(`The internal note must be text of at most ${QUESTION_LIMITS.noteMax} characters.`);

  switch (body.action) {
    case "save": {
      const patch: Record<string, unknown> = {};
      if (answer !== undefined) patch.answer = answer || null;
      if (note !== undefined) patch.internal_note = note || null;
      const { error } = await update(patch);
      if (error) return dbError(error.message, "Could not save the draft.");
      return Response.json({ ok: true, message: "Draft saved." }, { headers: NO_STORE });
    }

    case "send-email": {
      if (!answer) return apiError("Write the answer before sending it.");
      if (!row.email) return apiError("This patient gave no email address. Answer on WhatsApp instead.");
      if (!row.email_confirmed_at) return apiError("The patient has not confirmed this email address yet, so nothing can be sent to it. Answer on WhatsApp instead, or wait for the confirmation.");
      if (row.status === "spam") return apiError("This question is marked as spam. Reopen it before answering.");

      const sent = await sendEmail({ to: row.email, ...answerEmail(row.locale, row.name, row.question, answer) });
      if (!sent) return apiError("The email could not be sent. Nothing was marked as answered; try again, or answer on WhatsApp.", 502);

      const { error } = await update({ answer, internal_note: note ?? undefined, status: "answered", answered_by: identity.id, answered_at: stamp, answered_via: "email", delete_after: deleteAfter("answered", now).toISOString() });
      // The patient already has the email; say so plainly rather than inviting a resend.
      if (error) return Response.json({ ok: true, warning: `The answer was emailed, but recording it failed (${error.message}). Do not send it again; mark it answered later.` }, { headers: NO_STORE });
      return Response.json({ ok: true, message: `Answer emailed to ${row.email}.` }, { headers: NO_STORE });
    }

    case "mark-whatsapp": {
      if (!answer) return apiError("Paste or write the answer you sent, so the record shows what the patient was told.");
      if (row.status === "spam") return apiError("This question is marked as spam. Reopen it before answering.");
      const { error } = await update({ answer, internal_note: note ?? undefined, status: "answered", answered_by: identity.id, answered_at: stamp, answered_via: "whatsapp", delete_after: deleteAfter("answered", now).toISOString() });
      if (error) return dbError(error.message, "Could not record the answer.");
      return Response.json({ ok: true, message: "Recorded as answered on WhatsApp." }, { headers: NO_STORE });
    }

    case "set-status": {
      const status = body.status;
      if (status !== "new" && status !== "closed" && status !== "spam") return apiError("Unknown status.");
      const patch: Record<string, unknown> = { status, delete_after: deleteAfter(status, now).toISOString() };
      // Reopening clears the answered stamp so the question counts as waiting
      // again; the draft answer text is kept.
      if (status === "new") Object.assign(patch, { answered_by: null, answered_at: null, answered_via: null });
      const { error } = await update(patch);
      if (error) return dbError(error.message, "Could not change the status.");
      const message = status === "spam" ? "Marked as spam. It will be deleted in 30 days." : status === "closed" ? "Closed without an answer." : "Reopened.";
      return Response.json({ ok: true, message }, { headers: NO_STORE });
    }

    default:
      return apiError("Unknown action.");
  }
}

export async function DELETE(request: Request) {
  const access = await staff(request);
  if (access instanceof Response) return access;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError("Unknown question.");
  const { error } = await access.client.from("patient_questions").delete().eq("id", id);
  if (error) return dbError(error.message, "Could not delete this question.");
  return Response.json({ ok: true, message: "Question deleted permanently." }, { headers: NO_STORE });
}
