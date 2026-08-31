/**
 * Password rules for every place the site sets a password: registration and
 * the recovery form.
 *
 * Sign-in deliberately does not use these. Members who registered under the
 * old eight-character rule still have valid passwords, and gating the sign-in
 * field on the new minimum would lock them out of their own accounts. The new
 * rules only ever apply where a password is being chosen.
 *
 * Supabase enforces its own minimum and its leaked-password check server side;
 * this module is the fast, local half so the member sees the problem while they
 * type rather than after a round trip.
 */

export const PASSWORD_MIN_LENGTH = 10;

export type PasswordRuleId = "length" | "letter" | "number" | "symbol";

/** The four rules, in the order the checklist shows them. */
export const PASSWORD_RULES: readonly { id: PasswordRuleId; test: (value: string) => boolean }[] = [
  { id: "length", test: (value) => value.length >= PASSWORD_MIN_LENGTH },
  { id: "letter", test: (value) => /\p{L}/u.test(value) },
  { id: "number", test: (value) => /\d/.test(value) },
  { id: "symbol", test: (value) => /[^\p{L}\d]/u.test(value) },
];

/** A password has to satisfy this many of the four rules, length included. */
const REQUIRED_RULES = 3;

export type PasswordAssessment = {
  passed: PasswordRuleId[];
  /** 0–4: how many rules hold, used only to size and colour the meter. */
  score: number;
  /** Whether the password may be submitted at all. */
  acceptable: boolean;
};

export function assessPassword(value: string): PasswordAssessment {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).map((rule) => rule.id);
  // Length is never optional — a short password full of symbols is still short.
  const acceptable = passed.includes("length") && passed.length >= REQUIRED_RULES;
  return { passed, score: passed.length, acceptable };
}

/** The meter's four bands, matched by the `is-*` classes in globals.css. */
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
