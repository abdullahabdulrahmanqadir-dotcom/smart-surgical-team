/**
 * Patient questions — server-only helpers: confirmation tokens and the
 * patient-facing emails. The bot check, IP hashing and Resend transport are
 * shared with the MDT form and live in `inbox-server.ts`; they are re-exported
 * here so existing imports keep working.
 *
 * Configuration specific to patient questions (see inbox-server.ts for the
 * shared secrets):
 *
 *   QUESTIONS_TEAM_EMAIL   Reply-to on every patient email, and the alert
 *                          address when QUESTIONS_ALERT_EMAILS is unset.
 *   QUESTIONS_ALERT_EMAILS Optional comma-separated list that receives the
 *                          "new question" and "new MDT inquiry" alerts.
 */
import type { Locale } from "./i18n";
import { config, emailLayout as layout, sendResendEmail, sha256Hex, type Email } from "./inbox-server";
import { EMAIL_TOKEN_TTL_DAYS, REPLY_WITHIN_WORKING_DAYS } from "./patient-questions";

export { clientIp, hashIp, sha256Hex, siteOrigin, verifyTurnstile, type TurnstileOutcome } from "./inbox-server";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

/** Sends through Resend with the team address as reply-to. Never throws. */
export function sendEmail(email: Email): Promise<boolean> {
  return sendResendEmail({ ...email, replyTo: config("QUESTIONS_TEAM_EMAIL") || undefined });
}

export function teamAlertAddress(): string {
  return config("QUESTIONS_ALERT_EMAILS") || config("QUESTIONS_TEAM_EMAIL");
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
    html: layout(locale, { paragraphs: lines, action: { label: copy.button, href: link }, notes: after }),
    text: [...lines, "", `${copy.button}: ${link}`, "", ...after].join("\n"),
  };
}

/** The team alert carries no question text and no name: the inbox holds those. */
export function teamAlertEmail(adminLink: string): Omit<Email, "to"> {
  const lines = ["A new patient question has arrived on the website.", "Open Admin → Questions to read and answer it."];
  return {
    subject: "New patient question — open Admin",
    html: layout("en", { paragraphs: lines, action: { label: "Open Admin", href: adminLink } }),
    text: [...lines, "", adminLink].join("\n"),
  };
}

const ANSWER_COPY = {
  en: {
    subject: "Our answer to your question — Smart Surgical Team",
    greeting: (name: string) => `Hello ${name},`,
    intro: "Thank you for your question. Here is our answer.",
    quoteLabel: "Your question",
    disclaimer: "This is general information, not a diagnosis or a treatment plan. For advice about your own case, please book a visit with the clinic.",
    emergency: "If you have an emergency, go to the nearest emergency department.",
    reply: "You can reply to this email if anything is unclear.",
  },
  ar: {
    subject: "إجابتنا عن سؤالك — Smart Surgical Team",
    greeting: (name: string) => `مرحباً ${name}،`,
    intro: "شكراً لسؤالك. إليك إجابتنا.",
    quoteLabel: "سؤالك",
    disclaimer: "هذه معلومات عامة، وليست تشخيصاً أو خطة علاج. للحصول على استشارة بشأن حالتك الخاصة، يرجى حجز موعد في العيادة.",
    emergency: "إذا كانت لديك حالة طارئة، فتوجّه إلى أقرب قسم طوارئ.",
    reply: "يمكنك الردّ على هذه الرسالة إذا كان أي شيء غير واضح.",
  },
} as const;

/** The team's answer, quoting the patient's question back to them. */
export function answerEmail(locale: Locale, name: string, question: string, answer: string): Omit<Email, "to"> {
  const copy = ANSWER_COPY[locale];
  const lines = [copy.greeting(name), copy.intro];
  const notes = [copy.disclaimer, copy.emergency, copy.reply];
  return {
    subject: copy.subject,
    html: layout(locale, { paragraphs: lines, quote: { label: copy.quoteLabel, text: question }, answer, notes }),
    text: [...lines, "", `${copy.quoteLabel}:`, question, "", answer, "", ...notes].join("\n"),
  };
}
