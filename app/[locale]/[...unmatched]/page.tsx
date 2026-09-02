import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { privatePageMetadata } from "../../lib/seo";

/**
 * A route that exists only to fail.
 *
 * The runtime answers a path that matches no route with a bare `Not Found`
 * body — nine bytes, no layout, no `<title>` — because it never reaches the
 * app tree and so never reaches a not-found boundary. This catch-all matches
 * anything under a locale that nothing more specific claimed, which puts the
 * request inside `[locale]` and lets `not-found.tsx` render the real page.
 *
 * A concrete segment always beats a catch-all, so every existing route still
 * wins; `tests/rendered-html.test.mjs` covers that.
 *
 * Metadata is resolved here rather than in the boundary, which cannot export
 * any — otherwise a 404 would inherit the homepage's title and description.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  return privatePageMetadata(getDictionary(active).seo.notFoundPageTitle);
}

export default function UnmatchedLocalePath(): never {
  notFound();
}
