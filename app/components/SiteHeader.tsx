"use client";

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

  // In-page anchors until the Phase 1 routes exist; each becomes a real
  // locale-prefixed path as its page lands.
  const navLinks: [string, string][] = [
    [dict.nav.library, "#library"],
    [dict.nav.topics, "#topics"],
    [dict.nav.webinars, "#webinars"],
    [dict.nav.team, "#team"],
    [dict.nav.contact, "#contact"],
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
        <a
          className="brand"
          href={localePath(locale)}
          aria-label={`${dict.brand.name}, ${dict.nav.home}`}
        >
          <BrandMark />
          <span className="brand-name">
            {dict.brand.name}
            <small>Head &amp; Neck Education</small>
          </span>
        </a>

        <nav className="primary-nav" aria-label="Main">
          {navLinks.map(([label, href]) => (
            <a key={label} href={href}>
              {label}
            </a>
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

          <a className="btn btn-ghost header-signin" href="#contact">
            {dict.nav.signIn}
          </a>
          {/* The brief specifies "Explore the Library" as the primary action and
              explicitly rules out a join-focused CTA on the home page. */}
          <a className="btn btn-primary header-cta" href="#library">
            {dict.cta.exploreLibrary}
          </a>

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
          <a key={label} href={href} onClick={() => setMenuOpen(false)}>
            {label}
          </a>
        ))}
        <div className="mobile-nav-actions">
          <a className="btn btn-ghost" href="#contact" onClick={() => setMenuOpen(false)}>
            {dict.nav.signIn}
          </a>
          <a className="btn btn-primary" href="#library" onClick={() => setMenuOpen(false)}>
            {dict.cta.exploreLibrary}
          </a>
        </div>
      </div>
    </header>
  );
}
