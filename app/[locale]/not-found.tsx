import Link from "next/link";
import { headers } from "next/headers";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { IconArrowRight } from "../components/icons";
import { getDictionary } from "../lib/dictionaries";
import { isLocale, localePath, DEFAULT_LOCALE, type Locale } from "../lib/i18n";

/**
 * Before this existed, every bad URL — and every `notFound()` call inside a
 * locale route — fell through to the runtime's bare "Not Found": 74 bytes of
 * plain text, no header, no footer, not even a title.
 *
 * A not-found boundary is rendered without route params, so the locale comes
 * from the header `proxy.ts` sets on locale-prefixed requests.
 */
export default async function LocaleNotFound() {
  const requested = (await headers()).get("x-sst-locale");
  const active: Locale = isLocale(requested ?? undefined) ? (requested as Locale) : DEFAULT_LOCALE;
  const dict = getDictionary(active);
  const t = dict.notFound;

  const routes = [
    { href: localePath(active, "topics"), label: t.browseCases },
    { href: localePath(active, "research"), label: t.browseResearch },
    { href: localePath(active, "events"), label: t.browseEvents },
    { href: localePath(active, "contact"), label: t.contact },
  ];

  return (
    <>
      {/* A not-found boundary cannot set the document title: it may not export
          metadata, the catch-all's `generateMetadata` does not survive the
          `notFound()` throw, and a hoisted <title> is emitted after the
          layout's and so loses. The tab therefore reads as the site default.
          Keeping the page out of the index is the part that matters. */}
      <meta name="robots" content="noindex, nofollow" />
      <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
      <SiteHeader locale={active} dict={dict} />
      <main id="main-content" className="not-found-page">
        <div className="not-found-inner">
          <p className="not-found-code" aria-hidden="true">{t.code}</p>
          <h1>{t.title}</h1>
          <p className="not-found-body">{t.body}</p>
          <Link className="btn btn-primary btn-lg" href={localePath(active)}>
            {t.backHome}
            <IconArrowRight size={18} />
          </Link>
          <nav className="not-found-links" aria-label={t.title}>
            {routes.map((route) => (
              <Link className="text-link" href={route.href} key={route.href}>
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
      <SiteFooter locale={active} dict={dict} />
    </>
  );
}
