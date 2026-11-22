import { isLocale, type Locale } from "../../lib/i18n";
import { clientIp, hashIp, refuseForeignRequest, requestHostname, sendResendEmail, siteOrigin, verifyTurnstile } from "../../lib/inbox-server";
import { isTooFast, validateMdtInquiry } from "../../lib/mdt-inquiries";
import { mdtTeamAlertAddress, mdtTeamAlertEmail } from "../../lib/mdt-inquiries-server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

/**
 * POST /api/mdt — an outside doctor, team or institute asks to take part in
 * our MDT, from /:locale/mdt.
 *
 * Same order as /api/questions: cheap refusals first (size, honeypot, fill
 * time, validation, bot check), rate limits before anything is written, and
 * the team alert after the row is safely stored. Errors carry a `code` the
 * form maps to its own localised message.
 */

const MAX_BODY_BYTES = 16_384;
const LIMITS = {
  perEmailPerDay: 3,
  perIpPerHour: 5,
  perIpPerDay: 10,
  /** Whole-site ceilings, far above real traffic (see /api/questions). */
  allPerHour: 10,
  allPerDay: 50,
};

type ErrorCode = "invalid" | "bot" | "rate" | "unavailable" | "server";

const NO_STORE = { "cache-control": "no-store" };

function fail(code: ErrorCode, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, code, ...extra }, { status, headers: NO_STORE });
}

function succeed() {
  return Response.json({ ok: true }, { headers: NO_STORE });
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

  // Honeypot and fill-time trap: a bot is told it succeeded, so it has no
  // reason to adapt; nothing is stored or sent.
  if (typeof body.website === "string" && body.website.trim()) return succeed();
  if (isTooFast(body.elapsedMs)) return succeed();

  const validation = validateMdtInquiry(body);
  if (!validation.ok) return fail("invalid", 422, { errors: validation.errors });
  const input = validation.value;
  const locale: Locale = typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";

  const ip = clientIp(request);
  const bot = await verifyTurnstile(body.turnstileToken, ip, requestHostname(request));
  if (bot === "unconfigured") {
    console.error("[mdt] TURNSTILE_SECRET_KEY is missing while a site key is built in; refusing inquiries.");
    return fail("unavailable", 503);
  }
  if (bot === "failed") return fail("bot", 400);

  let client: ReturnType<typeof getSupabaseServerClient>;
  try {
    client = getSupabaseServerClient();
  } catch (error) {
    console.error("[mdt]", error instanceof Error ? error.message : error);
    return fail("unavailable", 503);
  }

  const ipHash = await hashIp(ip);
  const now = Date.now();
  const hourAgo = new Date(now - 3_600_000).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const table = () => client.from("mdt_inquiries");

  const [byEmail, allHour, allDay, ipHour, ipDay, duplicate] = await Promise.all([
    table().select("id", { count: "exact", head: true }).eq("email", input.email).gte("created_at", dayAgo),
    table().select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
    table().select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    ipHash ? table().select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo) : null,
    ipHash ? table().select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", dayAgo) : null,
    // A double-click or a resubmit after a dropped response.
    table().select("id").eq("email", input.email).eq("message", input.message).gte("created_at", dayAgo).limit(1),
  ]);

  const readError = byEmail.error ?? allHour.error ?? allDay.error ?? ipHour?.error ?? ipDay?.error ?? duplicate.error;
  if (readError) {
    console.error("[mdt] rate-limit read failed:", readError.message);
    return fail("server", 500);
  }
  if (duplicate.data?.length) return succeed();
  if ((allHour.count ?? 0) >= LIMITS.allPerHour || (allDay.count ?? 0) >= LIMITS.allPerDay) {
    console.warn("[mdt] site-wide limit reached; refusing new inquiries for now.");
    return fail("rate", 429);
  }
  if ((byEmail.count ?? 0) >= LIMITS.perEmailPerDay
    || (ipHour?.count ?? 0) >= LIMITS.perIpPerHour
    || (ipDay?.count ?? 0) >= LIMITS.perIpPerDay) {
    return fail("rate", 429);
  }

  const { data: inserted, error: insertError } = await table().insert({
    name: input.name,
    role: input.role,
    institution: input.institution,
    country: input.country,
    email: input.email,
    phone: input.phone,
    interest: input.interest,
    message: input.message,
    locale,
    consent_at: new Date(now).toISOString(),
    ip_hash: ipHash,
  }).select("id").single();
  if (insertError || !inserted) {
    console.error("[mdt] insert failed:", insertError?.message ?? "no row returned");
    return fail("server", 500);
  }

  // The inquiry is saved, so a failed alert never fails the request. It is
  // recorded instead: team_alerted_at stays null and Admin flags the row.
  const teamAddress = mdtTeamAlertAddress();
  if (!teamAddress) {
    console.warn("[mdt] MDT_TEAM_EMAIL / QUESTIONS_TEAM_EMAIL is not set; no team alert sent.");
    return succeed();
  }
  const { count: waiting } = await table().select("id", { count: "exact", head: true }).eq("status", "new");
  const alerted = await sendResendEmail({ to: teamAddress, ...mdtTeamAlertEmail(`${siteOrigin(request)}/en/admin`, waiting ?? null) });
  if (alerted) {
    const { error } = await table().update({ team_alerted_at: new Date().toISOString() }).eq("id", inserted.id);
    if (error) console.error("[mdt] could not record the team alert:", error.message);
  }

  return succeed();
}
