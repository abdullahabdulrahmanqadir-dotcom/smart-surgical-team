/**
 * Server-only helpers shared by every public form that lands in the Admin
 * inbox (patient questions, MDT inquiries): the bot check, IP hashing and
 * outgoing email through Resend.
 *
 * Configuration (Worker secrets / variables, all read at request time):
 *
 *   TURNSTILE_SECRET_KEY   Secret for the same Turnstile widget the auth forms
 *                          use. Missing while a site key is built in → the
 *                          routes refuse (fail closed). Both missing → local
 *                          checkout, the check is skipped.
 *   QUESTIONS_IP_SECRET    HMAC key for hashing the sender's IP (all forms).
 *   RESEND_API_KEY         The site's own Resend key (Supabase holds another).
 *   QUESTIONS_FROM_EMAIL   Sender; defaults to no-reply@ssthyroid.com.
 */
import type { Locale } from "./i18n";

const DEFAULT_FROM = "Smart Surgical Team <no-reply@ssthyroid.com>";

export function config(name: string): string {
  return (process.env[name] ?? "").trim();
}

// ---------------------------------------------------------------------------
// Turnstile
// ---------------------------------------------------------------------------

export type TurnstileOutcome = "passed" | "failed" | "skipped" | "unconfigured";

/**
 * Verifies a Turnstile token with Cloudflare. Supabase does this for the auth
 * forms; these routes are ours, so they need their own siteverify call.
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
// Hashing and request details
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
 * limiting then runs on the contact details alone rather than storing a hash
 * that anyone could reverse by trying all four billion IPv4 addresses.
 */
export async function hashIp(ip: string | null): Promise<string | null> {
  const secret = config("QUESTIONS_IP_SECRET");
  if (!ip || !secret) return null;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(ip)));
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

export type Email = { to: string; subject: string; html: string; text: string };

/** Sends through Resend. Returns false (and logs) instead of throwing. */
export async function sendResendEmail(email: Email & { replyTo?: string }): Promise<boolean> {
  const apiKey = config("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[inbox] RESEND_API_KEY is not set; email not sent:", email.subject);
    return false;
  }
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
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      console.error("[inbox] Resend refused the email:", response.status, (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[inbox] Resend request failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** Escaped text with its line breaks kept, for answers written over several lines. */
function textHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

/** Splits free text on blank lines, so each paragraph gets its own spacing. */
function paragraphsOf(value: string): string[] {
  return value.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
}

export type EmailLayout = {
  paragraphs: string[];
  /** The sender's own words, shown quoted. */
  quote?: { label: string; text: string };
  /** Shown after the quote, as written by the team. */
  answer?: string;
  action?: { label: string; href: string };
  notes?: string[];
};

/**
 * One plain, table-free layout for every message. Mail clients strip most CSS,
 * so it relies on inline styles and a single link button, and every email has
 * a text part that says the same thing.
 */
export function emailLayout(locale: Locale, { paragraphs, quote, answer, action, notes = [] }: EmailLayout): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const font = locale === "ar" ? "'Noto Naskh Arabic', Tahoma, Arial, sans-serif" : "Inter, 'Segoe UI', Arial, sans-serif";
  const side = locale === "ar" ? "right" : "left";
  const body = paragraphs.map((text) => `<p style="margin:0 0 16px">${textHtml(text)}</p>`).join("");
  const quoted = quote
    ? `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#5b6566">${escapeHtml(quote.label)}</p>`
      + `<div dir="auto" style="margin:0 0 20px;padding:10px 14px;border-${side}:3px solid #d9d2c5;background:#fbf9f4;color:#5b6566;font-size:15px">${paragraphsOf(quote.text).map((text) => `<p style="margin:0 0 8px">${textHtml(text)}</p>`).join("")}</div>`
    : "";
  const answered = answer
    ? `<div dir="auto">${paragraphsOf(answer).map((text) => `<p style="margin:0 0 16px">${textHtml(text)}</p>`).join("")}</div>`
    : "";
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#146c6a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">${escapeHtml(action.label)}</a></p>`
    : "";
  const small = notes.map((text) => `<p style="margin:0 0 12px;font-size:14px;color:#5b6566">${textHtml(text)}</p>`).join("");
  return `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#fbf9f4;padding:24px">`
    + `<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;font-family:${font};font-size:16px;line-height:1.6;color:#40322a">`
    + `<p style="margin:0 0 20px;font-weight:700;color:#146c6a">Smart Surgical Team</p>${body}${quoted}${answered}${button}${small}`
    + `<p style="margin:24px 0 0;font-size:13px;color:#5b6566">Smart Health Tower · Sulaymaniyah</p></div></body></html>`;
}
