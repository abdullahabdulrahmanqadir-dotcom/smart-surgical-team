/**
 * Patient questions — server-only helpers: the bot check, rate-limit hashing,
 * confirmation tokens and outgoing email.
 *
 * Configuration (Worker secrets / variables, all read at request time):
 *
 *   TURNSTILE_SECRET_KEY   Secret for the same Turnstile widget the auth forms
 *                          use. Missing while a site key is built in → the
 *                          route refuses (fails closed). Both missing → local
 *                          checkout, the check is skipped.
 *   QUESTIONS_IP_SECRET    HMAC key for hashing the sender's IP.
 *   RESEND_API_KEY         The site's own Resend key (Supabase holds another).
 *   QUESTIONS_FROM_EMAIL   Sender; defaults to no-reply@ssthyroid.com.
 *   QUESTIONS_TEAM_EMAIL   Receives the "new question" alert and is the
 *                          reply-to on every patient email.
 */
import type { Locale } from "./i18n";
import { EMAIL_TOKEN_TTL_DAYS, REPLY_WITHIN_WORKING_DAYS } from "./patient-questions";

const DEFAULT_FROM = "Smart Surgical Team <no-reply@ssthyroid.com>";

function config(name: string): string {
  return (process.env[name] ?? "").trim();
}

// ---------------------------------------------------------------------------
// Turnstile
// ---------------------------------------------------------------------------

export type TurnstileOutcome = "passed" | "failed" | "skipped" | "unconfigured";

/**
 * Verifies a Turnstile token with Cloudflare. Supabase does this for the auth
 * forms; this route is ours, so it needs its own siteverify call.
 */
export async function verifyTurnstile(token: unknown, ip: string | null): Promise<TurnstileOutcome> {
  const secret = config("TURNSTILE_SECRET_KEY");
  const siteKeyBuiltIn = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  if (!secret) return siteKeyBuiltIn ? "unconfigured" : "skipped";
  if (typeof token !== "string" || !token || token.length > 2048) return "failed";

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    if (!response.ok) return "failed";
    const result = await response.json() as { success?: boolean };
    return result.success === true ? "passed" : "failed";
  } catch {
    return "failed";
  }
}

// ---------------------------------------------------------------------------
// Hashing and tokens
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/**
 * HMAC of the client IP. Without the secret it falls back to null — rate
 * limiting then runs on the phone number alone rather than storing a hash
 * that anyone could reverse by trying all four billion IPv4 addresses.
 */
export async function hashIp(ip: string | null): Promise<string | null> {
  const secret = config("QUESTIONS_IP_SECRET");
  if (!ip || !secret) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(ip)));
}

/** A 256-bit URL-safe token, plus the hash and expiry that are stored. */
export async function createEmailToken(now: Date = new Date()) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return {
    token,
    hash: await sha256Hex(token),
    expiresAt: new Date(now.getTime() + EMAIL_TOKEN_TTL_DAYS * 86_400_000),
  };
}

export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip") ?? null;
}

/** Public origin for links in email: the configured one, else this request's. */
export function siteOrigin(request: Request): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  return configured || new URL(request.url).origin;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

type Email = { to: string; subject: string; html: string; text: string };

/** Sends through Resend. Returns false (and logs) instead of throwing. */
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = config("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[questions] RESEND_API_KEY is not set; email not sent:", email.subject);
    return false;
  }
  const replyTo = config("QUESTIONS_TEAM_EMAIL");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: config("QUESTIONS_FROM_EMAIL") || DEFAULT_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!response.ok) {
      console.error("[questions] Resend refused the email:", response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[questions] Resend request failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

export function teamAlertAddress(): string {
  return config("QUESTIONS_TEAM_EMAIL");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/**
 * One plain, table-free layout for every message. Mail clients strip most CSS,
 * so it relies on inline styles and a single link button, and every email has
 * a text part that says the same thing.
 */
function layout(locale: Locale, paragraphs: string[], action?: { label: string; href: string }, notes: string[] = []): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const font = locale === "ar" ? "'Noto Naskh Arabic', Tahoma, Arial, sans-serif" : "Inter, 'Segoe UI', Arial, sans-serif";
  const body = paragraphs.map((text) => `<p style="margin:0 0 16px">${escapeHtml(text)}</p>`).join("");
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#146c6a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">${escapeHtml(action.label)}</a></p>`
    : "";
  const small = notes.map((text) => `<p style="margin:0 0 12px;font-size:14px;color:#5b6566">${escapeHtml(text)}</p>`).join("");
  return `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#fbf9f4;padding:24px">`
    + `<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;font-family:${font};font-size:16px;line-height:1.6;color:#40322a">`
    + `<p style="margin:0 0 20px;font-weight:700;color:#146c6a">Smart Surgical Team</p>${body}${button}${small}`
    + `<p style="margin:24px 0 0;font-size:13px;color:#5b6566">Smart Health Tower · Sulaymaniyah</p></div></body></html>`;
}

const CONFIRM_COPY = {
  en: {
    subject: "Please confirm your email — Smart Surgical Team",
    greeting: (name: string) => `Hello ${name},`,
    received: "We have received your question. Please confirm this email address so the team can send the answer to it.",
    reply: `We usually reply within ${REPLY_WITHIN_WORKING_DAYS} working days.`,
    button: "Confirm my email",
    expiry: `This link works for ${EMAIL_TOKEN_TTL_DAYS} days. If you did not send a question, you can ignore this email.`,
    emergency: "If this is an emergency, do not wait for our reply: go to the nearest emergency department.",
  },
  ar: {
    subject: "يرجى تأكيد بريدك الإلكتروني — Smart Surgical Team",
    greeting: (name: string) => `مرحباً ${name}،`,
    received: "لقد استلمنا سؤالك. يرجى تأكيد عنوان البريد الإلكتروني هذا ليتمكن الفريق من إرسال الإجابة إليه.",
    reply: `نردّ عادةً خلال ${REPLY_WITHIN_WORKING_DAYS} أيام عمل.`,
    button: "تأكيد بريدي الإلكتروني",
    expiry: `يعمل هذا الرابط لمدة ${EMAIL_TOKEN_TTL_DAYS} أيام. إذا لم ترسل سؤالاً، يمكنك تجاهل هذه الرسالة.`,
    emergency: "إذا كانت حالتك طارئة، فلا تنتظر ردّنا: توجّه إلى أقرب قسم طوارئ.",
  },
} as const;

export function confirmEmail(locale: Locale, name: string, link: string): Omit<Email, "to"> {
  const copy = CONFIRM_COPY[locale];
  const lines = [copy.greeting(name), copy.received, copy.reply];
  const after = [copy.expiry, copy.emergency];
  return {
    subject: copy.subject,
    html: layout(locale, lines, { label: copy.button, href: link }, after),
    text: [...lines, "", `${copy.button}: ${link}`, "", ...after].join("\n"),
  };
}

/** The team alert carries no question text and no name: the inbox holds those. */
export function teamAlertEmail(adminLink: string): Omit<Email, "to"> {
  const lines = ["A new patient question has arrived on the website.", "Open Admin → Questions to read and answer it."];
  return {
    subject: "New patient question — open Admin",
    html: layout("en", lines, { label: "Open Admin", href: adminLink }),
    text: [...lines, "", adminLink].join("\n"),
  };
}
