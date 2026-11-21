"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "../lib/dictionaries";
import { fill } from "../lib/dictionaries";
import { localePath, type Locale } from "../lib/i18n";
import { REPLY_WITHIN_WORKING_DAYS } from "../lib/patient-questions";
import { IconCheck, IconMail } from "./icons";

type AskCopy = Dictionary["ask"];
type State = "reading" | "ready" | "confirming" | "confirmed" | "already" | "expired" | "invalid" | "error";

/**
 * The page behind the emailed confirmation link.
 *
 * The token is read from the URL fragment and then removed from the address
 * bar, so it is never sent to the server with the page request, never kept in
 * history, and never confirmed just because something opened the link: a
 * person has to press the button.
 */
export default function ConfirmQuestionEmail({ locale, t }: { locale: Locale; t: AskCopy }) {
  const token = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<State>("reading");

  useEffect(() => {
    const value = window.location.hash.slice(1);
    token.current = /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    // Reading the fragment can only happen after hydration, so this one
    // state change on mount is the point of the effect.
    setState(token.current ? "ready" : "invalid");
  }, []);

  useEffect(() => {
    if (state !== "reading" && state !== "ready" && state !== "confirming") heading.current?.focus();
  }, [state]);

  async function confirm() {
    if (!token.current || state === "confirming") return;
    setState("confirming");
    try {
      const response = await fetch("/api/questions/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.current }),
      });
      const result = await response.json().catch(() => null) as { status?: string } | null;
      const status = result?.status;
      setState(status === "confirmed" || status === "already" || status === "expired" || status === "invalid" ? status : "error");
    } catch {
      setState("error");
    }
  }

  const days = String(REPLY_WITHIN_WORKING_DAYS);
  const done = state === "confirmed" || state === "already";
  const title = done ? t.confirmedTitle
    : state === "expired" ? t.expiredTitle
      : state === "invalid" ? t.invalidTitle
        : t.confirmTitle;
  const body = state === "confirmed" ? fill(t.confirmedBody, { days })
    : state === "already" ? t.alreadyBody
      : state === "expired" ? t.expiredBody
        : state === "invalid" ? t.invalidBody
          : t.confirmBody;

  return (
    <section className={`ask-card ask-confirm${done ? " is-done" : ""}`} aria-labelledby="ask-confirm-title" aria-busy={state === "reading"}>
      <span className="ask-sent-mark" aria-hidden="true">{done ? <IconCheck size={26} /> : <IconMail size={24} />}</span>
      <h1 id="ask-confirm-title" ref={heading} tabIndex={-1}>{title}</h1>
      <p>{body}</p>
      {state === "error" && <p className="form-message is-error" role="alert">{t.confirmError}</p>}
      {(state === "ready" || state === "confirming" || state === "error") && (
        <button className="btn btn-primary ask-submit" type="button" onClick={confirm} disabled={state === "confirming"} aria-busy={state === "confirming"}>
          {state === "confirming" ? t.confirming : t.confirmButton}
        </button>
      )}
      {(done || state === "expired" || state === "invalid") && (
        <Link className="text-link" href={localePath(locale, "")}>{t.backToSite}</Link>
      )}
    </section>
  );
}
