"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconLock, IconMail } from "./icons";
import { fill, type Dictionary } from "../lib/dictionaries";

type View = "request" | "sent" | "update" | "complete";
type Message = { type: "error"; text: string } | null;

export default function PasswordRecoveryForm({ locale, t }: { locale: string; t: Dictionary["recovery"] }) {
  const [view, setView] = useState<View>("request");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(null);

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
    setLoading(true);
    setMessage(null);

    try {
      const client = getSupabaseBrowserClient();
      const { error } = await client.auth.resetPasswordForEmail(submittedEmail, {
        redirectTo: `${window.location.origin}/${locale}/forget-password`,
      });
      if (error) throw error;

      setEmail(submittedEmail);
      setView("sent");
    } catch (error) {
      const text = error instanceof Error ? error.message : t.sendError;
      setMessage({
        type: "error",
        text: /configuration is missing/i.test(text)
          ? t.unavailable
          : text,
      });
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
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
      setView("complete");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t.updateError,
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
          <div className="form-field">
            <label htmlFor="password">{t.newPassword} <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconLock size={18} /><input id="password" name="password" type="password" autoComplete="new-password" placeholder={t.passwordPlaceholder} minLength={8} required /></div>
          </div>
          <div className="form-field">
            <label htmlFor="confirmation">{t.confirmPassword} <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconLock size={18} /><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" placeholder={t.confirmationPlaceholder} minLength={8} required /></div>
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
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? t.sending : t.sendLink}{!loading && <IconArrowRight size={18} />}</button>
        </form>
      )}

      {!isUpdating && <p className="auth-switch">{t.remembered} <Link href={`/${locale}/sign-in`}>{t.backSignIn}</Link></p>}
    </div>
  );
}
