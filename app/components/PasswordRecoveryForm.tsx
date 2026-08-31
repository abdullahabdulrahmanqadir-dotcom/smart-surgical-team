"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import PasswordStrength from "./PasswordStrength";
import { isTurnstileUnavailable, useTurnstile } from "./Turnstile";
import { IconArrowRight, IconCheck, IconLock, IconMail } from "./icons";
import { clearFailures, formatWait, registerFailure, throttleWait } from "../lib/auth-throttle";
import { assessPassword, isLeakedPasswordError } from "../lib/password-strength";
import { fill, type Dictionary } from "../lib/dictionaries";

type View = "request" | "sent" | "update" | "complete";
type Message = { type: "error"; text: string } | null;

export default function PasswordRecoveryForm({ locale, t, passwordT, protectionT }: { locale: string; t: Dictionary["recovery"]; passwordT: Dictionary["password"]; protectionT: Dictionary["protection"] }) {
  const [view, setView] = useState<View>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const turnstile = useTurnstile(locale);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const client = getSupabaseBrowserClient();
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setMessage(null);
          setView("update");
        }
      });
      unsubscribe = data.subscription.unsubscribe;
    } catch {
      // The form surfaces a useful configuration message when it is submitted.
    }

    return () => unsubscribe?.();
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const submittedEmail = String(new FormData(form).get("email") ?? "").trim();

    // The reset endpoint sends mail to whatever address the requester supplies,
    // which makes it the easiest form on the site to abuse. It gets the same
    // back-off and the same bot check as sign-in.
    const wait = throttleWait("recover", submittedEmail);
    if (wait > 0) return setMessage({ type: "error", text: fill(protectionT.lockedOut, { wait: formatWait(wait, locale) }) });

    let captchaToken: string | undefined;
    try {
      captchaToken = await turnstile.getToken();
    } catch (error) {
      return setMessage({ type: "error", text: isTurnstileUnavailable(error) ? protectionT.unavailable : t.sendError });
    }

    setLoading(true);
    setMessage(null);

    try {
      const client = getSupabaseBrowserClient();
      const { error } = await client.auth.resetPasswordForEmail(submittedEmail, {
        captchaToken,
        redirectTo: `${window.location.origin}/${locale}/forget-password`,
      });
      if (error) throw error;

      // Counted even on success. Supabase answers identically whether or not
      // the address exists, so the number of requests is the only thing here
      // worth limiting.
      registerFailure("recover", submittedEmail);
      setEmail(submittedEmail);
      setView("sent");
    } catch (error) {
      const text = error instanceof Error ? error.message : t.sendError;
      registerFailure("recover", submittedEmail);
      setMessage({
        type: "error",
        text: /configuration is missing/i.test(text)
          ? t.unavailable
          : text,
      });
    } finally {
      turnstile.reset();
      setLoading(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const confirmation = String(new FormData(form).get("confirmation") ?? "");
    if (!assessPassword(password).acceptable) {
      setMessage({ type: "error", text: passwordT.tooWeak });
      return;
    }
    if (password !== confirmation) {
      setMessage({ type: "error", text: t.mismatch });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const client = getSupabaseBrowserClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      clearFailures("recover", email);
      setView("complete");
    } catch (error) {
      const text = error instanceof Error ? error.message : t.updateError;
      setMessage({
        type: "error",
        text: isLeakedPasswordError(text) ? passwordT.leaked : text,
      });
    } finally {
      setLoading(false);
    }
  }

  if (view === "sent") {
    return (
      <div className="auth-card recovery-card">
        <div className="recovery-icon" aria-hidden="true"><IconMail size={25} /></div>
        <div className="auth-card-head">
          <span className="auth-kicker">{t.sentKicker}</span>
          <h1>{t.checkEmail}</h1>
          <p>{fill(t.sentBody, { email })}</p>
        </div>
        <div className="recovery-note"><IconCheck size={18} /><span>{t.oneUse}</span></div>
        <button className="btn btn-secondary recovery-action" type="button" onClick={() => setView("request")}>{t.sendAnother}</button>
        <p className="auth-switch">{t.remembered} <Link href={`/${locale}/sign-in`}>{t.backSignIn}</Link></p>
      </div>
    );
  }

  if (view === "complete") {
    return (
      <div className="auth-card recovery-card">
        <div className="recovery-icon is-complete" aria-hidden="true"><IconCheck size={26} /></div>
        <div className="auth-card-head">
          <span className="auth-kicker">{t.updatedKicker}</span>
          <h1>{t.completeTitle}</h1>
          <p>{t.completeBody}</p>
        </div>
        <Link className="btn btn-primary recovery-action" href={`/${locale}/sign-in`}>{t.continueSignIn} <IconArrowRight size={18} /></Link>
      </div>
    );
  }

  const isUpdating = view === "update";
  return (
    <div className="auth-card recovery-card">
      <div className="auth-card-head">
        <span className="auth-kicker">{isUpdating ? t.chooseKicker : t.accountRecovery}</span>
        <h1>{isUpdating ? t.setPassword : t.resetPassword}</h1>
        <p>{isUpdating ? t.chooseIntro : t.resetIntro}</p>
      </div>

      {isUpdating ? (
        <form className="auth-form recovery-form" onSubmit={updatePassword}>
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden aria-hidden="true" tabIndex={-1} />
          <div className="form-field">
            <label htmlFor="password">{t.newPassword} <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconLock size={18} /><input id="password" name="password" type="password" autoComplete="new-password" placeholder={t.passwordPlaceholder} value={password} onChange={(event) => { setPassword(event.target.value); setMessage(null); }} required /></div>
            <PasswordStrength value={password} t={passwordT} />
          </div>
          <div className="form-field">
            <label htmlFor="confirmation">{t.confirmPassword} <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconLock size={18} /><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" placeholder={t.confirmationPlaceholder} required /></div>
          </div>
          {message && <p className="form-message is-error" role="alert">{message.text}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? t.updating : t.updatePassword}{!loading && <IconArrowRight size={18} />}</button>
        </form>
      ) : (
        <form className="auth-form recovery-form" onSubmit={requestReset}>
          <div className="form-field">
            <label htmlFor="email">{t.emailAddress} <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconMail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder={t.emailPlaceholder} required /></div>
          </div>
          {message && <p className="form-message is-error" role="alert">{message.text}</p>}
          {turnstile.widget}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? t.sending : t.sendLink}{!loading && <IconArrowRight size={18} />}</button>
        </form>
      )}

      {!isUpdating && <p className="auth-switch">{t.remembered} <Link href={`/${locale}/sign-in`}>{t.backSignIn}</Link></p>}
    </div>
  );
}
