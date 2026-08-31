"use client";

import { IconUser } from "./icons";
import { ACCOUNT_DETAIL_FIELDS, type AccountDetailField, type AccountDetails } from "../lib/account";
import { countryOptions } from "../lib/countries";
import type { Dictionary } from "../lib/dictionaries";

/**
 * The six practice details, rendered identically wherever they are collected:
 * registration step 2, the Google complete-profile page and the profile editor.
 *
 * Two things it is careful about.
 *
 * Autofill. Browsers and password managers key off the `name` attribute at
 * least as much as `autocomplete`, and these fields previously carried only an
 * `id`, so a saved contact card was never offered. Every control now has both,
 * with the standard token for its meaning.
 *
 * Country. A dropdown rather than free text, so the data is consistent, with
 * Iraq preselected by the callers because that is where nearly every member
 * practises. An older, hand-typed value survives as its own option instead of
 * being silently discarded — see app/lib/countries.ts.
 */

const FIELD_LAYOUT: Record<AccountDetailField, { span: boolean; autoComplete: string; name: string }> = {
  first_name: { span: false, autoComplete: "given-name", name: "given-name" },
  last_name: { span: false, autoComplete: "family-name", name: "family-name" },
  organisation: { span: true, autoComplete: "organization", name: "organization" },
  job_title: { span: true, autoComplete: "organization-title", name: "organization-title" },
  city: { span: false, autoComplete: "address-level2", name: "address-level2" },
  country: { span: false, autoComplete: "country-name", name: "country-name" },
};

export default function AccountDetailFields({
  idPrefix,
  locale,
  details,
  onChange,
  t,
  showRequiredMark = true,
  autoFocusFirst = false,
}: {
  idPrefix: string;
  locale: string;
  details: AccountDetails;
  onChange: (field: AccountDetailField, value: string) => void;
  t: Dictionary["signUp"];
  showRequiredMark?: boolean;
  autoFocusFirst?: boolean;
}) {
  const label: Record<AccountDetailField, string> = {
    first_name: t.firstName, last_name: t.lastName, organisation: t.organisation,
    job_title: t.jobTitle, city: t.city, country: t.country,
  };
  const placeholder: Partial<Record<AccountDetailField, string>> = { organisation: t.organisationPlaceholder, job_title: t.jobPlaceholder };
  const countries = countryOptions(locale, details.country);

  return ACCOUNT_DETAIL_FIELDS.map((field, index) => {
    const { span, autoComplete, name } = FIELD_LAYOUT[field];
    const id = `${idPrefix}-${field}`;
    return (
      <div className={span ? "form-field field-span-2" : "form-field"} key={field}>
        <label htmlFor={id}>{label[field]}{showRequiredMark && <> <span aria-hidden="true">*</span></>}</label>
        <div className={field === "country" ? "field-control is-select" : "field-control"}>
          {field === "first_name" && <IconUser size={18} />}
          {field === "country" ? (
            <select id={id} name={name} autoComplete={autoComplete} value={details.country} onChange={(event) => onChange(field, event.target.value)} required>
              {countries.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input
              id={id}
              name={name}
              autoComplete={autoComplete}
              placeholder={placeholder[field]}
              value={details[field]}
              onChange={(event) => onChange(field, event.target.value)}
              autoFocus={autoFocusFirst && index === 0}
              required
            />
          )}
        </div>
      </div>
    );
  });
}
