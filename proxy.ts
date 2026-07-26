import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, detectLocale, isLocale } from "./app/lib/i18n";

// Every page lives under /<locale>/…, so any request without a locale prefix is
// redirected to the visitor's best-guess language. An explicit choice always
// wins: once the URL carries a locale, this does nothing.

const PUBLIC_FILE = /\.[^/]+$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const skip =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/specimen") ||
    PUBLIC_FILE.test(pathname);

  if (skip) return NextResponse.next();

  const first = pathname.split("/").filter(Boolean)[0];
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
