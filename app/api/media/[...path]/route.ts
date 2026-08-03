import { env } from "cloudflare:workers";
import { getRequestExecutionContext } from "vinext/shims/request-context";

/** Uploaded media is immutable: the Admin writes a new timestamped key rather
    than overwriting one, so a stored copy never goes stale. */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  // Every image on the site used to reach R2 on every request, even though the
  // bytes never change. The edge cache answers repeat requests without an R2
  // read. `caches` is absent in some local runtimes, so it stays optional.
  const cache = typeof caches !== "undefined" ? await caches.open("sst-media").catch(() => undefined) : undefined;
  // Vinext's route handler passes a Request wrapper from a different runtime
  // realm. Cloudflare's Cache API then treats it as the literal URL
  // "[object Request]" and throws before R2 is reached. A URL string is a
  // portable cache key in both the local runner and the deployed Worker.
  const cacheKey = request.url;
  const cached = await cache?.match(cacheKey);
  // A Response handed back by the Cache API carries an immutable headers guard.
  // Vinext adds its own headers downstream, which throws ("Can't modify
  // immutable headers") and turns every cache hit into a 500. Rebuilding the
  // response copies the bytes and metadata into a mutable one.
  if (cached) return new Response(cached.body, { status: cached.status, headers: new Headers(cached.headers) });

  const key = (await params).path.join("/");

  // A conditional request is answered without streaming the body at all: R2
  // compares the caller's etag and only sends bytes when it no longer matches.
  const ifNoneMatch = request.headers.get("if-none-match");
  const object = await env.MEDIA_BUCKET.get(key, ifNoneMatch ? { onlyIf: { etagDoesNotMatch: ifNoneMatch } } : undefined);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", CACHE_CONTROL);

  // R2 omits the body when an `onlyIf` precondition fails — exactly the
  // "you already have this" case that 304 exists for.
  if (!("body" in object) || !object.body) return new Response(null, { status: 304, headers });

  const response = new Response(object.body, { headers });
  // Written in the background: the reader gets the image straight away, and
  // the runtime is told to keep the isolate alive until the copy is stored.
  // Without an execution context the write is skipped rather than risking a
  // cancelled stream mid-write.
  const executionContext = getRequestExecutionContext();
  if (cache && executionContext) executionContext.waitUntil(cache.put(cacheKey, response.clone()).catch(() => undefined));

  return response;
}
