"use client";

import { useRef, useState } from "react";
import { IconCheck, IconFacebook, IconLink, IconLinkedin, IconMail, IconTelegram, IconWhatsApp, IconX } from "./icons";
import type { Dictionary } from "../lib/dictionaries";

/** Every network that takes a shared URL through a plain web link. */
type Target = "facebook" | "x" | "whatsapp" | "linkedin" | "telegram" | "email";

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
 *
 * The buttons carry icons rather than names, which keeps the row to one compact
 * line. That makes every accessible name an `aria-label` — and, since the copy
 * button no longer has a caption to change, its confirmation is a tick plus a
 * live region rather than swapped text.
 *
 * Instagram, TikTok and YouTube are deliberately absent: none of them accepts a
 * shared link over a web URL, so a button for them could only look like it
 * worked. A reader on a phone reaches those through their own share sheet.
 */
export default function NewsShare({ title, t }: { title: string; t: Dictionary["news"] }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function currentUrl() {
    return typeof window === "undefined" ? "" : window.location.href;
  }

  /**
   * Confirms the copy, then returns the button to its resting state.
   *
   * Without the reset the tick stays for the rest of the visit, so a second copy
   * — the reader shares it somewhere else — confirms nothing and looks broken.
   * The pending timer is cleared first so rapid clicks restart the window rather
   * than stacking timers that each fight over the state. Set from an event
   * handler, never an effect.
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
  function open(target: Target) {
    const url = currentUrl();
    if (!url) return;
    const encoded = encodeURIComponent(url);
    const text = encodeURIComponent(title);
    const href = target === "facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
      : target === "x" ? `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`
      : target === "whatsapp" ? `https://wa.me/?text=${text}%20${encoded}`
      : target === "linkedin" ? `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
      : target === "telegram" ? `https://t.me/share/url?url=${encoded}&text=${text}`
      : `mailto:?subject=${text}&body=${encoded}`;
    // A mailto: handed to window.open leaves an empty tab behind in several
    // browsers, so the mail client is handed the current window instead.
    if (target === "email") window.location.assign(href);
    else window.open(href, "_blank", "noopener,noreferrer");
  }

  const targets: { target: Target; label: string; Icon: typeof IconFacebook }[] = [
    { target: "facebook", label: t.shareFacebook, Icon: IconFacebook },
    { target: "x", label: t.shareX, Icon: IconX },
    { target: "whatsapp", label: t.shareWhatsApp, Icon: IconWhatsApp },
    { target: "telegram", label: t.shareTelegram, Icon: IconTelegram },
    { target: "linkedin", label: t.shareLinkedIn, Icon: IconLinkedin },
    { target: "email", label: t.shareEmail, Icon: IconMail },
  ];

  return <div className="news-share">
    <span className="news-share-label">{t.shareLabel}</span>
    <div className="news-share-actions">
      <button
        type="button"
        className={copied ? "is-copied" : undefined}
        onClick={() => void copy()}
        aria-label={copied ? t.copied : t.copyLink}
        title={copied ? t.copied : t.copyLink}
      >{copied ? <IconCheck size={17}/> : <IconLink size={17}/>}</button>
      {targets.map(({ target, label, Icon }) =>
        <button key={target} type="button" onClick={() => open(target)} aria-label={label} title={label}><Icon size={17}/></button>)}
    </div>
    {/* The tick is the visible confirmation; this is the same news for a screen
        reader, which would otherwise be told only that a button was pressed. */}
    <span className="news-share-status" role="status">{copied ? t.copied : ""}</span>
  </div>;
}
