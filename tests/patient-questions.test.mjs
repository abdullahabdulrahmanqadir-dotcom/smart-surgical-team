import assert from "node:assert/strict";
import test from "node:test";

/**
 * Patient-question rules, tested against the functions themselves.
 *
 * `app/lib/patient-questions.ts` has no imports, and the server helpers only
 * use Web Crypto and `fetch`, so Node loads both directly. The phone rules
 * matter most: a wrong normalisation sends a patient's answer to a stranger.
 */
const {
  QUESTION_LIMITS,
  deleteAfter,
  isOverdue,
  normaliseEmail,
  normalisePhone,
  toAsciiDigits,
  validateQuestion,
  whatsappLink,
  workingDaysSince,
} = await import("../app/lib/patient-questions.ts");

const { confirmEmail, createEmailToken, hashIp, isWellFormedToken, sha256Hex, teamAlertEmail, verifyTurnstile } =
  await import("../app/lib/patient-questions-server.ts");

const VALID = {
  name: "Shilan Ahmed",
  phone: "0770 123 4567",
  email: "",
  replyVia: "whatsapp",
  topic: "thyroid",
  question: "Is it normal to feel tired three weeks after thyroid surgery?",
  consent: true,
};

test("Iraqi local formats normalise to one E.164 number", () => {
  for (const input of ["07701234567", "0770 123 4567", "0770-123-4567", "(0770) 123 4567", "7701234567", "9647701234567", "+964 770 123 4567", "00964 770 123 4567"]) {
    assert.equal(normalisePhone(input), "+9647701234567", input);
  }
});

test("phones typed on Arabic and Kurdish keyboards are accepted", () => {
  assert.equal(toAsciiDigits("٠٧٧٠١٢٣٤٥٦٧"), "07701234567");
  assert.equal(normalisePhone("٠٧٧٠ ١٢٣ ٤٥٦٧"), "+9647701234567");
  assert.equal(normalisePhone("۰۷۵۰۱۲۳۴۵۶۷"), "+9647501234567");
  // Direction marks pasted from RTL text must not break the number.
  assert.equal(normalisePhone("‏0770 123 4567‎"), "+9647701234567");
});

test("foreign numbers need their own country code; nothing is guessed", () => {
  assert.equal(normalisePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalisePhone("0044 7700 900123"), "+447700900123");
  // Bare digits that are not an Iraqi pattern are refused, not prefixed.
  assert.equal(normalisePhone("447700900123"), null);
  assert.equal(normalisePhone("15551234567"), null);
});

test("malformed and truncated numbers are refused", () => {
  for (const input of ["", "abc", "0770123", "077012345678", "+964770123456", "+9641234567890", "+0123456789", "12345"]) {
    assert.equal(normalisePhone(input), null, input);
  }
});

test("email addresses are checked loosely and the domain is lower-cased", () => {
  assert.equal(normaliseEmail("  Shilan.Ahmed@Example.COM "), "Shilan.Ahmed@example.com");
  for (const input of ["", "no-at-sign", "a@b", "a b@example.com", "<a>@example.com", `${"a".repeat(250)}@example.com`]) {
    assert.equal(normaliseEmail(input), null, input);
  }
});

test("a complete question validates and comes back cleaned", () => {
  const result = validateQuestion({ ...VALID, name: "  Shilan   Ahmed ", question: `  ${VALID.question}\n\n\n\nThanks  ` });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: "Shilan Ahmed",
    phone: "+9647701234567",
    email: null,
    replyVia: "whatsapp",
    topic: "thyroid",
    question: `${VALID.question}\n\nThanks`,
  });
});

test("each field reports its own problem", () => {
  const result = validateQuestion({ name: "", phone: "123", email: "bad", replyVia: "fax", topic: "knee", question: "short", consent: false });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, { name: "required", phone: "invalid", email: "invalid", replyVia: "required", topic: "invalid", question: "tooShort", consent: "required" });
});

test("replying by email needs an email address", () => {
  const result = validateQuestion({ ...VALID, replyVia: "email", email: "" });
  assert.equal(result.ok, false);
  assert.equal(result.errors.email, "emailNeeded");
  assert.equal(validateQuestion({ ...VALID, replyVia: "email", email: "p@example.com" }).ok, true);
});

test("consent must be a real true, not a truthy string", () => {
  assert.equal(validateQuestion({ ...VALID, consent: "true" }).ok, false);
  assert.equal(validateQuestion({ ...VALID, consent: "on" }).ok, false);
});

