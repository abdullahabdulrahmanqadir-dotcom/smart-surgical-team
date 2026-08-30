/**
 * Supabase reports a failed OAuth round trip by redirecting back to the app
 * with the reason attached, not by throwing — the browser has already left the
 * page that called signInWithOAuth by then. The implicit flow puts it in the
 * hash and the PKCE flow in the query string, so read both.
 */
export function readAuthRedirectError(href: string): string | null {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const description = hash.get("error_description") ?? url.searchParams.get("error_description");
  const code = hash.get("error") ?? url.searchParams.get("error");
  if (!description && !code) return null;
  return (description ?? code ?? "").replace(/\+/g, " ");
}

/**
 * Raised by the enforce_single_sign_in_method trigger (migration 0023) when
 * Google offers an address that already signs in with a password. GoTrue
 * forwards the database message, but truncates or rewraps it depending on the
 * version, so match on the marker and on the wording it degrades to.
 */
export function isSignInMethodConflict(message: string): boolean {
  return /sst_identity_conflict|already signs in with|error (?:saving|linking) (?:new )?(?:user|identity)|database error/i.test(message);
}

/** Strips the URL of the fragment Supabase appended, so a reload is clean. */
export function clearAuthRedirectParams() {
  const url = new URL(window.location.href);
  for (const key of ["error", "error_code", "error_description"]) url.searchParams.delete(key);
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
