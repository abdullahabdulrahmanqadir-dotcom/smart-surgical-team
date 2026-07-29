"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconLock, IconMail } from "./icons";

type View = "request" | "sent" | "update" | "complete";
type Message = { type: "error"; text: string } | null;

export default function PasswordRecoveryForm({ locale }: { locale: string }) {
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
      const text = error instanceof Error ? error.message : "We could not send the reset link. Please try again.";
      setMessage({
        type: "error",
        text: /configuration is missing/i.test(text)
          ? "Password recovery is not available here yet. Please contact the Smart Surgical Team for help."
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
      setMessage({ type: "error", text: "The two passwords do not match. Please try again." });
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
        text: error instanceof Error ? error.message : "We could not update your password. Please request a new link and try again.",
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
          <span className="auth-kicker">Reset link sent</span>
          <h1>Check your email.</h1>
          <p>We’ve sent a secure password-reset link to <strong>{email}</strong>. It may take a minute to arrive.</p>
        </div>
        <div className="recovery-note"><IconCheck size={18} /><span>For your security, the link can only be used once.</span></div>
        <button className="btn btn-secondary recovery-action" type="button" onClick={() => setView("request")}>Send another link</button>
        <p className="auth-switch">Remembered your password? <Link href={`/${locale}/sign-in`}>Back to sign in</Link></p>
      </div>
    );
  }

  if (view === "complete") {
    return (
      <div className="auth-card recovery-card">
        <div className="recovery-icon is-complete" aria-hidden="true"><IconCheck size={26} /></div>
        <div className="auth-card-head">
          <span className="auth-kicker">Password updated</span>
          <h1>You’re all set.</h1>
          <p>Your password has been changed. You can now sign in securely with your new password.</p>
        </div>
        <Link className="btn btn-primary recovery-action" href={`/${locale}/sign-in`}>Continue to sign in <IconArrowRight size={18} /></Link>
      </div>
    );
  }

  const isUpdating = view === "update";
  return (
    <div className="auth-card recovery-card">
      <div className="auth-card-head">
        <span className="auth-kicker">{isUpdating ? "Choose a new password" : "Account recovery"}</span>
        <h1>{isUpdating ? "Set a new password." : "Reset your password."}</h1>
        <p>{isUpdating ? "Choose a strong password you have not used elsewhere." : "Enter the email address linked to your account and we’ll send you a secure reset link."}</p>
      </div>

      {isUpdating ? (
        <form className="auth-form recovery-form" onSubmit={updatePassword}>
          <div className="form-field">
            <label htmlFor="password">New password <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconLock size={18} /><input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required /></div>
          </div>
          <div className="form-field">
            <label htmlFor="confirmation">Confirm new password <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconLock size={18} /><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" placeholder="Enter it again" minLength={8} required /></div>
          </div>
          {message && <p className="form-message is-error" role="alert">{message.text}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Updating password…" : "Update password"}{!loading && <IconArrowRight size={18} />}</button>
        </form>
      ) : (
        <form className="auth-form recovery-form" onSubmit={requestReset}>
          <div className="form-field">
            <label htmlFor="email">Email address <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconMail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
          </div>
          {message && <p className="form-message is-error" role="alert">{message.text}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Sending link…" : "Send reset link"}{!loading && <IconArrowRight size={18} />}</button>
        </form>
      )}

      {!isUpdating && <p className="auth-switch">Remembered your password? <Link href={`/${locale}/sign-in`}>Back to sign in</Link></p>}
    </div>
  );
}
