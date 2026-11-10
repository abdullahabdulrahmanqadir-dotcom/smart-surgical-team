"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IconChevronDown } from "./icons";
import { LOCALES, LOCALE_META, swapLocaleInPath, type Locale } from "../lib/i18n";

// No flags. A flag names a country, not a language: a US flag for English is
// wrong for this audience, and no single flag stands for Arabic. Each language
// is named in its own script instead.

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
  const activeMeta = LOCALE_META[locale];
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);

  return (
    <div
      className={`language-menu${open ? " is-open" : ""}`}
      ref={menuRef}
      translate="no"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        className="language-trigger"
        ref={trigger}
        type="button"
        aria-label={`${label}: ${activeMeta.label}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="language-trigger-text" lang={activeMeta.htmlLang}>{activeMeta.label}</span>
        <IconChevronDown className="language-trigger-chevron" size={15} />
      </button>

      <div className="language-dropdown" id={menuId} hidden={!open}>
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
              onClick={() => setOpen(false)}
            >
              <span>{meta.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
