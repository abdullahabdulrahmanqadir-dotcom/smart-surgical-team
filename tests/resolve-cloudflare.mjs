import { existsSync } from "node:fs";

const STUB = new URL("./cloudflare-workers-stub.mjs", import.meta.url).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: STUB, shortCircuit: true };

  // Worker sources import each other the way a bundler expects — without a file
  // extension — which Node's resolver cannot follow. Node's own type stripping
  // handles the file once it is found; only finding it needs help.
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(candidate)) return { url: candidate.href, format: "module-typescript", shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
