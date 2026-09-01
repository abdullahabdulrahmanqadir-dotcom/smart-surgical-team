/**
 * A Workers-KV-shaped façade over an R2 bucket.
 *
 * vinext's `KVCacheHandler` is written against a small, duck-typed slice of
 * the KV API — `get`, `put`, `delete`, `list` — and nothing else. Handing it
 * this class instead of a `KVNamespace` moves the whole read-through data
 * cache into R2 without reimplementing the handler's tag semantics, entry
 * validation or stale-while-revalidate rules, which are the parts worth
 * keeping.
 *
 * Why R2 rather than KV at all: KV's free plan allows 1,000 writes and 1,000
 * deletes a day across the whole namespace, which this site exhausts well
 * before the day is out — every published edit expires a tag, and every cold
 * page render writes an entry. R2's free plan counts a write as a Class A
 * operation and allows 1,000,000 of them a month, with 10,000,000 Class B
 * (read) operations and 10 GB of storage. Same job, roughly thirty times the
 * daily write headroom, and no overage bill to opt into.
 *
 * Two behavioural differences the caller should know about:
 *
 * - **R2 has no `expirationTtl`.** Expiry is emulated: `put` stamps an
 *   `expiresAt` into the object's custom metadata, and `get`/`list` treat a
 *   passed-expiry object as absent and reap it in the background. A bucket
 *   lifecycle rule (see HANDOFF.md) is the backstop that reclaims storage for
 *   keys nothing ever reads again.
 * - **R2 is read-after-write consistent.** KV takes up to 60 seconds to
 *   propagate a write globally, so a tag expired by the Admin could keep
 *   losing to a cached entry for a minute. That window is gone.
 * - **R2 rejects overlapping writes to one object** rather than queueing
 *   them, which KV never did. `put` goes through `./r2-put.ts` for that.
 */

import { putThroughContention, sameObjectContention } from "./r2-put";

/** R2 caps user-defined metadata; stay well under it and drop anything larger
    rather than failing the write. `KVCacheHandler` only stores a tag list
    here, and already tolerates an entry that has none. */
const MAX_METADATA_BYTES = 1536;

/** `KVCacheHandler` writes two kinds of key: cache entries under `cache:`, and
    tag-invalidation timestamps under `__tag:`. The difference matters when a
    write cannot be completed — see `put`. */
const TAG_MARKER = /(?:^|:)__tag:/;

type StoredMetadata = Record<string, unknown>;

type ListedKey = {
  name: string;
  metadata?: StoredMetadata;
};

/** `include` is part of the R2 runtime API but missing from `R2ListOptions` in
    the pinned @cloudflare/workers-types. Widen it here rather than casting at
    the call site, so the property still gets a type. */
type R2ListOptionsWithInclude = R2ListOptions & {
  include?: ("httpMetadata" | "customMetadata")[];
};

function expired(customMetadata: Record<string, string> | undefined): boolean {
  const expiresAt = Number(customMetadata?.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() > expiresAt;
}

function parseMetadata(customMetadata: Record<string, string> | undefined): StoredMetadata | undefined {
  const raw = customMetadata?.metadata;
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StoredMetadata) : undefined;
  } catch {
    return undefined;
  }
}

export class R2CacheStore {
  // A plain field rather than a constructor parameter property: the Node test
  // runner strips types without transforming, and parameter properties need a
  // transform.
  private readonly bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  get(key: string, options?: { type?: string }): Promise<string | null>;
  get(key: string, options: { type: "arrayBuffer" }): Promise<ArrayBuffer | null>;
  async get(key: string, options?: { type?: string }): Promise<string | ArrayBuffer | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;

    if (expired(object.customMetadata)) {
      // Nothing awaits this: the caller is being told the entry is gone, and
      // reclaiming the bytes is bookkeeping. A failed delete is retried by
      // the next reader, and by the bucket's lifecycle rule after that.
      void object.body.cancel();
      void this.bucket.delete(key).catch(() => {});
      return null;
    }

    return options?.type === "arrayBuffer" ? object.arrayBuffer() : object.text();
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { expirationTtl?: number; metadata?: StoredMetadata },
  ): Promise<void> {
    const customMetadata: Record<string, string> = {};

    if (typeof options?.expirationTtl === "number" && options.expirationTtl > 0) {
      customMetadata.expiresAt = String(Date.now() + options.expirationTtl * 1000);
    }

    if (options?.metadata) {
      const serialized = JSON.stringify(options.metadata);
      if (serialized.length <= MAX_METADATA_BYTES) customMetadata.metadata = serialized;
    }

    // Same-key contention is real here: every isolate refreshes the same few
    // hot entries, and R2 rejects overlapping writes to one object rather than
    // queueing them. See ./r2-put.ts.
    try {
      await putThroughContention(this.bucket, key, value, { customMetadata });
    } catch (error) {
      // A tag marker that could not be written is a correctness problem: the
      // entries it was meant to invalidate keep being served until their own
      // TTL runs out, so the Admin's publish handler needs to hear about it.
      if (TAG_MARKER.test(key) || !sameObjectContention(error)) throw error;

      // An entry is different. Its value has already been returned to the
      // reader that computed it; failing to store it costs one recomputation
      // and nothing else. Left to reject it would instead be reported as a
      // request error — which is all the rejection ever was, since the page
      // itself was fine.
      console.warn(`[cache] entry ${key} not stored: R2 same-object contention outlasted the retries`);
    }
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: ListedKey[];
    list_complete: boolean;
    cursor?: string;
  }> {
    // Without `include` R2 returns keys only, and `KVCacheHandler` relies on
    // the tag list travelling inline with the listing to invalidate a path
    // prefix without fetching every entry. R2 may answer with a smaller page
    // than asked for when metadata is included; the cursor covers that.
    const listOptions: R2ListOptionsWithInclude = {
      prefix: options?.prefix,
      limit: options?.limit,
      cursor: options?.cursor,
      include: ["customMetadata"],
    };
    const page = await this.bucket.list(listOptions);

    const keys = page.objects
      .filter((object) => !expired(object.customMetadata))
      .map((object) => ({ name: object.key, metadata: parseMetadata(object.customMetadata) }));

    return {
      keys,
      list_complete: !page.truncated,
      cursor: page.truncated ? page.cursor : undefined,
    };
  }
}
