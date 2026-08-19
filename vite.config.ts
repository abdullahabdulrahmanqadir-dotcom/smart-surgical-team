import vinext from "vinext";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
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
  ],
  kv_namespaces: [
    // vinext stores its public read-through cache here. Without this binding
    // `worker/index.ts` never installs the KV cache handler, so every public
    // page read went to Supabase directly — correct, but a database round trip
    // per request instead of an edge hit.
    //
    // Deliberately *not* `remote`: unlike the media bucket there is nothing to
    // read back from production, and a dev server writing rendered pages into
    // the live namespace would serve development output to real visitors. Dev
    // gets its own empty Miniflare namespace.
    {
      binding: "VINEXT_CACHE",
      id: "54d4983f760742b48fa119ef57a55b5c",
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
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
