/**
 * A signal that a page was rendered with less than it asked for.
 *
 * `app/lib/content.ts` and its siblings deliberately degrade rather than fail:
 * when a Supabase read throws, the caller gets an empty list and the page
 * renders without that section. That is the right answer for one response — a
 * homepage missing its research preview beats no homepage at all — but
 * `worker/page-cache.ts` then stores the result and serves it to everyone for
 * up to a day. One timeout during a cold render becomes a section that is
 * missing site-wide until the entry expires, which is the same failure that
 * `unstable_cache` was taught to avoid one layer down: a degraded read is not a
 * fact about the site, so it must not be published as one.
 *
 * The counter lives on `globalThis` rather than in module scope so that it is
 * shared even if the Worker's entry and the application end up in separately
 * bundled copies of this file. Reads and writes are plain increments; a Worker
 * isolate is single-threaded, so there is nothing to synchronise.
 *
 * The one imprecision is deliberate. An isolate handles several requests at
 * once, so a failure recorded during one render can be seen by another that had
 * no trouble at all. That direction is safe: the cost is one page that could
 * have been cached and was not. The reverse — attributing a clean render to a
 * degraded one — is the failure this exists to prevent, and cannot happen.
 */

type MarkerHost = typeof globalThis & { __sstDegradedReads?: number };

/** Records that a content read failed and its caller fell back to less. */
export function noteDegradedRead(): void {
  const host = globalThis as MarkerHost;
  host.__sstDegradedReads = (host.__sstDegradedReads ?? 0) + 1;
}

/**
 * An opaque value that changes whenever a read degrades. Take it before a
 * render and compare it after: unequal means something was missing from the
 * page that was produced.
 */
export function degradationMarker(): number {
  return (globalThis as MarkerHost).__sstDegradedReads ?? 0;
}
