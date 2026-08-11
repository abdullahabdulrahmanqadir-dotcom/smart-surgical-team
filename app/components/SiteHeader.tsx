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

// One dropdown, used by both the desktop bar and the mobile sheet. `open` is
// controlled so that choosing a link closes it; the functional update stops a
// menu that is closing from clearing a different one that just opened.
function NavMenu({ id, label, links, menuClass, dropdownClass, iconSize, openMenu, setOpenMenu, onNavigate }: {
  id: string;
  label: string;
  links: [string, string][];
  menuClass: string;
  dropdownClass: string;
  iconSize: number;
  openMenu: string | null;
  setOpenMenu: (update: (current: string | null) => string | null) => void;
  onNavigate?: () => void;
}) {
  return (
    <details
      className={menuClass}
      data-nav-menu
      open={openMenu === id}
      onToggle={(event) => {
        const isOpen = event.currentTarget.open;
        setOpenMenu((current) => (isOpen ? id : current === id ? null : current));
      }}
    >
      <summary>{label}<IconChevronDown size={iconSize}/></summary>
      <div className={dropdownClass}>
        {links.map(([text, href]) => (
          <Link key={text} href={href} onClick={() => { setOpenMenu(() => null); onNavigate?.(); }}>{text}</Link>
        ))}
      </div>
    </details>
  );
}

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
  // A <details> menu stays open across a client-side navigation, so choosing an
  // item left the dropdown hanging open over the new page. Driving `open` from
  // state lets a chosen link close it, and keeps one menu open at a time.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [member, setMember] = useState<HeaderMember | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const home = localePath(locale);

  // Unbuilt Phase 1 pages still point to their home-page sections. Topics is a
  // real route now, and all paths remain useful when the header is rendered on
  // a nested page.
  // Content, Research and Posters are all published output, so they sit
  // together under one menu rather than spending three slots in the bar.
  const publicationLinks: [string, string][] = [
    [dict.nav.topics, localePath(locale, "topics")],
    [dict.nav.research, localePath(locale, "research")],
    [dict.nav.posters, localePath(locale, "posters")],
  ];
  const navLinks: [string, string][] = [
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

  // Clicking anywhere else, or pressing Escape, dismisses an open menu — the
  // same expectation any dropdown sets.
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (target as Element).closest?.("[data-nav-menu]")) return;
      setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenMenu(null); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

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
          <NavMenu id="publications" label={dict.nav.publications} links={publicationLinks} menuClass="primary-nav-more" dropdownClass="primary-nav-dropdown" iconSize={15} openMenu={openMenu} setOpenMenu={setOpenMenu}/>
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
          <NavMenu id="about" label={dict.nav.aboutMenu} links={aboutLinks} menuClass="primary-nav-more" dropdownClass="primary-nav-dropdown" iconSize={15} openMenu={openMenu} setOpenMenu={setOpenMenu}/>
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
        <NavMenu id="mobile-publications" label={dict.nav.publications} links={publicationLinks} menuClass="mobile-nav-more" dropdownClass="mobile-nav-submenu" iconSize={16} openMenu={openMenu} setOpenMenu={setOpenMenu} onNavigate={() => setMenuOpen(false)}/>
        {navLinks.map(([label, href]) => (
          <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
            {label}
          </Link>
        ))}
        <NavMenu id="mobile-about" label={dict.nav.aboutMenu} links={aboutLinks} menuClass="mobile-nav-more" dropdownClass="mobile-nav-submenu" iconSize={16} openMenu={openMenu} setOpenMenu={setOpenMenu} onNavigate={() => setMenuOpen(false)}/>
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
