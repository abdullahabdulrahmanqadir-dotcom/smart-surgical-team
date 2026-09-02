"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealSelectors = [
  ".credential-strip",
  ".section-head",
  ".topic-card",
  // The events panel is streamed through a Suspense boundary. Mutating it
  // before React hydrates that boundary causes a hydration mismatch (and can
  // make Vite's error transport repeatedly fail), so animate only panels that
  // are part of the initial hydrated tree.
  ".dashboard > .panel:not(#events)",
  ".team-feature-panel",
  ".vision-panel",
  ".cta-inner",
  ".section-research-preview",
  ".research-feature",
  ".research-archive-heading",
  ".research-row",
  ".research-team-heading",
  ".research-member",
  ".about-statement",
  ".team-group-head",
  ".team-profile",
  ".about-closing",
  ".contact-intro",
  ".contact-details",
  ".contact-location",
  ".profile-identity",
  ".profile-welcome",
  ".profile-panel",
];

export default function ScrollMotion() {
  // Keyed to the path, because this component is not remounted on a
  // client-side navigation: every page renders `<ScrollMotion />` at the same
  // position under the layout, so React reuses the instance and a `[]`
  // dependency list ran the effect once for the whole session. The first page
  // animated; every page after it silently kept `data-motion-ready` set on
  // <html> and revealed nothing, because its own sections were never marked.
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Nothing here may become a condition for reading the page. Where the API
    // is missing there is no way to reveal what would be hidden, so the reveal
    // is skipped entirely and the content simply stays visible.
    if (typeof IntersectionObserver === "undefined") return;

    const elements = revealSelectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
    if (!elements.length) return;

    // Built before anything is hidden. Hiding first and constructing after left
    // a window in which a throw here — an unsupported option, a hostile
    // environment — stranded the whole page at `opacity: 0` with no observer
    // and no timer to bring it back.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7%", threshold: 0.12 },
    );

    const reveal = () => elements.forEach((element) => element.classList.add("is-revealed"));
    const restore = () => {
      delete document.documentElement.dataset.motionReady;
      elements.forEach((element) => {
        delete element.dataset.scrollReveal;
        element.style.removeProperty("--reveal-delay");
        element.classList.remove("is-revealed");
      });
    };

    let fallbackTimer = 0;
    try {
      // Stagger by position among revealing siblings, not by position in this
      // flat list. `index % 4` gave a lone section an arbitrary delay
      // depending on what happened to precede it, and broke a row of four
      // cards into an order that had nothing to do with how it reads. Grouped
      // by parent, a row cascades across and a standalone section starts at
      // once.
      const seenPerParent = new Map<Element | null, number>();
      elements.forEach((element) => {
        const parent = element.parentElement;
        const position = seenPerParent.get(parent) ?? 0;
        seenPerParent.set(parent, position + 1);
        element.dataset.scrollReveal = "";
        element.style.setProperty("--reveal-delay", `${Math.min(position * 65, 260)}ms`);
      });
      document.documentElement.dataset.motionReady = "true";
      // IntersectionObserver callbacks are not guaranteed to arrive promptly on
      // every mobile browser during a client-side navigation.  The reveal effect
      // must never become a condition for reading the page, so make all sections
      // visible shortly afterwards as a safe fallback.
      fallbackTimer = window.setTimeout(reveal, 700);
      elements.forEach((element) => observer.observe(element));
    } catch {
      // Whatever failed, it must not cost the reader the page.
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
      restore();
      return;
    }

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
      restore();
    };
  }, [pathname]);

  return null;
}
