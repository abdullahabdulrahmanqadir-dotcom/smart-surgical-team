/**
 * The registration details the site keeps for every member.
 *
 * Google hands back a name and an email address and nothing else, so the same
 * list drives two things: which fields the email wizard asks for, and which
 * fields a Google member is still missing when they land on /complete-profile.
 */

export const LEGAL_VERSION = "2026-08-13";

/** Written by both sign-up routes, read back to decide whether an account is finished. */
export const ACCOUNT_DETAIL_FIELDS = ["first_name", "last_name", "organisation", "job_title", "city", "country"] as const;

export type AccountDetailField = (typeof ACCOUNT_DETAIL_FIELDS)[number];
export type AccountDetails = Record<AccountDetailField, string>;

export const EMPTY_ACCOUNT_DETAILS: AccountDetails = { first_name: "", last_name: "", organisation: "", job_title: "", city: "", country: "" };

type Metadata = Record<string, unknown> | null | undefined;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads the details out of `user_metadata`, falling back to what an OAuth
 * provider supplied under its own key names so a Google member never retypes a
 * name Google already gave us.
 */
export function readAccountDetails(metadata: Metadata): AccountDetails {
  const meta = metadata ?? {};
  const fullName = text(meta.full_name) || text(meta.name);
  const [firstFromFullName = "", ...restOfFullName] = fullName.split(/\s+/).filter(Boolean);

  return {
    first_name: text(meta.first_name) || text(meta.given_name) || firstFromFullName,
    last_name: text(meta.last_name) || text(meta.family_name) || restOfFullName.join(" "),
    organisation: text(meta.organisation),
    job_title: text(meta.job_title),
    city: text(meta.city),
    country: text(meta.country),
  };
}

/** The fields still to be filled in, in the order the form shows them. */
export function missingAccountDetails(metadata: Metadata): AccountDetailField[] {
  const details = readAccountDetails(metadata);
  return ACCOUNT_DETAIL_FIELDS.filter((field) => !details[field]);
}

export function isAccountComplete(metadata: Metadata): boolean {
  return missingAccountDetails(metadata).length === 0 && Boolean(text((metadata ?? {}).legal_accepted_at));
}

/** The `user_metadata` patch both sign-up routes write. */
export function accountMetadataPatch(details: AccountDetails, options: { acceptLegal: boolean }): Record<string, string> {
  const trimmed = Object.fromEntries(ACCOUNT_DETAIL_FIELDS.map((field) => [field, details[field].trim()])) as AccountDetails;
  return {
    ...trimmed,
    full_name: `${trimmed.first_name} ${trimmed.last_name}`.trim(),
    ...(options.acceptLegal ? { legal_accepted_at: new Date().toISOString(), legal_version: LEGAL_VERSION } : {}),
  };
}
