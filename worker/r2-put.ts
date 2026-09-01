/**
 * Writes to R2 that survive contention for a single object.
 *
 * R2 admits one write at a time per object key. A second `put` that overlaps
 * the first is not queued for us — it is rejected outright with
 *
 *   put: Reduce your concurrent request rate for the same object. (10058)
 *
 * Both caches in the `smart-cache` bucket concentrate their writes on a
 * handful of hot keys, which is exactly the shape that trips this. Every
 * isolate that finds `data:cache:unstable_cache:public-events:[]` stale — one
 * minute after the last isolate refreshed it — rewrites that same object, and
 * a crawler walking the site has plenty of isolates doing it at once. The
 * write is a cache write, so nothing about the page was wrong; the rejection
 * surfaced only as an error in the logs and a cache entry that failed to land
 * and had to be recomputed.
 *
 * The answer is to try again, after a pause that is jittered so that two
 * writers rejected at the same instant do not retry at the same instant. That
 * covers contention from another isolate, which is the common case, and from
 * this one, since a request that loses the race is a request that waits and
 * writes a moment later.
 *
 * Deliberately *not* a queue shared between the requests in an isolate, which
 * is the first idea this problem suggests. Making one request wait on a write
 * another request started means awaiting work owned by a different request's
 * context, and the runtime is free to cancel that context the moment its own
 * response and `waitUntil` are done — leaving every waiter hanging until the
 * runtime kills them too. Each request retrying its own write keeps every I/O
 * operation inside the request that asked for it.
 *
 * Retrying needs the body a second time, so it is limited to values that can
 * be replayed. A `ReadableStream` is consumed by its first attempt; those get
 * one try. Both callers today hand over a string or a buffer.
 */

type PutValue = string | ArrayBuffer | ArrayBufferView | ReadableStream | Blob | null;

/** Pauses before retry 1, 2 and 3, each jittered up to double. Spent waiting
    on a clock, not on CPU, and — for the page cache — inside `waitUntil`
    rather than on the request path. */
const RETRY_PAUSES_MS = [50, 150, 400];

const CONTENTION = /\(10058\)|reduce your concurrent request rate/i;

/** True for R2's "one write at a time per object" rejection, which says the
    write can succeed later, and only for that. Anything else — a missing
    binding, a bad key, an exhausted quota — is a real failure. */
export function sameObjectContention(error: unknown): boolean {
  return error instanceof Error && CONTENTION.test(error.message);
}

function replayable(value: PutValue): boolean {
  return typeof value === "string" || value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * ms));
}

/**
 * Write `value` to `key`, retrying a write another writer was already making
 * to the same object. Any other failure is raised on the first attempt.
 */
export async function putThroughContention(
  bucket: R2Bucket,
  key: string,
  value: PutValue,
  options?: R2PutOptions,
): Promise<void> {
  const allowed = replayable(value) ? RETRY_PAUSES_MS.length + 1 : 1;

  for (let tries = 1; ; tries++) {
    try {
      await bucket.put(key, value, options);
      return;
    } catch (error) {
      if (tries >= allowed || !sameObjectContention(error)) throw error;
      await pause(RETRY_PAUSES_MS[tries - 1]);
    }
  }
}
