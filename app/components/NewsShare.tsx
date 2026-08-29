"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "../lib/dictionaries";

/**
 * Share actions for a news item.
 *
 * The URL is read from the browser rather than rebuilt from an origin constant,
 * so a link shared from a preview deployment points at that deployment instead
 * of silently at production.
 *
 * Copy has a real fallback: `navigator.clipboard` is unavailable on insecure
 * origins and can be refused outright, and a copy button that quietly does
 * nothing is worse than none at all — so a refusal selects the URL in a
 * temporary field and lets the browser's own copy command take over.
 */
export default function NewsShare({ title, t }: { title: string; t: Dictionary["news"] }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function currentUrl() {
    return typeof window === "undefined" ? "" : window.location.href;
  }

  /**
   * Confirms the copy, then returns the button to its resting label.
   *
   * Without the reset the button reads "copied" for the rest of the visit, so a
   * second copy — the reader shares it somewhere else — confirms nothing and
   * looks broken. The pending timer is cleared first so rapid clicks restart the
   * window rather than stacking timers that each fight over the label. Set from
   * an event handler, never an effect.
   */
  function confirmCopied() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setCopied(true);
    resetTimer.current = setTimeout(() => setCopied(false), 2200);
  }

  async function copy() {
    const url = currentUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      confirmCopied();
      return;
    } catch { /* fall through to the selection route below */ }
    try {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      document.body.removeChild(field);
      confirmCopied();
    } catch { /* nothing further to try; the button simply does not confirm */ }
  }

  // Built at click time, not render time: `window` does not exist during the
  // server render, and the share targets need the real page URL.
  function open(target: "facebook" | "x" | "whatsapp") {
    const url = currentUrl();
    if (!url) return;
    const encoded = encodeURIComponent(url);
    const text = encodeURIComponent(title);
    const href = target === "facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
      : target === "x" ? `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`
      : `https://wa.me/?text=${text}%20${encoded}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return <div className="news-share">
    <span className="news-share-label">{t.shareLabel}</span>
    <div className="news-share-actions">
      <button type="button" onClick={() => void copy()} aria-live="polite">{copied ? t.copied : t.copyLink}</button>
      <button type="button" onClick={() => open("facebook")} aria-label={t.shareFacebook}>Facebook</button>
      <button type="button" onClick={() => open("x")} aria-label={t.shareX}>X</button>
      <button type="button" onClick={() => open("whatsapp")} aria-label={t.shareWhatsApp}>WhatsApp</button>
    </div>
  </div>;
}
