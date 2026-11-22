/**
 * MDT inquiries — the rules shared by the /mdt form, the public API route and
 * (in phase 2) the Admin inbox.
 *
 * Like patient-questions.ts it has no server, Supabase or Worker imports, so
 * the form runs the same validator in the browser and Node can test it
 * directly. Spec: docs/superpowers/specs/2026-11-22-mdt-front-door-design.md.
 */
import { isKnownCountry } from "./countries";
import { cleanQuestionText, normaliseEmail, normalisePhone } from "./patient-questions";

export const MDT_ROLES = [
  "surgeon",
  "endocrinologist",
  "oncologist",
  "radiologist",
  "pathologist",
  "nuclear_medicine",
  "other_doctor",
  "institution",
  "other",
] as const;
export type MdtRole = (typeof MDT_ROLES)[number];

export const MDT_INTERESTS = ["present_case", "attend", "observe", "collaborate", "other"] as const;
export type MdtInterest = (typeof MDT_INTERESTS)[number];

export const MDT_STATUSES = ["new", "contacted", "closed", "spam", "wrong_form"] as const;
export type MdtStatus = (typeof MDT_STATUSES)[number];

/** Mirrors the check constraints in 0027_mdt_inquiries.sql. */
export const MDT_LIMITS = {
  nameMax: 120,
  institutionMin: 2,
  institutionMax: 200,
  emailMax: 254,
  messageMin: 10,
  messageMax: 2000,
  /** More links than this in one message is how link spam looks. */
  linksMax: 2,
  noteMax: 2000,
} as const;

/**
 * A real person needs far longer than this to fill in the form. Anything
 * faster (or a post that never loaded the form) is treated like a honeypot
 * hit: told it worked, nothing stored.
 */
export const MDT_MIN_FILL_MS = 3000;

/** Proposed retention, awaiting the team's decision (spec, open item 6). */
const RETENTION_MONTHS = 24;
const SPAM_RETENTION_DAYS = 30;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanLine(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

/** Counts web links: http(s)://… and bare www.… */
export function countLinks(text: string): number {
  return (text.match(/\bhttps?:\/\/|\bwww\./gi) ?? []).length;
}

/** True when the submission came too fast, or not from the form at all. */
export function isTooFast(elapsedMs: unknown): boolean {
  return typeof elapsedMs !== "number" || !Number.isFinite(elapsedMs) || elapsedMs < MDT_MIN_FILL_MS;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type MdtField =
  | "name" | "role" | "institution" | "country" | "email" | "phone" | "interest" | "message" | "noPatientData" | "consent";
export type MdtFieldError = "required" | "invalid" | "tooShort" | "tooLong" | "tooManyLinks";

export type MdtInput = {
  name: string;
  role: MdtRole;
  institution: string;
  country: string;
  email: string;
  phone: string | null;
  interest: MdtInterest;
  message: string;
};

export type MdtValidation =
  | { ok: true; value: MdtInput }
  | { ok: false; errors: Partial<Record<MdtField, MdtFieldError>> };

function oneOf<T extends string>(list: readonly T[], value: string): T | null {
  return (list as readonly string[]).includes(value) ? value as T : null;
}

/** The one validator, run by the form first and by the server again. */
export function validateMdtInquiry(raw: Record<string, unknown>): MdtValidation {
  const errors: Partial<Record<MdtField, MdtFieldError>> = {};

  const name = cleanLine(str(raw.name));
  if (!name) errors.name = "required";
  else if (name.length > MDT_LIMITS.nameMax) errors.name = "tooLong";

  const roleRaw = str(raw.role);
  const role = oneOf(MDT_ROLES, roleRaw);
  if (!roleRaw) errors.role = "required";
  else if (!role) errors.role = "invalid";

  const institution = cleanLine(str(raw.institution));
  if (!institution) errors.institution = "required";
  else if (institution.length < MDT_LIMITS.institutionMin) errors.institution = "tooShort";
  else if (institution.length > MDT_LIMITS.institutionMax) errors.institution = "tooLong";
  else if (countLinks(institution) > 0) errors.institution = "invalid";

  const country = cleanLine(str(raw.country));
  if (!country) errors.country = "required";
  else if (!isKnownCountry(country)) errors.country = "invalid";

  const emailRaw = str(raw.email).trim();
  const email = emailRaw ? normaliseEmail(emailRaw) : null;
  if (!emailRaw) errors.email = "required";
  else if (!email) errors.email = "invalid";

  const phoneRaw = str(raw.phone).trim();
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null;
  if (phoneRaw && !phone) errors.phone = "invalid";

  const interestRaw = str(raw.interest);
  const interest = oneOf(MDT_INTERESTS, interestRaw);
  if (!interestRaw) errors.interest = "required";
  else if (!interest) errors.interest = "invalid";

  const message = cleanQuestionText(str(raw.message));
  if (!message) errors.message = "required";
  else if (message.length < MDT_LIMITS.messageMin) errors.message = "tooShort";
  else if (message.length > MDT_LIMITS.messageMax) errors.message = "tooLong";
  else if (countLinks(message) > MDT_LIMITS.linksMax) errors.message = "tooManyLinks";

  if (raw.noPatientData !== true) errors.noPatientData = "required";
  if (raw.consent !== true) errors.consent = "required";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, role: role!, institution, country, email: email!, phone, interest: interest!, message },
  };
}

