"use client";

import { useEffect } from "react";

/**
 * What a reader sees when a render fails.
 *
 * Next's built-in boundary is a bare line of text on a white page, which is
 * indistinguishable from the site having loaded and rendered nothing — readers
 * read it as "the site is broken" and leave, because nothing tells them a
 * reload would fix it. Every failure path here ends in a page that says what
 * happened and carries the retry itself.
 *
 * Deliberately self-contained: the strings are inlined rather than read from
 * `app/lib/dictionaries`, which would pull every locale's full dictionary into
 * the client bundle for a screen almost nobody sees, and the styles are inline
 * so this still renders if the stylesheet is the thing that failed to load.
 */

const COPY = {
  en: {
    dir: "ltr" as const,
    title: "This page did not load",
    body: "Something went wrong on our side. Trying again usually fixes it.",
    retry: "Try again",
    home: "Go to the homepage",
  },
  ar: {
    dir: "rtl" as const,
    title: "لم يتم تحميل هذه الصفحة",
    body: "حدث خطأ لدينا. عادةً ما تنجح إعادة المحاولة.",
    retry: "إعادة المحاولة",
    home: "الذهاب إلى الصفحة الرئيسية",
  },
};

/** Read from the URL rather than a prop: an error boundary has no params. */
function localeFromPath(): keyof typeof COPY {
  if (typeof window === "undefined") return "en";
  return window.location.pathname.startsWith("/ar") ? "ar" : "en";
}

export default function ErrorState({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // withholds from the browser. Without it a production report is unusable.
    console.error("Render failed", error.digest ?? "", error);
  }, [error]);

  const t = COPY[localeFromPath()];

  return (
    <div
      dir={t.dir}
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center",
        font: '16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: "28rem" }}>
        <h1 style={{ margin: "0 0 .75rem", fontSize: "1.5rem", fontWeight: 600 }}>{t.title}</h1>
        <p style={{ margin: "0 0 1.75rem", opacity: 0.75 }}>{t.body}</p>
        <div style={{ display: "flex", gap: ".75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            // `reset` re-renders the failed segment. A hard reload is the
            // fallback for the case where the boundary itself is what broke.
            onClick={() => { try { reset(); } catch { window.location.reload(); } }}
            style={{ padding: ".7rem 1.6rem", border: 0, borderRadius: "999px", background: "#167a78", color: "#fff", font: "inherit", fontWeight: 600, cursor: "pointer" }}
          >
            {t.retry}
          </button>
          <a
            href={t.dir === "rtl" ? "/ar" : "/en"}
            style={{ padding: ".7rem 1.6rem", borderRadius: "999px", border: "1px solid currentColor", font: "inherit", fontWeight: 600, textDecoration: "none", color: "inherit", opacity: 0.8 }}
          >
            {t.home}
          </a>
        </div>
      </div>
    </div>
  );
}
