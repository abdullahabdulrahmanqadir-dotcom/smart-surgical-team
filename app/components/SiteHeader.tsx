"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
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

// <html data-theme> is written by the inline script in the layout and by the
// switch below, so it is the single source of truth for the active mode.
function getThemeIsDark() {
  return document.documentElement.dataset.theme === "dark";
}

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
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
  const [openMenu, setOpenMenu] = useState<"events" | "contact" | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const eventsButton = useRef<HTMLButtonElement>(null);
  const contactButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [member, setMember] = useState<HeaderMember | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  // The switch is positioned by CSS from <html data-theme>; this only mirrors
  // that attribute so the checked state reaches assistive tech. Reading it
  // through useSyncExternalStore keeps the server snapshot (false) and the
  // post-hydration value in step without a state write during render.
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeIsDark, () => false);

  const home = localePath(locale);

  const navLinksBefore = [
    [dict.nav.library, "topics"],
    [dict.nav.research, "research"],
    [dict.nav.posters, "posters"],
  ];

  const eventsLinks: [string, string, string][] = [
    [dict.nav.allEvents, dict.nav.allEventsHint, "events"],
    [dict.nav.breastSummit, dict.nav.breastSummitHint, "breast-summit"],
  ];

  const navLinksAfter = [
    [dict.nav.news, "news"],
    [dict.nav.about, "about"],
  ];

  // Two doors: patients and visitors (address, hours and the question form all
  // live on /contact), and doctors or institutes (the MDT inquiry).
  const contactLinks: [string, string, string][] = [
    [dict.nav.contactUs, dict.nav.contactUsHint, "contact"],
    [dict.nav.mdt, dict.mdt.kicker, "mdt"],
  ];

  function currentPage(path: string) {
    const href = localePath(locale, path);
    if (pathname === href) return "page";
    const library = localePath(locale, "library");
    if (pathname?.startsWith(`${href}/`) ||
      (path === "topics" && (pathname === library || pathname?.startsWith(`${library}/`)))) return "location";
  }

  // A client-side navigation keeps the header mounted, so close the menu here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpenMenu(null); }, [pathname]);

  useEffect(() => {
    if (!openMenu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const button = openMenu === "events" ? eventsButton.current : contactButton.current;
      const menu = button?.parentElement;
      if (menu && !menu.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openMenu]);

  useEffect(() => {
    const desktop = window.matchMedia("(width > 900px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

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
    // script in the layout — read it from there so the knob can never disagree
    // with the rendered colours. `isDark` only mirrors it for assistive tech.
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
      <Link className="header-profile" href={profilePath} aria-label={dict.header.openProfile.replace("{name}", member.name)}>
        <span className="header-profile-avatar" aria-hidden="true">{initials || <IconUser size={16} />}</span>
      </Link>
    </>
  ) : (
    <>
      <Link className="btn btn-ghost header-signin" href={localePath(locale, "sign-in")}>
        {dict.nav.signIn}
      </Link>
      <Link className="btn btn-ghost header-cta header-signup" href={localePath(locale, "sign-up")}>
        {dict.nav.register}
      </Link>
    </>
  );

  function renderDropdown({
    key,
    id,
    label,
    links,
    buttonRef,
    dropdownClassName,
  }: {
    key: "events" | "contact";
    id: string;
    label: string;
    links: [string, string, string][];
    buttonRef: RefObject<HTMLButtonElement | null>;
    dropdownClassName?: string;
  }) {
    const isOpen = openMenu === key;
    const isCurrent = links.some(([, , path]) => currentPage(path)) ? "location" : undefined;
    return (
      <div
        className="primary-nav-more"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpenMenu((current) => (current === key ? null : current));
          }
        }}
      >
        <button
          type="button"
          className="primary-nav-trigger"
          ref={buttonRef}
          aria-expanded={isOpen}
          aria-controls={id}
          data-current={isCurrent}
          onClick={() => setOpenMenu((current) => (current === key ? null : key))}
        >
          {label}
          <IconChevronDown size={15} />
        </button>
        <div
          className={`primary-nav-dropdown primary-nav-contact${dropdownClassName ? ` ${dropdownClassName}` : ""}`}
          id={id}
          hidden={!isOpen}
        >
          {links.map(([itemLabel, hint, path]) => (
            <Link key={path} href={localePath(locale, path)} aria-current={currentPage(path)} onClick={() => setOpenMenu(null)}>
              <span className="primary-nav-dropdown-label">{itemLabel}</span>
              <span className="primary-nav-dropdown-hint">{hint}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <header
      className="site-header"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && openMenu) {
          event.preventDefault();
          const button = openMenu === "events" ? eventsButton.current : contactButton.current;
          setOpenMenu(null);
          button?.focus();
          return;
        }
        if (event.key === "Escape" && menuOpen && !event.defaultPrevented) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="header-utility">
        <div className="header-utility-inner">
          <Link className="header-location" href={localePath(locale, "contact")}>{dict.brand.location}</Link>
          <div className="header-actions">
            <LanguageSwitcher locale={locale} label={dict.nav.languageLabel} />

            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={dict.header.switchColourMode}
              title={dict.header.switchColourMode}
            >
              <span className="theme-toggle-track" aria-hidden="true">
                <IconSun className="theme-toggle-glyph theme-toggle-glyph-sun" size={13} />
                <IconMoon className="theme-toggle-glyph theme-toggle-glyph-moon" size={13} />
                <span className="theme-toggle-knob">
                  <IconSun className="theme-toggle-knob-icon theme-toggle-knob-sun" size={12} />
                  <IconMoon className="theme-toggle-knob-icon theme-toggle-knob-moon" size={12} />
                </span>
              </span>
            </button>

            {accountAction}
          </div>
        </div>
      </div>
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
          {navLinksBefore.map(([label, path]) => (
            <Link key={path} href={localePath(locale, path)} aria-current={currentPage(path)}>{label}</Link>
          ))}
          {renderDropdown({
            key: "events",
            id: "events-menu",
            label: dict.nav.events,
            links: eventsLinks,
            buttonRef: eventsButton,
            dropdownClassName: "primary-nav-events",
          })}
          {navLinksAfter.map(([label, path]) => (
            <Link key={path} href={localePath(locale, path)} aria-current={currentPage(path)}>{label}</Link>
          ))}
          {renderDropdown({
            key: "contact",
            id: "contact-menu",
            label: dict.nav.contactMenu,
            links: contactLinks,
            buttonRef: contactButton,
          })}
        </nav>
        <button
          type="button"
          className="icon-button menu-button"
          ref={menuButton}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? dict.nav.close : dict.nav.menu}
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>
      <nav className="mobile-nav" id="mobile-nav" aria-label={dict.header.mainNavigation} hidden={!menuOpen}>
        {[
          ...navLinksBefore,
          ...eventsLinks.map(([label, , path]) => [label, path]),
          ...navLinksAfter,
          ...contactLinks.map(([label, , path]) => [label, path]),
        ].map(([label, path]) => (
          <Link key={path} href={localePath(locale, path)} aria-current={currentPage(path)} onClick={() => setMenuOpen(false)}>{label}</Link>
        ))}
        {(!member || isStaff) && (
          <div className="mobile-nav-actions">
            {member
              ? <Link className="btn btn-outline" href={adminPath} onClick={() => setMenuOpen(false)}>{dict.header.admin}</Link>
              : <Link className="btn btn-outline" href={localePath(locale, "sign-up")} onClick={() => setMenuOpen(false)}>{dict.nav.register}</Link>}
          </div>
        )}
      </nav>
    </header>
  );
}
