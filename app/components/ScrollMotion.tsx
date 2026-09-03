"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealSelectors = [
  ".hero-copy > *",
  ".anatomy-hero",
  ".credential-strip",
  ".section-head",
  ".topic-card",
  // The events panel is streamed through a Suspense boundary. Mutating it
  // before React hydrates that boundary causes a hydration mismatch (and can
  // make Vite's error transport repeatedly fail), so animate only panels that
  // are part of the initial hydrated tree.
  ".dashboard > .panel:not(#events)",
  ".team-feature-panel",
  ".team-feature-card",
  ".introduction-stage",
  ".vision-panel",
  ".cta-inner",
  ".section-research-preview",
  ".research-feature",
  ".research-archive-heading",
  ".research-row",
  ".research-card:not(.is-skeleton)",
  ".research-team-heading",
  ".research-member",
  ".about-statement",
  ".team-group-head",
  ".team-profile",
  ".about-closing",
  ".contact-intro",
  ".contact-details",
  ".contact-location",
  ".contact-map-section",
  ".events-hero-copy > *",
  ".featured-event",
  ".events-collection-heading",
  ".event-group",
  ".event-row",
  ".event-detail-hero-inner > *",
  ".event-detail-content > *",
  ".event-faculty .section-head",
  ".event-faculty-grid > article",
  ".library-index-head",
  ".content-case-card:not(.is-skeleton)",
  ".content-heading > *",
  ".content-main > *",
  ".content-aside > *",
  ".related-section .section-mini-head",
  ".related-card:not(.is-skeleton)",
  ".news-detail-heading > *",
  ".news-detail-cover",
  ".news-detail-summary",
  ".news-detail-body > *",
  ".news-related",
  ".news-more .section-mini-head",
  ".news-more-card",
  ".posters-intro > *",
  ".poster-feature",
  ".poster-archive-heading",
  ".poster-card",
  ".poster-detail-heading > *",
  ".poster-display",
  ".poster-written-details > *",
  ".research-detail-heading > *",
  ".research-detail-main > *",
  ".research-detail-aside > *",
  ".legal-page > header",
  ".legal-page > article > section",
  ".profile-identity",
  ".profile-welcome",
  ".profile-panel",
];

export default function ScrollMotion() {
  // Keyed to the path because the locale layout persists across client-side
  // navigation. Re-run discovery for the new page while keeping one shared
  // controller for every public route.
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = Array.from(new Set(revealSelectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)))));
    if (!elements.length) return;

    let observer: IntersectionObserver | null = null;
    let frame = 0;
    const revealInView = () => {
      elements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight * .93 && bounds.bottom > 0) element.classList.add("is-revealed");
        else if (bounds.top >= window.innerHeight) element.classList.remove("is-revealed");
      });
    };
    const updateScrollPosition = () => {
      frame = 0;
      const currentScrollY = window.scrollY;
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(currentScrollY / scrollable, 0), 1);
      document.documentElement.style.setProperty("--page-scroll", progress.toFixed(4));
      const heroScroll = Math.min(currentScrollY, window.innerHeight);
      document.documentElement.style.setProperty("--hero-copy-shift", `${heroScroll * -0.042}px`);
      document.documentElement.style.setProperty("--hero-art-shift", `${heroScroll * 0.026}px`);
      if (!observer) revealInView();
    };
    const scheduleScrollUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollPosition);
    };
    updateScrollPosition();
    window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
    window.addEventListener("resize", scheduleScrollUpdate, { passive: true });

    // Built before anything is hidden. Hiding first and constructing after left
    // a window in which a throw here — an unsupported option, a hostile
    // environment — stranded the whole page at `opacity: 0` with no observer
    // and no timer to bring it back.
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
            } else if (entry.boundingClientRect.top >= window.innerHeight) {
              entry.target.classList.remove("is-revealed");
            }
          });
        },
        { rootMargin: "0px 0px -7%", threshold: 0.12 },
      );
    }

    const restore = () => {
      delete document.documentElement.dataset.motionReady;
      elements.forEach((element) => {
        delete element.dataset.scrollReveal;
        delete element.dataset.revealStyle;
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
        if (element.matches(".topic-card, .team-feature-card, .research-member, .research-card, .content-case-card, .event-row, .event-faculty-grid > article, .related-card, .news-more-card, .poster-card")) {
          element.dataset.revealStyle = position % 2 ? "right" : "left";
        } else if (element.matches(".anatomy-hero, .research-preview-card, .introduction-stage, .featured-event, .news-detail-cover, .poster-feature, .poster-display")) {
          element.dataset.revealStyle = "scale";
        }
        element.style.setProperty("--reveal-delay", `${Math.min(position * 65, 260)}ms`);
      });
      document.documentElement.dataset.motionReady = "true";
      // IntersectionObserver callbacks are not guaranteed to arrive promptly on
      // every mobile browser during a client-side navigation.  The reveal effect
      // must never become a condition for reading the page, so reveal anything
      // currently in view shortly afterwards as a safe fallback.
      fallbackTimer = window.setTimeout(() => {
        revealInView();
      }, 900);
      if (observer) elements.forEach((element) => observer?.observe(element));
      else revealInView();
    } catch {
      // Whatever failed, it must not cost the reader the page.
      window.clearTimeout(fallbackTimer);
      observer?.disconnect();
      restore();
      return;
    }

    return () => {
      window.removeEventListener("scroll", scheduleScrollUpdate);
      window.removeEventListener("resize", scheduleScrollUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--page-scroll");
      document.documentElement.style.removeProperty("--hero-copy-shift");
      document.documentElement.style.removeProperty("--hero-art-shift");
      window.clearTimeout(fallbackTimer);
      observer?.disconnect();
      restore();
    };
  }, [pathname]);

  return null;
}
