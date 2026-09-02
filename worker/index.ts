/** Cloudflare Worker entry point. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import { KVCacheHandler } from "vinext/cloudflare";
import { setCacheHandler } from "vinext/shims/cache";
import handler from "vinext/server/app-router-entry";
import { servePublicDocument } from "./page-cache";
import { R2CacheStore } from "./r2-cache-store";
import { legacyRedirect } from "./legacy-redirects";

interface Env {
  ASSETS: Fetcher;
  MEDIA_BUCKET: R2Bucket;
  /** The `smart-cache` R2 bucket, holding both caches this Worker keeps:
      rendered public documents under `page:` (see ./page-cache.ts) and the
      cached Supabase reads in app/lib/content.ts, events.ts and research.ts
      under `data:`. R2 rather than Workers KV because KV's free plan allows
      only 1,000 writes a day, which this site burns through — see
      ./r2-cache-store.ts. Still optional: without the binding vinext falls
      back to a per-isolate memory cache and the page cache turns itself off,
      which works but goes cold whenever Cloudflare starts a fresh isolate. */
  CACHE_BUCKET?: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

let cacheHandlerInstalled = false;
const ALLOWED_IMAGE_WIDTHS = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];

/**
 * The answer to a path that matches no route at all.
 *
 * Inside a locale, `app/[locale]/[...unmatched]/page.tsx` catches this and
 * renders the real 404 page, and `app/api/[...unmatched]/route.ts` now does the
 * same for an API miss. Nothing can claim what is left — `/favicon.ico`,
 * `/apple-touch-icon.png`, `/nope.txt` — because a dotted path is not given a
 * locale to be redirected into, and a route handler at the app root is not
 * registered. Those reach the router, match nothing, and raise `notFound()`
 * with no boundary above it to answer; the signal then leaves the Worker as an
 * uncaught exception and Cloudflare serves its own `error code: 1101` page with
 * a 500. Every browser asks for `/favicon.ico`, so this was a server error on
 * an ordinary request.
 *
 * Recognised by the signal itself rather than by catching everything: a real
 * render failure still surfaces as a 500 and still reaches the logs.
 */
function isNotFoundSignal(error: unknown): boolean {
  const { digest, message } = (error ?? {}) as { digest?: unknown; message?: unknown };
  if (typeof digest === "string" && (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"))) return true;
  return message === "NEXT_NOT_FOUND";
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Old ssthyroid.com URLs and the www hostname, both of which now land here
    // rather than on Hostinger. Runs before everything else so a redirect never
    // costs a cache lookup or a render.
    const legacy = legacyRedirect(url);
    if (legacy) return legacy;

    // Installed per request but stored on globalThis, so this is a cheap
    // no-op once an isolate is warm. Skipped entirely when the binding is
    // absent, which keeps local dev and any unbound deployment working on
    // vinext's default in-memory handler instead of throwing.
    if (env.CACHE_BUCKET && !cacheHandlerInstalled) {
      // `appPrefix` keeps vinext's entries and tag markers under `data:`, so
      // the rendered documents `page-cache.ts` writes under `page:` share the
      // bucket without either one listing or expiring the other's keys.
      setCacheHandler(new KVCacheHandler(new R2CacheStore(env.CACHE_BUCKET), { appPrefix: "data" }));
      cacheHandlerInstalled = true;
    }

    if (url.pathname === "/_vinext/image") {
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, ALLOWED_IMAGE_WIDTHS);
    }

    try {
      return await servePublicDocument(request, env, ctx, () => handler.fetch(request, env, ctx));
    } catch (error) {
      if (!isNotFoundSignal(error)) throw error;
      return new Response("Not Found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
  },
};

export default worker;
