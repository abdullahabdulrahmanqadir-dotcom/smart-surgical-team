/**
 * Back-off for repeated failed authentication attempts.
 *
 * This is a guardrail, not the security boundary. It lives in `localStorage`,
 * so it slows down a person hammering the form in a browser and it stops a
 * script that reuses one tab, but anyone who clears storage or drives the API
 * directly walks straight past it. The real limits are Supabase's own rate
 * limits and the Turnstile check in front of each submit; this exists so an
 * ordinary member is told to wait instead of being silently blocked by those.
 */

const STORE_KEY = "sst.auth.attempts";
/** Failures below this are free — real people mistype passwords. */
const FREE_ATTEMPTS = 4;
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 15 * 60;
/** A quiet spell this long clears the count, so yesterday's typos never count. */
const ATTEMPT_WINDOW_MS = 30 * 60 * 1000;

export type ThrottleAction = "sign-in" | "sign-up" | "verify" | "recover";

type Record = { failures: number; lockedUntil: number; updatedAt: number };
type Store = { [key: string]: Record };

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    // Private browsing and blocked storage both throw here. Failing open is
    // right: a member with cookies locked down must still be able to sign in.
    return {};
  }
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* Nothing to do — the throttle simply does not apply in this browser. */
  }
}

/**
 * Keyed by action and address so one member's mistyped password never locks a
 * different account out on a shared machine. The address is lowercased and
 * hashed to a short digest rather than stored, because `localStorage` on a
 * shared computer should not be a list of who has signed in here.
 */
function keyFor(action: ThrottleAction, identifier: string): string {
  const normalised = identifier.trim().toLowerCase();
  let hash = 5381;
  for (let index = 0; index < normalised.length; index += 1) hash = ((hash * 33) ^ normalised.charCodeAt(index)) >>> 0;
  return `${action}:${hash.toString(36)}`;
}

function prune(store: Store): Store {
  const now = Date.now();
  return Object.fromEntries(Object.entries(store).filter(([, record]) => now - record.updatedAt < ATTEMPT_WINDOW_MS || record.lockedUntil > now));
}

/** Seconds still to wait, or 0 when the attempt may go ahead. */
export function throttleWait(action: ThrottleAction, identifier: string): number {
  if (typeof window === "undefined") return 0;
  const record = readStore()[keyFor(action, identifier)];
  if (!record) return 0;
  const remaining = record.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** Records a failure and returns the lock it earned, in seconds (0 if none yet). */
export function registerFailure(action: ThrottleAction, identifier: string): number {
  if (typeof window === "undefined") return 0;
  const store = prune(readStore());
  const key = keyFor(action, identifier);
  const now = Date.now();
  const previous = store[key];
  // A failure after the window has gone quiet starts the count over.
  const failures = (previous && now - previous.updatedAt < ATTEMPT_WINDOW_MS ? previous.failures : 0) + 1;

  const over = failures - FREE_ATTEMPTS;
  const lockSeconds = over > 0 ? Math.min(BASE_LOCK_SECONDS * 2 ** (over - 1), MAX_LOCK_SECONDS) : 0;

  store[key] = { failures, lockedUntil: now + lockSeconds * 1000, updatedAt: now };
  writeStore(store);
  return lockSeconds;
}

/** Called after a success so a member who finally got in starts clean. */
export function clearFailures(action: ThrottleAction, identifier: string) {
  if (typeof window === "undefined") return;
  const store = prune(readStore());
  delete store[keyFor(action, identifier)];
  writeStore(store);
}

/** "2 minutes" / "45 seconds", in the member's language. */
export function formatWait(seconds: number, locale: string): string {
  const arabic = locale === "ar";
  if (seconds < 60) return arabic ? `${seconds} ثانية` : `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return arabic ? `${minutes} دقيقة` : `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
