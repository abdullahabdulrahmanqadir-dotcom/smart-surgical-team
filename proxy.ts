import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, detectLocale, isLocale } from "./app/lib/i18n";

// Every page lives under /<locale>/…, so any request without a locale prefix is
// redirected to the visitor's best-guess language. An explicit choice always
// wins: once the URL carries a locale, this does nothing.

const PUBLIC_FILE = /\.[^/]+$/;

// Sorani Kurdish was retired as a locale. Its URLs are still bookmarked and
// still in search indexes, and without this they fall through to the generic
// rule below, which reads "ckb" as an ordinary path segment and sends
// /ckb/topics to /en/ckb/topics — a 404. Mapping the whole subtree onto the
// English equivalent keeps those links working. 308 rather than the 307 used
// for language negotiation: this move is permanent and should be indexed as
// such, whereas a negotiated locale depends on who is asking.
const RETIRED_LOCALE = "ckb";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const skip =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/specimen") ||
    PUBLIC_FILE.test(pathname);

  if (skip) return NextResponse.next();

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (first === RETIRED_LOCALE) {
    const url = request.nextUrl.clone();
    const rest = segments.slice(1).join("/");
    url.pathname = rest ? `/en/${rest}` : "/en";
    return NextResponse.redirect(url, 308);
  }

  if (isLocale(first)) return NextResponse.next();

  const locale = detectLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [`/((?!_next|api|favicon.svg|.*\\..*).*)`],
};

export { LOCALES };
