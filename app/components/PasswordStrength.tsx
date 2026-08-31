"use client";

import { PASSWORD_RULES, assessPassword, passwordStrengthBand, type PasswordRuleId } from "../lib/password-strength";
import type { Dictionary } from "../lib/dictionaries";

/**
 * The strength meter shown under any field where a password is being chosen. It
 * appears only once there is something to judge, so an untouched form is not
 * already telling the member they have done it wrong.
 *
 * Only the length row is a requirement. The other three are marked
 * `is-optional` and phrased as what would make the password stronger — a plain
 * eight-character password is accepted, and the meter must not imply otherwise.
 */
export default function PasswordStrength({ value, t }: { value: string; t: Dictionary["password"] }) {
  if (!value) return null;

  const assessment = assessPassword(value);
  const band = passwordStrengthBand(assessment);
  const ruleLabel: Record<PasswordRuleId, string> = { length: t.ruleLength, letter: t.ruleLetter, number: t.ruleNumber, symbol: t.ruleSymbol };
  const bandLabel: Record<typeof band, string> = { weak: t.weak, fair: t.fair, good: t.good, strong: t.strong };

  return (
    <div className={`password-strength is-${band}`}>
      <div className="password-strength-meter" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => <i key={step} className={step <= assessment.score ? "is-on" : ""} />)}
      </div>
      <p role="status">{t.strengthLabel} <b>{bandLabel[band]}</b></p>
      <ul>
        {PASSWORD_RULES.map((rule) => (
          <li
            key={rule.id}
            className={[assessment.passed.includes(rule.id) ? "is-met" : "", rule.id === "length" ? "" : "is-optional"].filter(Boolean).join(" ")}
          >
            <span aria-hidden="true">{assessment.passed.includes(rule.id) ? "✓" : "•"}</span>
            {ruleLabel[rule.id]}
          </li>
        ))}
      </ul>
      <small>{t.ruleHint}</small>
    </div>
  );
}
