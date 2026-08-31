import assert from "node:assert/strict";
import test from "node:test";

/**
 * The three protections in front of sign-in and registration, tested against
 * the rules themselves rather than through a browser.
 *
 * `password-strength.ts`, `auth-throttle.ts` and `countries.ts` are plain
 * modules, so Node loads them directly and strips the types. What they decide —
 * whether a password may be submitted, how long a hammered form stays shut, and
 * what the Country field opens on — is otherwise only observable by actually
 * registering, which is exactly where a mistake is most expensive.
 */

/** `auth-throttle` reads `window.localStorage`; give it one before importing. */
function installBrowserStorage() {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  };
  return store;
}

const storage = installBrowserStorage();

const { PASSWORD_MIN_LENGTH, assessPassword, isLeakedPasswordError, passwordStrengthBand } = await import("../app/lib/password-strength.ts");
const { clearFailures, formatWait, registerFailure, throttleWait } = await import("../app/lib/auth-throttle.ts");
const { DEFAULT_COUNTRY, countryOptions } = await import("../app/lib/countries.ts");

test.beforeEach(() => storage.clear());

/* ---------- password rules ---------- */

test("a password one character short is refused, however varied it is", () => {
  const short = "aB3!aB3";
  assert.equal(short.length, PASSWORD_MIN_LENGTH - 1);
  assert.equal(assessPassword(short).acceptable, false);
  assert.equal(passwordStrengthBand(assessPassword(short)), "weak");
});

test("the minimum is eight characters", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
});

test("length is the only requirement: eight of anything is accepted", () => {
  // The rule the client asked for. No letter, number or symbol requirement may
  // creep back in, so every shape of eight characters is checked here — one
  // class each, which is the least variety a password can actually have.
  for (const password of ["aaaaaaaa", "12345678", "!!!!!!!!", "كلمةالمر"]) {
    const assessment = assessPassword(password);
    assert.equal(assessment.acceptable, true, `${password} should be accepted`);
    // Exactly one character class holds besides length, and that is enough.
    assert.equal(assessment.passed.length, 2, `${password} should pass length plus one class`);
  }
});

test("digits alone are enough, and so are symbols alone", () => {
  assert.equal(assessPassword("12345678").acceptable, true);
  assert.equal(assessPassword("!!!!!!!!").acceptable, true);
});

test("an accepted but plain password reads as fair, never weak", () => {
  // "weak" is reserved for refused. A member who chose something acceptable
  // must not be told it is weak.
  assert.equal(passwordStrengthBand(assessPassword("aaaaaaaa")), "fair");
});

test("variety still raises the band without ever being required", () => {
  const good = assessPassword("sulaymaniah7");
  assert.deepEqual(good.passed, ["length", "letter", "number"]);
  assert.equal(passwordStrengthBand(good), "good");
  assert.equal(passwordStrengthBand(assessPassword("Thyroid-2026!")), "strong");
});

test("Arabic letters count as letters", () => {
  // The site is trilingual; a member may well choose a password in Arabic.
  const assessment = assessPassword("كلمةالمرور");
  assert.ok(assessment.passed.includes("letter"));
  assert.equal(assessment.acceptable, true);
});

test("Supabase's leaked-password rejection is recognised, unrelated errors are not", () => {
  assert.equal(isLeakedPasswordError("Password is known to be weak and easy to guess, please choose a different one."), true);
  assert.equal(isLeakedPasswordError("Invalid login credentials"), false);
});

/* ---------- attempt throttling ---------- */

test("ordinary mistyping is not punished", () => {
  for (let attempt = 0; attempt < 4; attempt += 1) registerFailure("sign-in", "member@example.com");
  assert.equal(throttleWait("sign-in", "member@example.com"), 0);
});

test("the attempt after the free ones locks, and the lock grows", () => {
  for (let attempt = 0; attempt < 4; attempt += 1) registerFailure("sign-in", "member@example.com");
  const first = registerFailure("sign-in", "member@example.com");
  const second = registerFailure("sign-in", "member@example.com");
  assert.ok(first > 0);
  assert.equal(second, first * 2);
  assert.ok(throttleWait("sign-in", "member@example.com") > 0);
});

