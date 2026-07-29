"use client";

import { FormEvent, useState } from "react";
import { IconArrowRight, IconCheck, IconMail, IconUser } from "./icons";

type FormState = { type: "error" | "success"; text: string } | null;

export default function ContactForm() {
  const [state, setState] = useState<FormState>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setLoading(true);
    setState(null);
    try {
      const response = await fetch("/api/contact", { method: "POST", body: new FormData(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "We could not send your message. Please try again shortly.");

      form.reset();
      setState({ type: "success", text: "Thank you — your message has been received. Our team will be in touch soon." });
    } catch (error) {
      setState({ type: "error", text: error instanceof Error ? error.message : "We could not send your message. Please try again shortly." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <input name="source" type="hidden" value="contact-page" />
      <div className="contact-field-grid">
        <div className="form-field">
          <label htmlFor="contact-name">Your name <span aria-hidden="true">*</span></label>
          <div className="field-control"><IconUser size={18} /><input id="contact-name" name="name" autoComplete="name" placeholder="Dr. Alex Morgan" required /></div>
        </div>
        <div className="form-field">
          <label htmlFor="contact-email">Email address <span aria-hidden="true">*</span></label>
          <div className="field-control"><IconMail size={18} /><input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
        </div>
      </div>
      <div className="form-field contact-message-field">
        <label htmlFor="contact-message">How can we help? <span aria-hidden="true">*</span></label>
        <textarea id="contact-message" name="message" placeholder="Tell us a little about your question or request." required rows={6} />
      </div>
      {state && <p className={`form-message is-${state.type}`} role={state.type === "error" ? "alert" : "status"}>{state.type === "success" && <IconCheck size={17} />}{state.text}</p>}
      <button className="btn btn-primary contact-submit" type="submit" disabled={loading}>{loading ? "Sending message…" : "Send message"}{!loading && <IconArrowRight size={18} />}</button>
    </form>
  );
}
