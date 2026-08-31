/**
 * Password rules for every place the site sets a password: registration and
 * the recovery form.
 *
 * **Length is the only requirement.** Eight characters and a password is
 * accepted, whatever it is made of. The letter/number/symbol checks below are
 * kept only to drive the strength meter, so a member can see that a longer or
 * more varied password is stronger without being refused for choosing a plain
 * one. Anything that blocks a submit has to be `length`.
 *
 * Sign-in deliberately does not use these at all: it never re-judges a password
 * a member already has.
 *
 * Supabase enforces the same minimum server side (Authentication → Providers →
 * Email). Keep the two numbers equal — a site minimum below Supabase's would
 * let the meter accept a password the round trip then rejects, with an error
 * the member cannot act on.
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = "length" | "letter" | "number" | "symbol";

/**
 * The four checks, in the order the meter lists them. Only `length` decides
 * whether a password may be submitted; the other three colour the meter.
 */
export const PASSWORD_RULES: readonly { id: PasswordRuleId; test: (value: string) => boolean }[] = [
  { id: "length", test: (value) => value.length >= PASSWORD_MIN_LENGTH },
  { id: "letter", test: (value) => /\p{L}/u.test(value) },
  { id: "number", test: (value) => /\d/.test(value) },
  { id: "symbol", test: (value) => /[^\p{L}\d]/u.test(value) },
];

export type PasswordAssessment = {
  passed: PasswordRuleId[];
  /** 0–4: how many checks hold, used only to size and colour the meter. */
  score: number;
  /** Whether the password may be submitted at all. */
  acceptable: boolean;
};

export function assessPassword(value: string): PasswordAssessment {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).map((rule) => rule.id);
  // Length is the whole of it. A varied password is stronger, never required.
  const acceptable = passed.includes("length");
  return { passed, score: passed.length, acceptable };
}

/**
 * The meter's four bands, matched by the `is-*` classes in globals.css.
 *
 * Only "weak" means refused — it is reserved for a password that is too short.
 * "fair" is an accepted password that could be stronger.
 */
export function passwordStrengthBand(assessment: PasswordAssessment): "weak" | "fair" | "good" | "strong" {
  if (!assessment.passed.includes("length")) return "weak";
  if (assessment.score >= 4) return "strong";
  if (assessment.score === 3) return "good";
  return "fair";
}

/**
 * Supabase phrases its own password failures in English regardless of locale,
 * so the leaked-password rejection is matched here and re-shown in the
 * member's language.
 */
export function isLeakedPasswordError(message: string): boolean {
  return /known to be weak|easy to guess|pwned|data breach|leaked/i.test(message);
}
