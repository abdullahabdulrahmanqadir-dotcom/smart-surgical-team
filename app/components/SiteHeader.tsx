"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark, IconClose, IconMenu, IconMoon, IconSun } from "./icons";
import LanguageSwitcher from "./LanguageSwitcher";
import { localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";

export default function SiteHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const home = localePath(locale);

  // Unbuilt Phase 1 pages still point to their home-page sections. Topics is a
  // real route now, and all paths remain useful when the header is rendered on
  // a nested page.
  const navLinks: [string, string][] = [
    [dict.nav.topics, localePath(locale, "topics")],
    [dict.nav.events, localePath(locale, "events")],
    [dict.nav.team, `${home}#team`],
    [dict.nav.contact, `${home}#contact`],
  ];

  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    return () => document.body.classList.remove("nav-open");
  }, [menuOpen]);

  function toggleTheme() {
    // The active mode lives on <html data-theme>, set before paint by the inline
    // script in the layout — read it from there so there is nothing to hydrate.
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sst-theme", next);
    } catch {
      /* storage unavailable — the toggle still works for this session */
    }
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          className="brand"
          href={home}
          aria-label={`${dict.brand.name}, ${dict.nav.home}`}
        >
          <BrandMark />
          <span className="brand-name">
            {dict.brand.name}
            <small>Head &amp; Neck Education</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Main">
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <LanguageSwitcher locale={locale} label={dict.nav.languageLabel} />

          <button
            type="button"
            className="icon-button theme-toggle"
            onClick={toggleTheme}
            aria-label="Switch colour mode"
            title="Switch colour mode"
          >
            <IconMoon className="theme-icon-light" />
            <IconSun className="theme-icon-dark" />
          </button>

          <Link className="btn btn-ghost header-signin" href={`${home}#contact`}>
            {dict.nav.signIn}
          </Link>
          {/* The brief specifies "Explore the Library" as the primary action and
              explicitly rules out a join-focused CTA on the home page. */}
          <Link className="btn btn-primary header-cta" href={`${home}#library`}>
            {dict.cta.exploreLibrary}
          </Link>

          <button
            type="button"
            className="icon-button menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? dict.nav.close : dict.nav.menu}
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      <div className="mobile-nav" id="mobile-nav" hidden={!menuOpen}>
        {navLinks.map(([label, href]) => (
          <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
            {label}
          </Link>
        ))}
        <div className="mobile-language">
          <span>{dict.nav.languageLabel}</span>
          <LanguageSwitcher locale={locale} label={dict.nav.languageLabel} />
        </div>
        <div className="mobile-nav-actions">
          <Link
            className="btn btn-ghost"
            href={`${home}#contact`}
            onClick={() => setMenuOpen(false)}
          >
            {dict.nav.signIn}
          </Link>
          <Link
            className="btn btn-primary"
            href={`${home}#library`}
            onClick={() => setMenuOpen(false)}
          >
            {dict.cta.exploreLibrary}
          </Link>
        </div>
      </div>
    </header>
  );
}
