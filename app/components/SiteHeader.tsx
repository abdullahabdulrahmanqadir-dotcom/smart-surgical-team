"use client";

import { useEffect, useState } from "react";
import { BrandMark, IconClose, IconMenu, IconMoon, IconSun } from "./icons";

const navLinks = [
  ["Browse", "#library"],
  ["Topics", "#topics"],
  ["Webinars", "#webinars"],
  ["Team", "#team"],
  ["Contact", "#contact"],
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <a className="brand" href="#top" aria-label="Smart Surgical Team, home">
          <BrandMark />
          <span className="brand-name">
            Smart Surgical Team
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
          <div className="lang-switch" role="group" aria-label="Language">
            <button type="button" className="is-active" aria-pressed="true">
              EN
            </button>
            <button type="button" aria-pressed="false" lang="ckb">
              کوردی
            </button>
          </div>

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
            Sign in
          </a>
          <a className="btn btn-primary header-cta" href="#join">
            Join free
          </a>

          <button
            type="button"
            className="icon-button menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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
            Sign in
          </a>
          <a className="btn btn-primary" href="#join" onClick={() => setMenuOpen(false)}>
            Join free
          </a>
        </div>
      </div>
    </header>
  );
}
