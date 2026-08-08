"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IconChevronDown, IconGlobe } from "./icons";
import { LOCALES, LOCALE_META, swapLocaleInPath, type Locale } from "../lib/i18n";

const flagClass: Record<Locale, string> = {
  en: "flag-us",
  ar: "flag-iraq",
};

/**
 * A small navigation menu, modelled on the team's original language panel.
 * Links keep locale routes crawlable and preserve the current page on switch.
 */
export default function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // The header renders this switcher twice (desktop bar and mobile nav), so the
  // dropdown id must be per-instance or aria-controls resolves to the wrong menu.
  const menuId = useId();

  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className={`language-menu${open ? " is-open" : ""}`} ref={menuRef}>
      <button
        className="language-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <IconGlobe className="language-trigger-icon" size={18} />
        <span className="language-trigger-text">{label}</span>
        <IconChevronDown className="language-trigger-chevron" size={15} />
      </button>

      <div className="language-dropdown" id={menuId} role="menu" hidden={!open}>
        {LOCALES.map((code) => {
          const meta = LOCALE_META[code];
          const active = code === locale;
          return (
            <a
              key={code}
              href={swapLocaleInPath(pathname, code)}
              className={active ? "is-active" : undefined}
              lang={meta.htmlLang}
              aria-current={active ? "page" : undefined}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className={`language-flag ${flagClass[code]}`} aria-hidden="true" />
              <span>{meta.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