test("topic is optional; question length is bounded", () => {
  assert.equal(validateQuestion({ ...VALID, topic: "" }).ok, true);
  const long = validateQuestion({ ...VALID, question: "a".repeat(QUESTION_LIMITS.questionMax + 1) });
  assert.equal(long.errors.question, "tooLong");
});

test("retention: six months normally, thirty days for spam", () => {
  const from = new Date("2026-01-31T10:00:00Z");
  assert.equal(deleteAfter("answered", from).toISOString(), "2026-07-31T10:00:00.000Z");
  assert.equal(deleteAfter("spam", from).toISOString(), "2026-03-02T10:00:00.000Z");
});

test("overdue counts Saturday to Thursday and skips Friday", () => {
  // Wednesday 2026-11-18 → Monday 2026-11-23 is 5 calendar days, one of them a Friday.
  assert.equal(workingDaysSince(new Date("2026-11-18T09:00:00Z"), new Date("2026-11-23T09:00:00Z")), 4);
  assert.equal(isOverdue("new", new Date("2026-11-18T09:00:00Z"), new Date("2026-11-23T09:00:00Z")), true);
  assert.equal(isOverdue("new", new Date("2026-11-18T09:00:00Z"), new Date("2026-11-21T09:00:00Z")), false);
  assert.equal(isOverdue("answered", new Date("2026-01-01T09:00:00Z"), new Date("2026-11-23T09:00:00Z")), false);
});

test("WhatsApp links drop the plus and encode the message", () => {
  assert.equal(whatsappLink("+9647701234567"), "https://wa.me/9647701234567");
  assert.equal(whatsappLink("+9647701234567", "Hello & welcome"), "https://wa.me/9647701234567?text=Hello%20%26%20welcome");
});

test("confirmation tokens are 256-bit, URL-safe and stored only as a hash", async () => {
  const now = new Date("2026-11-21T00:00:00Z");
  const { token, hash, expiresAt } = await createEmailToken(now);
  assert.equal(isWellFormedToken(token), true);
  assert.notEqual(hash, token);
  assert.equal(hash, await sha256Hex(token));
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(expiresAt.toISOString(), "2026-11-28T00:00:00.000Z");
  assert.notEqual((await createEmailToken(now)).token, token);
  assert.equal(isWellFormedToken("short"), false);
  assert.equal(isWellFormedToken(`${token.slice(0, 42)}!`), false);
});

test("IP hashing needs the secret, and is keyed when it has one", async () => {
  const previous = process.env.QUESTIONS_IP_SECRET;
  try {
    delete process.env.QUESTIONS_IP_SECRET;
    assert.equal(await hashIp("203.0.113.7"), null);
    process.env.QUESTIONS_IP_SECRET = "first-secret";
    const first = await hashIp("203.0.113.7");
    assert.match(first, /^[0-9a-f]{64}$/);
    assert.notEqual(first, await sha256Hex("203.0.113.7"));
    process.env.QUESTIONS_IP_SECRET = "second-secret";
    assert.notEqual(await hashIp("203.0.113.7"), first);
  } finally {
    if (previous === undefined) delete process.env.QUESTIONS_IP_SECRET;
    else process.env.QUESTIONS_IP_SECRET = previous;
  }
});

test("Turnstile fails closed when a site key is built in but the secret is missing", async () => {
  const saved = { secret: process.env.TURNSTILE_SECRET_KEY, site: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY };
  try {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    assert.equal(await verifyTurnstile("anything", null), "skipped");
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    assert.equal(await verifyTurnstile("anything", null), "unconfigured");
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.equal(await verifyTurnstile("", null), "failed");
  } finally {
    for (const [key, value] of [["TURNSTILE_SECRET_KEY", saved.secret], ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", saved.site]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("emails escape the patient's name and the team alert carries no question", () => {
  const message = confirmEmail("en", "<b>Shilan</b>", "https://ssthyroid.com/en/ask/confirm#abc");
  assert.ok(message.html.includes("&lt;b&gt;Shilan&lt;/b&gt;"));
  assert.ok(!message.html.includes("<b>Shilan</b>"));
  assert.ok(message.text.includes("https://ssthyroid.com/en/ask/confirm#abc"));
  const arabic = confirmEmail("ar", "شيلان", "https://ssthyroid.com/ar/ask/confirm#abc");
  assert.ok(arabic.html.includes('dir="rtl"'));
  const alert = teamAlertEmail("https://ssthyroid.com/en/admin");
  assert.ok(!/question:|tired/i.test(alert.text));
});
