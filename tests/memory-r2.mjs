/**
 * An in-memory stand-in for an R2 bucket, covering the slice of the API the
 * Worker's two caches use: `get`, `put`, `delete` and a `list` that can return
 * custom metadata inline.
 *
 * Shared by the page-cache tests and the `R2CacheStore` tests so both are
 * asserting against the same idea of what R2 does.
 */
export class MemoryR2 {
  objects = new Map();

  async get(key) {
    const stored = this.objects.get(key);
    if (!stored) return null;
    return {
      key,
      body: new Response(stored.body).body,
      httpMetadata: stored.httpMetadata,
      customMetadata: stored.customMetadata,
      arrayBuffer: async () => stored.body.slice(0),
      text: async () => new TextDecoder().decode(stored.body),
    };
  }

  async put(key, value, options = {}) {
    this.objects.set(key, {
      body: await new Response(value).arrayBuffer(),
      httpMetadata: options.httpMetadata,
      customMetadata: options.customMetadata,
    });
  }

  async delete(key) {
    this.objects.delete(key);
  }

  async list(options = {}) {
    const prefix = options.prefix ?? "";
    const matching = [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([a], [b]) => (a < b ? -1 : 1));

    const start = options.cursor ? Number(options.cursor) : 0;
    const limit = options.limit ?? 1000;
    const page = matching.slice(start, start + limit);
    const truncated = start + limit < matching.length;

    return {
      objects: page.map(([key, stored]) => ({ key, customMetadata: stored.customMetadata })),
      truncated,
      cursor: truncated ? String(start + limit) : undefined,
    };
  }
}

/** Rewind an object's `storedAt`/`expiresAt` stamps so a test can reach the
    stale or expired branch without waiting. */
export function ageObject(bucket, key, seconds) {
  const stored = bucket.objects.get(key);
  const shift = seconds * 1000;
  const { storedAt, expiresAt } = stored.customMetadata;
  stored.customMetadata = {
    ...stored.customMetadata,
    ...(storedAt ? { storedAt: String(Number(storedAt) - shift) } : {}),
    ...(expiresAt ? { expiresAt: String(Number(expiresAt) - shift) } : {}),
  };
}
