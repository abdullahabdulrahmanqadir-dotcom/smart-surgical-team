import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";

// Retire after the pre-redesign HTML has aged out of the production caches.
const previousRelease = "https://593fdfed-smart.ssteam.workers.dev";
const output = new URL("../dist/client/", import.meta.url);

async function fetchAsset(path) {
  const response = await fetch(new URL(path, previousRelease), {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

export async function retainPreviousAssets() {
  const manifest = await (await fetchAsset("/.vite/manifest.json")).json();
  const paths = new Set(Object.values(manifest).flatMap(({ file, css, assets }) =>
    [file, ...(css ?? []), ...(assets ?? [])],
  ).filter((path) => /^assets\/[\w.-]+$/.test(path)));
  if (!paths.size) throw new Error("The previous release manifest contains no bundled assets");
  // Vinext injects the global stylesheet through its RSC manifest.
  paths.add("assets/index-BXwTwMwB.css");

  // New assets take precedence. Both releases are served by Cloudflare's
  // static asset handler while the existing document cache refreshes.
  const missing = [...paths].filter((path) => !existsSync(new URL(path, output)));
  for (let start = 0; start < missing.length; start += 8) {
    await Promise.all(missing.slice(start, start + 8).map(async (path) => {
      const asset = await fetchAsset(`/${path}`);
      await writeFile(new URL(path, output), Buffer.from(await asset.arrayBuffer()));
    }));
  }
  console.log(`Retained ${missing.length} bundled assets from the previous release.`);
}
