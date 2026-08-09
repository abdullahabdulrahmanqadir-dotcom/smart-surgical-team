"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { BrandMark, IconChevronDown, IconClose, IconMenu, IconMoon, IconSun, IconUser } from "./icons";
import LanguageSwitcher from "./LanguageSwitcher";
import { localePath, type Locale } from "../lib/i18n";
import type { Dictionary } from "../lib/dictionaries";

type HeaderMember = { name: string; email: string };
type HeaderUser = { id?: string; email?: string; user_metadata?: Record<string, unknown> } | null;

// Mirrors STAFF_ROLES in app/lib/admin-server.ts. The link is a convenience
// only: /admin re-checks the role on the server before showing anything.
const STAFF_ROLES = ["owner", "content_manager", "editor", "contributor"];

function memberFromUser(user: HeaderUser): HeaderMember | null {
  if (!user?.email) return null;
  return { name: String(user.user_metadata?.full_name ?? user.email), email: user.email };
}

export default function SiteHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [member, setMember] = useState<HeaderMember | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const home = localePath(locale);

  // Unbuilt Phase 1 pages still point to their home-page sections. Topics is a
  // real route now, and all paths remain useful when the header is rendered on
  // a nested page.
  const navLinks: [string, string][] = [
    [dict.nav.topics, localePath(locale, "topics")],
    [dict.nav.research, localePath(locale, "research")],
    [dict.nav.posters, localePath(locale, "posters")],
    [dict.nav.events, localePath(locale, "events")],
  ];
  const aboutLinks: [string, string][] = [
    [dict.nav.about, localePath(locale, "about")],
    [dict.nav.contact, localePath(locale, "contact")],
  ];

  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    return () => document.body.classList.remove("nav-open");
  }, [menuOpen]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const client = getSupabaseBrowserClient();
      // Row-level security only ever returns the caller's own profile row, so
      // this reveals nothing beyond whether *you* can open the workspace.
      const apply = async (user: HeaderUser) => {
        if (!active) return;
        setMember(memberFromUser(user));
        if (!user?.id) { setIsStaff(false); return; }
        // The browser client is created without generated database types, so
        // this row arrives untyped.
        const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle() as { data: { role?: string } | null };
        if (active) setIsStaff(STAFF_ROLES.includes(String(data?.role ?? "")));
      };
      void client.auth.getUser().then(({ data }) => apply(data.user));
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        void apply(session?.user ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // Authentication is optional until Supabase public credentials are configured.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

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

  const profilePath = localePath(locale, "profile");
  const initials = member?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const adminPath = localePath(locale, "admin");
  const adminLink = member && isStaff ? (
    <Link className="btn btn-ghost header-admin" href={adminPath}>
      {dict.header.admin}
    </Link>
  ) : null;
  const accountAction = member ? (
    <>
      {adminLink}
      <Link className="btn btn-ghost header-profile" href={profilePath} aria-label={dict.header.openProfile.replace("{name}", member.name)}>
        <span className="header-profile-avatar" aria-hidden="true">{initials || <IconUser size={16} />}</span>
      </Link>
    </>
  ) : (
    <>
      <Link className="btn btn-ghost header-signin" href={localePath(locale, "sign-in")}>
        {dict.nav.signIn}
      </Link>
      <Link className="btn btn-primary header-cta header-signup" href={localePath(locale, "sign-up")}>
        {dict.nav.register}
      </Link>
    </>
  );

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          className="brand"
          href={home}
          aria-label={`${dict.brand.name}, ${dict.nav.home}`}
        >
          <BrandMark size={48} />
          <span className="brand-name">{dict.brand.name}</span>
        </Link>

        <nav className="primary-nav" aria-label={dict.header.mainNavigation}>
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
          <details className="primary-nav-more">
            <summary>{dict.nav.aboutMenu}<IconChevronDown size={15}/></summary>
            <div className="primary-nav-dropdown">
              {aboutLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
            </div>
          </details>
        </nav>

        <div className="header-actions">
          <LanguageSwitcher locale={locale} label={dict.nav.languageLabel} />

          <button
            type="button"
            className="icon-button theme-toggle"
            onClick={toggleTheme}
            aria-label={dict.header.switchColourMode}
            title={dict.header.switchColourMode}
          >
            <IconMoon className="theme-icon-light" />
            <IconSun className="theme-icon-dark" />
          </button>

          {accountAction}

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
        <details className="mobile-nav-more">
          <summary>{dict.nav.aboutMenu}<IconChevronDown size={16}/></summary>
          <div className="mobile-nav-submenu">
            {aboutLinks.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
          </div>
        </details>
        <div className="mobile-language">
          <span>{dict.nav.languageLabel}</span>
          <LanguageSwitcher locale={locale} label={dict.nav.languageLabel} />
        </div>
        <div className="mobile-nav-actions">
          {member ? (
            <>
              {isStaff && <Link className="btn btn-ghost" href={adminPath} onClick={() => setMenuOpen(false)}>{dict.header.admin}</Link>}
              <Link className="btn btn-ghost mobile-profile" href={profilePath} onClick={() => setMenuOpen(false)}>
                <span className="header-profile-avatar" aria-hidden="true">{initials || <IconUser size={16} />}</span>
                <span>{dict.header.profile}</span>
              </Link>
            </>
          ) : <><Link className="btn btn-ghost" href={localePath(locale, "sign-in")} onClick={() => setMenuOpen(false)}>{dict.nav.signIn}</Link><Link className="btn btn-primary header-signup" href={localePath(locale, "sign-up")} onClick={() => setMenuOpen(false)}>{dict.nav.register}</Link></>}
        </div>
      </div>
    </header>
  );
}
