import { isLocale, type Locale } from "../../lib/i18n";
import { refuseForeignRequest, requestHostname } from "../../lib/inbox-server";
import { validateQuestion } from "../../lib/patient-questions";
import {
  clientIp,
  confirmEmail,
  createEmailToken,
  hashIp,
  sendEmail,
  siteOrigin,
  teamAlertAddress,
  teamAlertEmail,
  verifyTurnstile,
} from "../../lib/patient-questions-server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

/**
 * POST /api/questions — a patient sends a question from /:locale/ask.
 *
 * Order matters: the cheap refusals (size, honeypot, validation, bot check)
 * run before anything touches the database, and the rate limits run before
 * anything is written or emailed.
 *
 * Errors carry a `code` the form maps to its own localised message, never a
 * server string shown to the patient.
 */

const MAX_BODY_BYTES = 16_384;
const LIMITS = {
  perPhonePerDay: 3,
  /** Stops anyone using the confirm email to flood a stranger's inbox. */
  perEmailPerDay: 3,
  perIpPerHour: 5,
  perIpPerDay: 10,
  /**
   * Whole-site ceilings, far above real traffic. A flood from many IPs and
   * phones still stops here, before it fills the inbox or spends the Resend
   * quota the sign-up emails also depend on.
   */
  allPerHour: 30,
  allPerDay: 200,
};

type ErrorCode = "invalid" | "bot" | "rate" | "unavailable" | "server";

const NO_STORE = { "cache-control": "no-store" };

function fail(code: ErrorCode, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, code, ...extra }, { status, headers: NO_STORE });
}

function succeed(emailConfirmation: boolean) {
  return Response.json({ ok: true, emailConfirmation }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const foreign = refuseForeignRequest(request);
  if (foreign) return fail("invalid", foreign);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail("invalid", 413);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail("invalid", 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail("invalid", 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return fail("invalid", 400);
  }

  // Honeypot: a field people never see. A bot that fills it is told it
  // succeeded, so it has no reason to adapt; nothing is stored or sent.
  if (typeof body.website === "string" && body.website.trim()) return succeed(false);

  // Validation is local and free; the bot check is a network call. Junk is
  // refused before it costs a siteverify request.
  const validation = validateQuestion(body);
  if (!validation.ok) return fail("invalid", 422, { errors: validation.errors });
  const input = validation.value;
  const locale: Locale = typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";

  const ip = clientIp(request);
  const bot = await verifyTurnstile(body.turnstileToken, ip, requestHostname(request));
  if (bot === "unconfigured") {
    console.error("[questions] TURNSTILE_SECRET_KEY is missing while a site key is built in; refusing questions.");
    return fail("unavailable", 503);
  }
  if (bot === "failed") return fail("bot", 400);

  let client: ReturnType<typeof getSupabaseServerClient>;
  try {
    client = getSupabaseServerClient();
  } catch (error) {
    console.error("[questions]", error instanceof Error ? error.message : error);
    return fail("unavailable", 503);
  }

  const ipHash = await hashIp(ip);
  const now = Date.now();
  const hourAgo = new Date(now - 3_600_000).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const table = () => client.from("patient_questions");

  const [byPhone, byEmail, allHour, allDay, ipHour, ipDay, duplicate] = await Promise.all([
    table().select("id", { count: "exact", head: true }).eq("phone", input.phone).gte("created_at", dayAgo),
    input.email ? table().select("id", { count: "exact", head: true }).eq("email", input.email).gte("created_at", dayAgo) : null,
    table().select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
    table().select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    ipHash ? table().select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo) : null,
    ipHash ? table().select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", dayAgo) : null,
    // A double-click or a resubmit after a dropped response: same phone, same
    // words, same day. Answer as if it worked rather than storing it twice.
    table().select("id, email_token_hash").eq("phone", input.phone).eq("question", input.question).gte("created_at", dayAgo).limit(1),
  ]);

  const readError = byPhone.error ?? byEmail?.error ?? allHour.error ?? allDay.error ?? ipHour?.error ?? ipDay?.error ?? duplicate.error;
  if (readError) {
    console.error("[questions] rate-limit read failed:", readError.message);
    return fail("server", 500);
  }
  if (duplicate.data?.length) return succeed(Boolean(input.email && duplicate.data[0].email_token_hash));
  if ((allHour.count ?? 0) >= LIMITS.allPerHour || (allDay.count ?? 0) >= LIMITS.allPerDay) {
    console.warn("[questions] site-wide limit reached; refusing new questions for now.");
    return fail("rate", 429);
  }
  if ((byPhone.count ?? 0) >= LIMITS.perPhonePerDay
    || (byEmail?.count ?? 0) >= LIMITS.perEmailPerDay
    || (ipHour?.count ?? 0) >= LIMITS.perIpPerHour
    || (ipDay?.count ?? 0) >= LIMITS.perIpPerDay) {
    return fail("rate", 429);
  }

  const token = input.email ? await createEmailToken() : null;
  const { data: inserted, error: insertError } = await table().insert({
    name: input.name,
    phone: input.phone,
    email: input.email,
    reply_via: input.replyVia,
    topic: input.topic,
    question: input.question,
    locale,
    consent_at: new Date(now).toISOString(),
    email_token_hash: token?.hash ?? null,
    email_token_expires_at: token?.expiresAt.toISOString() ?? null,
    ip_hash: ipHash,
  }).select("id").single();
  if (insertError || !inserted) {
    console.error("[questions] insert failed:", insertError?.message ?? "no row returned");
    return fail("server", 500);
  }

  const origin = siteOrigin(request);
  const teamAddress = teamAlertAddress();
  if (!teamAddress) console.warn("[questions] QUESTIONS_TEAM_EMAIL is not set; no team alert sent.");

  // The question is already saved, so a failed email never fails the request:
  // the team still sees it in Admin, and the patient is told only what is true
  // about the confirmation email.
  const [confirmSent, alerted] = await Promise.all([
    input.email && token
      ? sendEmail({ to: input.email, ...confirmEmail(locale, input.name, `${origin}/${locale}/ask/confirm#${token.token}`) })
      : Promise.resolve(false),
    teamAddress ? sendEmail({ to: teamAddress, ...teamAlertEmail(`${origin}/en/admin`) }) : Promise.resolve(false),
  ]);

  // Recorded so Admin can flag a question whose alert never went out.
  if (alerted) {
    const { error } = await table().update({ team_alerted_at: new Date().toISOString() }).eq("id", inserted.id);
    if (error) console.error("[questions] could not record the team alert:", error.message);
  }

  return succeed(confirmSent);
}