// ---------------------------------------------------------------------------
// Workflow helpers (used by Admin in phase 2)
// ---------------------------------------------------------------------------

/** When a row may be deleted, given what just happened to it. */
export function mdtDeleteAfter(status: MdtStatus, from: Date = new Date()): Date {
  if (status === "spam") return new Date(from.getTime() + SPAM_RETENTION_DAYS * 86_400_000);
  const result = new Date(from);
  result.setUTCMonth(result.getUTCMonth() + RETENTION_MONTHS);
  return result;
}

// ---------------------------------------------------------------------------
// What /mdt says about the meeting
// ---------------------------------------------------------------------------

export const MDT_SPECIALTIES = [
  "endocrineSurgery", "breastSurgery", "headNeckSurgery", "endocrinology",
  "radiology", "pathology", "oncology", "nuclearMedicine",
] as const;
export type MdtSpecialty = (typeof MDT_SPECIALTIES)[number];

export const MDT_CASE_AREAS = ["thyroid", "parathyroid", "breast", "headNeck"] as const;
export type MdtCaseArea = (typeof MDT_CASE_AREAS)[number];

/**
 * DRAFT — every list here must be confirmed by the team before launch
 * (spec, open items 1–4). `schedule` stays null until they give it: the page
 * then says the details are shared on reply rather than show an unchecked
 * day or time.
 */
export const MDT_FACTS: {
  specialties: readonly MdtSpecialty[];
  caseAreas: readonly MdtCaseArea[];
  schedule: { en: string; ar: string } | null;
} = {
  specialties: MDT_SPECIALTIES,
  caseAreas: MDT_CASE_AREAS,
  schedule: null,
};

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

/**
 * The alert is sent right after the row is saved, in the same request, so a
 * row only counts as "alert failed" once it is older than this.
 */
const ALERT_GRACE_MS = 2 * 60_000;

/** True when the team alert for a submission never reached Resend. */
export function teamAlertMissing(teamAlertedAt: string | null | undefined, createdAt: string, now: Date = new Date()): boolean {
  if (teamAlertedAt) return false;
  return now.getTime() - new Date(createdAt).getTime() > ALERT_GRACE_MS;
}

const REPLY_COPY = {
  en: {
    subject: "Your MDT inquiry — Smart Surgical Team",
    greeting: (name: string) => `Dear ${name},`,
    body: "Thank you for your interest in our multidisciplinary team meeting.",
    wrongForm: (link: string) => `Thank you for your message. Our MDT page is for doctors and institutes. For a question about your own health, please use our patient form instead: ${link}`,
    signOff: "Kind regards,\nSmart Surgical Team",
  },
  ar: {
    subject: "استفسارك عن الاجتماع متعدد التخصصات — Smart Surgical Team",
    greeting: (name: string) => `${name} المحترم/ة،`,
    body: "شكراً لاهتمامك باجتماع فريقنا متعدد التخصصات.",
    wrongForm: (link: string) => `شكراً لرسالتك. صفحة الاجتماع متعدد التخصصات مخصّصة للأطباء والمؤسسات. لطرح سؤال عن صحتك، يرجى استخدام نموذج المرضى: ${link}`,
    signOff: "مع التحية،\nSmart Surgical Team",
  },
} as const;

/**
 * A mailto: link that opens the team's own mail app with the subject and a
 * greeting filled in, in the language the inquiry was sent in. A patient who
 * used the wrong form gets a reply pointing to /ask instead.
 */
export function mdtReplyMailto(
  row: { email: string; name: string; locale: "en" | "ar"; status: MdtStatus },
  origin: string,
): string {
  const copy = REPLY_COPY[row.locale];
  const middle = row.status === "wrong_form" ? copy.wrongForm(`${origin}/${row.locale}/ask`) : copy.body;
  const body = [copy.greeting(row.name), "", middle, "", "", copy.signOff].join("\n");
  return `mailto:${encodeURIComponent(row.email).replace(/%40/g, "@")}?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(body)}`;
}
