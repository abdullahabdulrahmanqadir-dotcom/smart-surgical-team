import assert from "node:assert/strict";
import test from "node:test";

/**
 * MDT inquiry rules, tested against the functions themselves. The spam layers
 * (link limit, fill-time trap) and the alert email's privacy matter most.
 */
const {
  MDT_LIMITS,
  MDT_MIN_FILL_MS,
  countLinks,
  isTooFast,
  mdtDeleteAfter,
  mdtReplyMailto,
  teamAlertMissing,
  validateMdtInquiry,
} = await import("../app/lib/mdt-inquiries.ts");

const { mdtTeamAlertAddress, mdtTeamAlertEmail } = await import("../app/lib/mdt-inquiries-server.ts");
const { emailLayout, escapeHtml } = await import("../app/lib/inbox-server.ts");
const { isKnownCountry } = await import("../app/lib/countries.ts");

const VALID = {
  name: "Dr. Sara Karim",
  role: "surgeon",
  institution: "Erbil Teaching Hospital",
  country: "Iraq",
  email: "Sara.Karim@Example.ORG",
  phone: "",
  interest: "present_case",
  message: "We would like to present a difficult thyroid case at your next meeting.",
  noPatientData: true,
  consent: true,
};

test("a complete inquiry is accepted and normalised", () => {
  const result = validateMdtInquiry(VALID);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: "Dr. Sara Karim",
    role: "surgeon",
    institution: "Erbil Teaching Hospital",
    country: "Iraq",
    email: "Sara.Karim@example.org",
    phone: null,
    interest: "present_case",
    message: VALID.message,
  });
});

test("an optional phone is normalised to E.164, and a bad one is refused", () => {
  assert.equal(validateMdtInquiry({ ...VALID, phone: "0770 123 4567" }).value.phone, "+9647701234567");
  assert.equal(validateMdtInquiry({ ...VALID, phone: "+44 20 7946 0958" }).value.phone, "+442079460958");
  assert.deepEqual(validateMdtInquiry({ ...VALID, phone: "12345" }).errors, { phone: "invalid" });
});

test("every required field is reported when empty", () => {
  const result = validateMdtInquiry({});
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    "consent", "country", "email", "institution", "interest", "message", "name", "noPatientData", "role",
  ]);
});

test("fixed lists refuse values the form cannot produce", () => {
  assert.deepEqual(validateMdtInquiry({ ...VALID, role: "ceo" }).errors, { role: "invalid" });
  assert.deepEqual(validateMdtInquiry({ ...VALID, interest: "buy" }).errors, { interest: "invalid" });
  assert.deepEqual(validateMdtInquiry({ ...VALID, country: "Atlantis" }).errors, { country: "invalid" });
  assert.equal(isKnownCountry("Iraq"), true);
  assert.equal(isKnownCountry("iraq"), false);
});

test("the patient-data confirmation and the consent are both required, as real booleans", () => {
  assert.deepEqual(validateMdtInquiry({ ...VALID, noPatientData: "on" }).errors, { noPatientData: "required" });
  assert.deepEqual(validateMdtInquiry({ ...VALID, consent: false }).errors, { consent: "required" });
});

test("link spam is refused: at most two links in a message, none in the institution", () => {
  assert.equal(countLinks("see https://a.example and www.b.example and http://c.example"), 3);
  assert.equal(countLinks("no links here, just www-ish words"), 0);
  const twoLinks = `${VALID.message} https://a.example https://b.example`;
  assert.equal(validateMdtInquiry({ ...VALID, message: twoLinks }).ok, true);
  assert.deepEqual(validateMdtInquiry({ ...VALID, message: `${twoLinks} www.c.example` }).errors, { message: "tooManyLinks" });
  assert.deepEqual(validateMdtInquiry({ ...VALID, institution: "Best clinic https://spam.example" }).errors, { institution: "invalid" });
  assert.equal(MDT_LIMITS.linksMax, 2);
});

test("length limits match the database checks", () => {
  assert.deepEqual(validateMdtInquiry({ ...VALID, message: "too short" }).errors, { message: "tooShort" });
  assert.deepEqual(validateMdtInquiry({ ...VALID, message: "x".repeat(MDT_LIMITS.messageMax + 1) }).errors, { message: "tooLong" });
  assert.deepEqual(validateMdtInquiry({ ...VALID, institution: "X" }).errors, { institution: "tooShort" });
  assert.deepEqual(validateMdtInquiry({ ...VALID, name: "n".repeat(MDT_LIMITS.nameMax + 1) }).errors, { name: "tooLong" });
});

