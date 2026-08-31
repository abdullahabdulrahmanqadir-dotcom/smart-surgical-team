import vinext from "vinext";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  // Production is the Worker `smart` (smart.ssteam.workers.dev). Without this
  // the generated dist/server/wrangler.json takes its name from package.json
  // (`sst`), and a deploy silently creates a new empty Worker instead of
  // updating the live one. Keep it.
  name: "smart",
  main: "./worker/index.ts",
  // Newest date supported by the workerd runtime bundled with the currently
  // pinned Cloudflare Vite plugin. Upgrade this with that plugin, not alone.
  compatibility_date: "2026-05-22",
  compatibility_flags: ["nodejs_compat"],
  observability: { enabled: true, head_sampling_rate: 1 },
  r2_buckets: [
    // Editorial media is bound to the real bucket even in dev. A local
    // Miniflare bucket starts empty, so every existing image 404s while
    // developing, and anything uploaded from the Admin lands in a local cache
    // that the deployed site can never read — while its row in Supabase, which
    // is always the shared instance, points at a key that does not exist.
    // Requires `wrangler login`. Set SST_LOCAL_R2=1 to fall back to an empty
    // local Miniflare bucket — every image 404s, but the dev server starts
    // without a Cloudflare account that can open an edge-preview session.
    {
      binding: "MEDIA_BUCKET",
      bucket_name: "smart-media",
      remote: process.env.SST_LOCAL_R2 !== "1",
    },
    // Both caches this Worker keeps: rendered public documents under `page:`
    // and vinext's read-through Supabase cache under `data:`. Without this
    // binding `worker/index.ts` never installs the cache handler and
    // `worker/page-cache.ts` turns itself off, so every public page read goes
    // to Supabase directly — correct, but a database round trip per request.
    //
    // Deliberately *not* `remote`, unlike the media bucket: there is nothing
    // to read back from production, and a dev server writing its own rendered
    // pages into the live bucket would serve development output to real
    // visitors. Dev gets its own empty Miniflare bucket, which also keeps
    // local work off the account's R2 operation allowance.
    {
      binding: "CACHE_BUCKET",
      bucket_name: "smart-cache",
    },
  ],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      // Vite 8 enables browser-console forwarding automatically when it detects
      // an agent environment. Its client can try to forward an early page error
      // before the HMR WebSocket has connected, which replaces the useful error
      // with `Cannot read properties of undefined (reading 'send')`. Browser
      // DevTools and Vite's normal error overlay still report errors with this
      // optional forwarding bridge disabled.
      forwardConsole: false,
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
