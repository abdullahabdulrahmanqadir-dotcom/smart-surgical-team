import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

test("offline cache is restricted to public documents and public media", () => {
  assert.match(source, /PUBLIC_DOCUMENT/);
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /!url\.search/);
  assert.match(source, /\/api\/media\//);
  assert.doesNotMatch(source, /cache\.put\([^\n]*(?:profile|admin|sign-in|sign-up)/);
});

test("a failed navigation keeps the last known-good device copy", () => {
  assert.match(source, /return cached \|\| response/);
  assert.match(source, /if \(cached\) return cached/);
  assert.match(source, /has not been saved on this device yet/);
});
