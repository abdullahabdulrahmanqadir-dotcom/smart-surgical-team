/**
 * Patient questions — the rules shared by the /ask form, the public API route
 * and (in phase 2) the Admin inbox.
 *
 * Deliberately free of server, Supabase and Worker imports: the form uses it in
 * the browser to give the same answer the server will, and Node can import it
 * straight from the test runner. Plan: docs/patient-questions-plan.md.
 */

export const QUESTION_TOPICS = ["thyroid", "parathyroid", "breast", "other"] as const;
export type QuestionTopic = (typeof QUESTION_TOPICS)[number];

export const REPLY_CHANNELS = ["whatsapp", "email"] as const;
export type ReplyChannel = (typeof REPLY_CHANNELS)[number];

export const QUESTION_STATUSES = ["new", "answered", "closed", "spam"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/** Mirrors the check constraints in 0026_patient_questions.sql. */
export const QUESTION_LIMITS = {
  nameMax: 120,
  emailMax: 254,
  questionMin: 10,
  questionMax: 3000,
} as const;

/**
 * Numbers shown on /ask. Left null until the clinic confirms them (open
 * decisions 1 and 5 in the plan): the page leaves the line out rather than
 * show a number nobody has checked. Write them in E.164.
 */
export const ASK_CONTACT: { emergencyNumber: string | null; bookingPhone: string | null } = {
  emergencyNumber: null,
  bookingPhone: null,
};

/** Days the team promises before a reply; drives the "overdue" flag in Admin. */
export const REPLY_WITHIN_WORKING_DAYS = 3;

const RETENTION_MONTHS = 6;
const SPAM_RETENTION_DAYS = 30;
/** How long an email confirmation link stays valid. */
export const EMAIL_TOKEN_TTL_DAYS = 7;

// ---------------------------------------------------------------------------
// Input normalisation
// ---------------------------------------------------------------------------

/**
 * Arabic-Indic (٠–٩) and Extended Arabic-Indic / Persian (۰–۹) digits to
 * ASCII. Phones in Iraq and Kurdistan default to these keyboards, so a number
 * typed in Arabic or Kurdish must not be rejected as "not a number".
 */
export function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * Normalises a phone number to E.164, or returns null when it cannot be one.
 *
 * Iraqi local formats are the common case and are converted: `0770 123 4567`,
 * `770 123 4567`, `964770…`, `00964770…`. Any other country must be written
 * with its `+` or `00` prefix — guessing a country code would send a stranger
 * a patient's answer on WhatsApp.
 */
export function normalisePhone(raw: string): string | null {
  const compact = toAsciiDigits(raw).replace(/[\s\-().‎‏‪-‮]/g, "");
  if (!compact) return null;

  let digits: string;
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else if (/^07\d{9}$/.test(compact)) digits = `964${compact.slice(1)}`;
  else if (/^7\d{9}$/.test(compact)) digits = `964${compact}`;
  else if (/^9647\d{9}$/.test(compact)) digits = compact;
  else return null;

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  // An Iraqi number written with +964 still has to be a real mobile length;
  // a dropped digit would otherwise pass the generic E.164 length check.
  if (digits.startsWith("964") && !/^9647\d{9}$/.test(digits)) return null;
  return `+${digits}`;
}

/** Deliberately permissive: the confirm link is the real proof of an address. */
export function normaliseEmail(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > QUESTION_LIMITS.emailMax) return null;
  if (!/^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/.test(value)) return null;
  const at = value.lastIndexOf("@");
  return `${value.slice(0, at)}@${value.slice(at + 1).toLowerCase()}`;
}

/** Collapses runs of blank lines and strips control characters; keeps line breaks. */
export function cleanQuestionText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLine(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type QuestionField = "name" | "phone" | "email" | "replyVia" | "topic" | "question" | "consent";
export type QuestionFieldError = "required" | "invalid" | "tooShort" | "tooLong" | "emailNeeded";

export type QuestionInput = {
  name: string;
  phone: string;
  email: string | null;
  replyVia: ReplyChannel;
  topic: QuestionTopic | null;
  question: string;
};

export type QuestionValidation =
  | { ok: true; value: QuestionInput }
  | { ok: false; errors: Partial<Record<QuestionField, QuestionFieldError>> };

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * The one validator. The form runs it before sending so a patient sees the
 * same message the server would give; the server runs it again because the
 * form is not a security boundary.
 */
export function validateQuestion(raw: Record<string, unknown>): QuestionValidation {
  const errors: Partial<Record<QuestionField, QuestionFieldError>> = {};

  const name = cleanLine(str(raw.name));
  if (!name) errors.name = "required";
  else if (name.length > QUESTION_LIMITS.nameMax) errors.name = "tooLong";

  const phoneRaw = str(raw.phone).trim();
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null;
  if (!phoneRaw) errors.phone = "required";
  else if (!phone) errors.phone = "invalid";

  const replyVia = (REPLY_CHANNELS as readonly string[]).includes(str(raw.replyVia)) ? str(raw.replyVia) as ReplyChannel : null;
  if (!replyVia) errors.replyVia = "required";

  const emailRaw = str(raw.email).trim();
  const email = emailRaw ? normaliseEmail(emailRaw) : null;
  if (emailRaw && !email) errors.email = "invalid";
  else if (!emailRaw && replyVia === "email") errors.email = "emailNeeded";

  const topicRaw = str(raw.topic);
  const topic = (QUESTION_TOPICS as readonly string[]).includes(topicRaw) ? topicRaw as QuestionTopic : null;
  if (topicRaw && !topic) errors.topic = "invalid";

  const question = cleanQuestionText(str(raw.question));
  if (!question) errors.question = "required";
  else if (question.length < QUESTION_LIMITS.questionMin) errors.question = "tooShort";
  else if (question.length > QUESTION_LIMITS.questionMax) errors.question = "tooLong";

  if (raw.consent !== true) errors.consent = "required";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, phone: phone!, email, replyVia: replyVia!, topic, question } };
}

// ---------------------------------------------------------------------------
// Workflow helpers (used by Admin in phase 2)
// ---------------------------------------------------------------------------

function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** When a row may be deleted, given what just happened to it. */
export function deleteAfter(status: QuestionStatus, from: Date = new Date()): Date {
  if (status === "spam") return new Date(from.getTime() + SPAM_RETENTION_DAYS * 86_400_000);
  return addMonths(from, RETENTION_MONTHS);
}

/**
 * Working days elapsed, Saturday to Thursday — the clinic's week. Friday is
 * the only day that does not count.
 */
export function workingDaysSince(start: Date, now: Date = new Date()): number {
  let days = 0;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  while (cursor.getTime() < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor.getUTCDay() !== 5) days += 1;
  }
  return days;
}

export function isOverdue(status: QuestionStatus, createdAt: Date, now: Date = new Date()): boolean {
  return status === "new" && workingDaysSince(createdAt, now) > REPLY_WITHIN_WORKING_DAYS;
}

/** A wa.me link that opens a chat with the patient, optionally pre-filled. */
export function whatsappLink(e164: string, text?: string): string {
  const base = `https://wa.me/${e164.replace(/^\+/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
