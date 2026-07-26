"use client";

import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_META, swapLocaleInPath, type Locale } from "../lib/i18n";

/**
 * Switching language keeps the visitor on the same page by swapping only the
 * locale segment of the path. Rendered as real links so it works without JS and
 * so each language is crawlable.
 */
export default function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;

  return (
    <div className="lang-switch" role="group" aria-label={label}>
      {LOCALES.map((code) => {
        const meta = LOCALE_META[code];
        const active = code === locale;

        return (
          <a
            key={code}
            href={swapLocaleInPath(pathname, code)}
            className={active ? "is-active" : undefined}
            lang={meta.htmlLang}
            // The switcher is navigation, not a toggle group, so the active
            // language is marked as the current page rather than "pressed".
            aria-current={active ? "true" : undefined}
            title={meta.label}
          >
            {meta.short}
          </a>
        );
      })}
    </div>
  );
}