test("the lock is capped rather than growing without limit", () => {
  for (let attempt = 0; attempt < 40; attempt += 1) registerFailure("sign-in", "member@example.com");
  assert.equal(registerFailure("sign-in", "member@example.com"), 15 * 60);
});

test("one member's failures never lock out another on the same machine", () => {
  for (let attempt = 0; attempt < 6; attempt += 1) registerFailure("sign-in", "member@example.com");
  assert.ok(throttleWait("sign-in", "member@example.com") > 0);
  assert.equal(throttleWait("sign-in", "colleague@example.com"), 0);
});

test("the same address is tracked separately per action", () => {
  for (let attempt = 0; attempt < 6; attempt += 1) registerFailure("sign-in", "member@example.com");
  assert.equal(throttleWait("verify", "member@example.com"), 0);
});

test("case and stray spaces do not open a second, unlocked count", () => {
  for (let attempt = 0; attempt < 6; attempt += 1) registerFailure("sign-in", "member@example.com");
  assert.ok(throttleWait("sign-in", "  Member@Example.com  ") > 0);
});

test("signing in successfully clears the count", () => {
  for (let attempt = 0; attempt < 6; attempt += 1) registerFailure("sign-in", "member@example.com");
  clearFailures("sign-in", "member@example.com");
  assert.equal(throttleWait("sign-in", "member@example.com"), 0);
});

test("the stored record never contains the address itself", () => {
  registerFailure("sign-in", "member@example.com");
  const written = [...storage.values()].join("");
  assert.ok(written.length > 0);
  assert.equal(written.includes("member@example.com"), false);
});

test("a browser with storage blocked fails open rather than locking anyone out", () => {
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem() { throw new Error("The operation is insecure."); },
      setItem() { throw new Error("The operation is insecure."); },
      removeItem() { throw new Error("The operation is insecure."); },
    },
  };
  try {
    for (let attempt = 0; attempt < 20; attempt += 1) registerFailure("sign-in", "member@example.com");
    assert.equal(throttleWait("sign-in", "member@example.com"), 0);
  } finally {
    globalThis.window = previous;
  }
});

test("the wait is spelled out in the member's own language", () => {
  assert.equal(formatWait(45, "en"), "45 seconds");
  assert.equal(formatWait(1, "en"), "1 second");
  assert.equal(formatWait(120, "en"), "2 minutes");
  assert.ok(formatWait(120, "ar").includes("دقيقة"));
});

/* ---------- the country list ---------- */

test("the default country is one of the options, not a value the field cannot show", () => {
  assert.equal(DEFAULT_COUNTRY, "Iraq");
  assert.ok(countryOptions("en").some((option) => option.value === DEFAULT_COUNTRY));
});

test("the stored value stays English while the label follows the locale", () => {
  const arabic = countryOptions("ar").find((option) => option.value === "Iraq");
  assert.equal(arabic.label, "العراق");
  const english = countryOptions("en").find((option) => option.value === "Iraq");
  assert.equal(english.label, "Iraq");
});

test("each list is sorted the way its own language reads", () => {
  for (const locale of ["en", "ar"]) {
    const labels = countryOptions(locale).map((option) => option.label);
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    assert.deepEqual(labels, [...labels].sort(collator.compare), locale);
  }
});

test("a country typed in before the dropdown existed is kept, not silently reset", () => {
  const options = countryOptions("en", "Kurdistan Region");
  assert.equal(options[0].value, "Kurdistan Region");
  // And it is added once, not duplicated on top of a real match.
  assert.equal(countryOptions("en", "Iraq").filter((option) => option.value === "Iraq").length, 1);
});

test("every option carries both a value and a label", () => {
  const options = countryOptions("ar");
  assert.ok(options.length > 200);
  assert.ok(options.every((option) => option.value && option.label));
});
