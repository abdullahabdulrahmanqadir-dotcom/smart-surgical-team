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
