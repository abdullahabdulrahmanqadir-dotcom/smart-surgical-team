"use client";

import { useRef, type FormEvent } from "react";
import { fill, type Dictionary } from "../lib/dictionaries";

export default function NewsletterSignup({ recipient, t }: { recipient: string; t: Dictionary["newsletter"] }) {
  const emailInput = useRef<HTMLInputElement>(null);

  function requestSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailInput.current?.value.trim();
    if (!email) return;
    const subject = encodeURIComponent(t.subject);
    const body = encodeURIComponent(fill(t.message, { email }));
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  return (
    <form className="footer-newsletter" aria-labelledby="footer-newsletter-title" onSubmit={requestSignup}>
      <h3 id="footer-newsletter-title">{t.title}</h3>
      <label htmlFor="footer-newsletter-email">{t.email}</label>
      <input
        id="footer-newsletter-email"
        ref={emailInput}
        type="email"
        dir="ltr"
        autoComplete="email"
        aria-describedby="footer-newsletter-help"
        maxLength={254}
        required
      />
      <button type="submit" className="btn btn-primary">{t.request}</button>
      <small id="footer-newsletter-help">{t.help}</small>
    </form>
  );
}