test("the fill-time trap catches fast or form-less submissions only", () => {
  assert.equal(isTooFast(undefined), true);
  assert.equal(isTooFast("5000"), true);
  assert.equal(isTooFast(Number.NaN), true);
  assert.equal(isTooFast(MDT_MIN_FILL_MS - 1), true);
  assert.equal(isTooFast(MDT_MIN_FILL_MS), false);
  assert.equal(isTooFast(90_000), false);
});

test("retention: 24 months normally, 30 days for spam", () => {
  const from = new Date("2026-11-22T10:00:00Z");
  assert.equal(mdtDeleteAfter("new", from).toISOString(), "2028-11-22T10:00:00.000Z");
  assert.equal(mdtDeleteAfter("contacted", from).toISOString(), "2028-11-22T10:00:00.000Z");
  assert.equal(mdtDeleteAfter("spam", from).toISOString(), "2026-12-22T10:00:00.000Z");
});

test("the team alert carries no sender details, only the link and the waiting count", () => {
  const email = mdtTeamAlertEmail("https://ssthyroid.com/en/admin", 4);
  assert.equal(email.subject, "New MDT inquiry — open Admin");
  assert.match(email.text, /4 MDT inquiries are now waiting/);
  assert.match(email.html, /href="https:\/\/ssthyroid\.com\/en\/admin"/);
  for (const secret of [VALID.name, VALID.institution, "Sara", "thyroid case"]) {
    assert.ok(!email.text.includes(secret) && !email.html.includes(secret), `alert leaks ${secret}`);
  }
  assert.doesNotMatch(mdtTeamAlertEmail("https://x.example/en/admin", 1).text, /waiting/);
});

test("the MDT alert address falls back to the patient-questions team address", () => {
  const saved = { mdt: process.env.MDT_TEAM_EMAIL, questions: process.env.QUESTIONS_TEAM_EMAIL };
  try {
    delete process.env.MDT_TEAM_EMAIL;
    process.env.QUESTIONS_TEAM_EMAIL = "team@example.org";
    assert.equal(mdtTeamAlertAddress(), "team@example.org");
    process.env.MDT_TEAM_EMAIL = " mdt@example.org ";
    assert.equal(mdtTeamAlertAddress(), "mdt@example.org");
  } finally {
    for (const [key, value] of [["MDT_TEAM_EMAIL", saved.mdt], ["QUESTIONS_TEAM_EMAIL", saved.questions]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("the shared email layout escapes what it is given", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  const html = emailLayout("ar", { paragraphs: ["<script>alert(1)</script>"] });
  assert.match(html, /dir="rtl"/);
  assert.doesNotMatch(html, /<script>/);
});

test("a missing team alert is flagged only after the two-minute grace period", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  assert.equal(teamAlertMissing("2026-11-22T11:00:05Z", "2026-11-22T11:00:00Z", now), false);
  assert.equal(teamAlertMissing(null, "2026-11-22T11:59:00Z", now), false);
  assert.equal(teamAlertMissing(null, "2026-11-22T11:57:00Z", now), true);
  assert.equal(teamAlertMissing(undefined, "2026-11-22T11:00:00Z", now), true);
});

test("the reply link opens the team's mail app in the sender's language", () => {
  const decode = (href) => {
    const url = new URL(href);
    return { to: decodeURIComponent(url.pathname), subject: url.searchParams.get("subject"), body: url.searchParams.get("body") };
  };
  const en = decode(mdtReplyMailto({ email: "sara@example.org", name: "Dr. Sara", locale: "en", status: "new" }, "https://ssthyroid.com"));
  assert.equal(en.to, "sara@example.org");
  assert.equal(en.subject, "Your MDT inquiry — Smart Surgical Team");
  assert.match(en.body, /^Dear Dr\. Sara,/);
  assert.doesNotMatch(en.body, /\/ask/);

  const ar = decode(mdtReplyMailto({ email: "a@example.org", name: "د. آرام", locale: "ar", status: "new" }, "https://ssthyroid.com"));
  assert.match(ar.subject, /الاجتماع متعدد التخصصات/);

  // A patient who used the wrong form is pointed to /ask in their language.
  const wrong = decode(mdtReplyMailto({ email: "p@example.org", name: "P", locale: "ar", status: "wrong_form" }, "https://ssthyroid.com"));
  assert.match(wrong.body, /https:\/\/ssthyroid\.com\/ar\/ask/);

  // Characters that would break a mailto (& ? #) stay inside their parameter.
  const tricky = decode(mdtReplyMailto({ email: "x@example.org", name: "A & B?#", locale: "en", status: "new" }, "https://x.example"));
  assert.match(tricky.body, /^Dear A & B\?#,/);
});
