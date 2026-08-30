/** Cloudflare Worker entry point. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import { KVCacheHandler } from "vinext/cloudflare";
import { setCacheHandler } from "vinext/shims/cache";
import handler from "vinext/server/app-router-entry";
import { servePublicDocument } from "./page-cache";
import { legacyRedirect } from "./legacy-redirects";

interface Env {
  ASSETS: Fetcher;
  MEDIA_BUCKET: R2Bucket;
  /** Backs the cached Supabase reads in app/lib/content.ts, events.ts and
      research.ts. In production this is bound to the `sst-cache` KV namespace
      in the `smart` Worker's dashboard Bindings tab, which makes the cache
      shared and durable. Still optional: without the binding vinext falls back
      to a per-isolate memory cache, which works but goes cold whenever
      Cloudflare starts a fresh isolate. That is what local dev runs on. */
  VINEXT_CACHE?: KVNamespace;
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
    if (env.VINEXT_CACHE && !cacheHandlerInstalled) {
      setCacheHandler(new KVCacheHandler(env.VINEXT_CACHE));
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

    return servePublicDocument(request, env, ctx, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
