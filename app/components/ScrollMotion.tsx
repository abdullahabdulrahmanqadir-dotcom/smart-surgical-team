"use client";

import { useEffect } from "react";

const revealSelectors = [
  ".credential-strip",
  ".section-head",
  ".topic-card",
  ".dashboard > .panel",
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
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = revealSelectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
    elements.forEach((element, index) => {
      element.dataset.scrollReveal = "";
      element.style.setProperty("--reveal-delay", `${Math.min((index % 4) * 70, 210)}ms`);
    });

    document.documentElement.dataset.motionReady = "true";
    // IntersectionObserver callbacks are not guaranteed to arrive promptly on
    // every mobile browser during a client-side navigation.  The reveal effect
    // must never become a condition for reading the page, so make all sections
    // visible shortly afterwards as a safe fallback.
    const revealAll = () => elements.forEach((element) => element.classList.add("is-revealed"));
    const fallbackTimer = window.setTimeout(revealAll, 700);
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
    elements.forEach((element) => observer.observe(element));

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
      delete document.documentElement.dataset.motionReady;
      elements.forEach((element) => {
        delete element.dataset.scrollReveal;
        element.style.removeProperty("--reveal-delay");
        element.classList.remove("is-revealed");
      });
    };
  }, []);

  return null;
}
