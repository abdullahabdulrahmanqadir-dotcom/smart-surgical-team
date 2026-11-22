import assert from "node:assert/strict";
import test from "node:test";

/**
 * Anti-abuse rules shared by the question and MDT forms: hidden-character
 * spoofing, link spam, cross-site posts and Turnstile tokens solved elsewhere.
 */
const { QUESTION_LIMITS, stripInvisible, validateQuestion } = await import("../app/lib/patient-questions.ts");
const { validateMdtInquiry } = await import("../app/lib/mdt-inquiries.ts");
const { refuseForeignRequest, verifyTurnstile } = await import("../app/lib/inbox-server.ts");

const QUESTION = {
  name: "Shilan Ahmed", phone: "0770 123 4567", email: "", replyVia: "whatsapp", topic: "thyroid",
  question: "Is it normal to feel tired after thyroid surgery?", consent: true,
};

test("bidi overrides and zero-width characters are removed, Kurdish joiners kept", () => {
  assert.equal(stripInvisible("abc‮dcba‬"), "abcdcba");
  assert.equal(stripInvisible("a​b﻿c⁦d⁩"), "abcd");
  assert.equal(stripInvisible("دەست‌پێکردن"), "دەست‌پێکردن");
  assert.equal(stripInvisible("‏مرحبا‎"), "‏مرحبا‎");
  const result = validateQuestion({ ...QUESTION, name: "Admin‮ nimdA", question: "Hello​ there, a real question?" });
  assert.equal(result.ok, true);
  assert.equal(result.value.name, "Admin nimdA");
  assert.equal(result.value.question, "Hello there, a real question?");
});

test("a question with more than two links is refused as link spam", () => {
  const spam = "Great offer http://a.example http://b.example www.c.example buy now";
  const result = validateQuestion({ ...QUESTION, question: spam });
  assert.equal(result.ok, false);
  assert.equal(result.errors.question, "tooManyLinks");
  assert.equal(QUESTION_LIMITS.linksMax, 2);
  assert.equal(validateQuestion({ ...QUESTION, question: "I read https://a.example and www.b.example, is it right?" }).ok, true);
});

test("MDT text is stripped of hidden characters too", () => {
  const result = validateMdtInquiry({
    name: "Dr‮ Test", role: "surgeon", institution: "City​ Hospital", country: "Iraq",
    email: "dr@example.org", phone: "", interest: "attend", message: "We would like to attend the meeting.",
    consent: true, noPatientData: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.name, "Dr Test");
  assert.equal(result.value.institution, "City Hospital");
});

const post = (headers) => new Request("https://ssthyroid.com/api/questions", { method: "POST", headers, body: "{}" });

test("cross-site and non-JSON posts are refused before anything else", () => {
  assert.equal(refuseForeignRequest(post({ "content-type": "application/json", origin: "https://ssthyroid.com", "sec-fetch-site": "same-origin" })), null);
  assert.equal(refuseForeignRequest(post({ "content-type": "application/json" })), null);
  assert.equal(refuseForeignRequest(post({ "content-type": "application/json", origin: "https://evil.example" })), 403);
  assert.equal(refuseForeignRequest(post({ "content-type": "application/json", "sec-fetch-site": "cross-site" })), 403);
  assert.equal(refuseForeignRequest(post({ "content-type": "application/json", origin: "null" })), 403);
  assert.equal(refuseForeignRequest(post({ "content-type": "text/plain" })), 415);
  assert.equal(refuseForeignRequest(post({ "content-type": "application/x-www-form-urlencoded" })), 415);
});

test("a Turnstile token solved on another host is refused on the live site", async () => {
  const saved = { secret: process.env.TURNSTILE_SECRET_KEY, fetch: globalThis.fetch };
  process.env.TURNSTILE_SECRET_KEY = "secret";
  let hostname = "ssthyroid.com";
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname }));
  try {
    assert.equal(await verifyTurnstile("token", null, "ssthyroid.com"), "passed");
    hostname = "localhost";
    assert.equal(await verifyTurnstile("token", null, "ssthyroid.com"), "failed");
    // Local development checks tokens solved on localhost.
    assert.equal(await verifyTurnstile("token", null, "localhost"), "passed");
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = saved.secret;
  }
});
