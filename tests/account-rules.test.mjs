import assert from "node:assert/strict";
import test from "node:test";

/**
 * The registration rules, tested against the functions themselves.
 *
 * `app/lib/account.ts` and `app/lib/auth-redirect.ts` are plain modules with no
 * server or Supabase imports, so Node can load them directly and strip the
 * types. Between them they decide two things that are otherwise only observable
 * by actually registering: whether a Google account still owes us details, and
 * whether a failed OAuth round trip was the one-email-one-method refusal or
 * something else. Neither is worth discovering in production.
 */
const {
  ACCOUNT_DETAIL_FIELDS,
  accountMetadataPatch,
  isAccountComplete,
  missingAccountDetails,
  readAccountDetails,
} = await import("../app/lib/account.ts");

const { isSignInMethodConflict, readAuthRedirectError } = await import("../app/lib/auth-redirect.ts");

/** What Google actually hands back: a name, an email address, and nothing else. */
const GOOGLE_METADATA = {
  email: "surgeon@example.com",
  email_verified: true,
  full_name: "Yadgar Ahmed",
  given_name: "Yadgar",
  family_name: "Ahmed",
  name: "Yadgar Ahmed",
  picture: "https://lh3.googleusercontent.com/a/example",
  sub: "104857392017465",
};

/** What the four-step email wizard writes. */
const WIZARD_METADATA = {
  first_name: "Yadgar",
  last_name: "Ahmed",
  full_name: "Yadgar Ahmed",
  organisation: "Smart Health Tower",
  job_title: "Head & neck surgeon",
  city: "Sulaymaniyah",
  country: "Iraq",
  legal_accepted_at: "2026-08-30T09:00:00.000Z",
  legal_version: "2026-08-13",
};

test("a Google account arrives owing exactly the details Google does not supply", () => {
  assert.deepEqual(missingAccountDetails(GOOGLE_METADATA), ["organisation", "job_title", "city", "country"]);
  assert.equal(isAccountComplete(GOOGLE_METADATA), false);
});

test("the name Google supplied is never asked for again", () => {
  const details = readAccountDetails(GOOGLE_METADATA);
  assert.equal(details.first_name, "Yadgar");
  assert.equal(details.last_name, "Ahmed");
});

test("a provider that sends only a display name still fills both name fields", () => {
  const details = readAccountDetails({ full_name: "Aso Karim Hassan" });
  assert.equal(details.first_name, "Aso");
  assert.equal(details.last_name, "Karim Hassan");
});

test("an account registered through the wizard is complete on arrival", () => {
  assert.deepEqual(missingAccountDetails(WIZARD_METADATA), []);
  assert.equal(isAccountComplete(WIZARD_METADATA), true);
});

test("details without recorded consent are not a complete account", () => {
  const { legal_accepted_at: _omitted, ...withoutConsent } = WIZARD_METADATA;
  assert.deepEqual(missingAccountDetails(withoutConsent), []);
  assert.equal(isAccountComplete(withoutConsent), false);
});

test("whitespace is not a filled-in field", () => {
  assert.deepEqual(missingAccountDetails({ ...WIZARD_METADATA, organisation: "   " }), ["organisation"]);
});

test("a missing metadata object is treated as an empty one, not a crash", () => {
  assert.deepEqual(missingAccountDetails(null), [...ACCOUNT_DETAIL_FIELDS]);
  assert.equal(isAccountComplete(undefined), false);
});

test("the saved patch trims every field and derives the full name", () => {
  const patch = accountMetadataPatch({
    first_name: " Yadgar ", last_name: " Ahmed ", organisation: " Smart Health Tower ",
    job_title: " Head & neck surgeon ", city: " Sulaymaniyah ", country: " Iraq ",
  }, { acceptLegal: true });

  assert.equal(patch.full_name, "Yadgar Ahmed");
  assert.equal(patch.organisation, "Smart Health Tower");
  assert.equal(patch.legal_version, "2026-08-13");
  assert.ok(Date.parse(patch.legal_accepted_at) > 0);
  // Round-tripping the patch has to satisfy the same check the profile reads.
  assert.equal(isAccountComplete(patch), true);
});

test("consent already on file is not re-stamped", () => {
  const patch = accountMetadataPatch(readAccountDetails(WIZARD_METADATA), { acceptLegal: false });
  assert.equal("legal_accepted_at" in patch, false);
  assert.equal("legal_version" in patch, false);
});

test("an OAuth refusal is read out of the hash, where the implicit flow puts it", () => {
  const message = readAuthRedirectError("https://ssthyroid.com/en/complete-profile#error=server_error&error_description=Database+error+saving+new+user");
  assert.equal(message, "Database error saving new user");
  assert.equal(isSignInMethodConflict(message), true);
});

test("an OAuth refusal is read out of the query string, where the PKCE flow puts it", () => {
  const message = readAuthRedirectError("https://ssthyroid.com/en/complete-profile?error=server_error&error_description=sst_identity_conflict%3A%20this%20email%20address%20already%20signs%20in%20with%20email");
  assert.match(message, /sst_identity_conflict/);
  assert.equal(isSignInMethodConflict(message), true);
});

test("a clean return from Google reports no error", () => {
  assert.equal(readAuthRedirectError("https://ssthyroid.com/en/complete-profile#access_token=abc&token_type=bearer"), null);
  assert.equal(readAuthRedirectError("https://ssthyroid.com/en/complete-profile"), null);
});

test("an unrelated OAuth failure is not blamed on the sign-in method", () => {
  const message = readAuthRedirectError("https://ssthyroid.com/en/complete-profile#error=access_denied&error_description=The+user+cancelled+the+request");
  assert.equal(message, "The user cancelled the request");
  assert.equal(isSignInMethodConflict(message), false);
});
