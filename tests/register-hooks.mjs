import { register } from "node:module";

/**
 * Redirects `cloudflare:workers` to a local stub so the built Worker bundle
 * can be imported by the Node test runner. Loaded with `node --import`.
 */
register(new URL("./resolve-cloudflare.mjs", import.meta.url));
