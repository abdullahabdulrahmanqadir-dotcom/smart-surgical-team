/**
 * A request for an API route that does not exist.
 *
 * Nothing claimed these paths, so they never reached the app tree, `notFound()`
 * was raised with no boundary above it to answer, and the signal left the
 * Worker as an uncaught exception: Cloudflare then served its own
 * `error code: 1101` page with a 500. Every mistyped or probed URL under
 * `/api/` was a server error rather than a 404, including
 * `/api/media/../secret`, which normalises to a path no route claims.
 *
 * A route handler rather than a page, because an API miss wants a body a client
 * can read rather than markup, and because there is no root layout to render a
 * page in. A concrete or dynamic segment always beats a catch-all, so every
 * real route under `/api/` still wins; the same reasoning is spelled out in
 * `app/[locale]/[...unmatched]/page.tsx`, which does this for locale paths.
 *
 * A path outside both — `/favicon.ico`, `/nope.txt` — is answered by the guard
 * in `worker/index.ts`, because a catch-all at the app root is not registered.
 */
function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export const GET = notFound;
export const HEAD = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
