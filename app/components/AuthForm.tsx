"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { isTurnstileUnavailable, useTurnstile } from "./Turnstile";
import { IconArrowRight, IconEye, IconEyeOff, IconLock, IconMail } from "./icons";
import SignUpWizard from "./SignUpWizard";
import { clearFailures, formatWait, registerFailure, throttleWait } from "../lib/auth-throttle";
import { fill, type Dictionary } from "../lib/dictionaries";

type Mode = "sign-in" | "sign-up";

export default function AuthForm({ mode, locale, t, signUpT, passwordT, protectionT }: { mode: Mode; locale: string; t: Dictionary["auth"]; signUpT: Dictionary["signUp"]; passwordT: Dictionary["password"]; protectionT: Dictionary["protection"] }) {
  return mode === "sign-up"
    ? <SignUpWizard locale={locale} t={signUpT} passwordT={passwordT} protectionT={protectionT} />
    : <SignInForm locale={locale} t={t} protectionT={protectionT} />;
}

/**
 * Lands on /complete-profile rather than /profile because Google only ever
 * gives us a name and an email address. That page forwards straight to the
 * profile once the practice details are on file, so returning members notice
 * nothing, and it is also where a failed OAuth round trip reports itself.
 */
export async function signInWithGoogle(locale: string) {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/${locale}/complete-profile` },
  });
  if (error) throw error;
}

function SignInForm({ locale, t, protectionT }: { locale: string; t: Dictionary["auth"]; protectionT: Dictionary["protection"] }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const turnstile = useTurnstile(locale);

  async function handleGoogle() {
    setGoogleLoading(true);
    setMessage(null);
    try {
      await signInWithGoogle(locale);
    } catch (error) {
      const text = error instanceof Error ? error.message : t.googleError;
      setMessage({ type: "error", text });
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    // Sign-in intentionally does not apply the new password rules. Members who
    // registered under the old eight-character minimum still have valid
    // passwords, and refusing to submit theirs would lock them out.
    if (!email || !password) return setMessage({ type: "error", text: protectionT.genericSignIn });

    const wait = throttleWait("sign-in", email);
    if (wait > 0) return setMessage({ type: "error", text: fill(protectionT.lockedOut, { wait: formatWait(wait, locale) }) });

    let captchaToken: string | undefined;
    try {
      captchaToken = await turnstile.getToken();
    } catch (error) {
      return setMessage({ type: "error", text: isTurnstileUnavailable(error) ? protectionT.unavailable : t.requestError });
    }

    setLoading(true);
    setMessage(null);
    try {
      const client = getSupabaseBrowserClient();
      const { error } = await client.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if (error) throw error;
      clearFailures("sign-in", email);
      window.location.assign(`/${locale}/profile`);
    } catch (error) {
      const text = error instanceof Error ? error.message : t.requestError;
      registerFailure("sign-in", email);
      // "Invalid login credentials" is deliberately vague at the Supabase end
      // so a wrong password and an unknown address look identical; this keeps
      // it that way in the member's own language rather than leaking which
      // half was wrong.
      const wrongCredentials = /invalid login credentials|invalid email or password/i.test(text);
      setMessage({
        type: "error",
        text: /configuration is missing/i.test(text) ? t.unavailable : wrongCredentials ? protectionT.genericSignIn : text,
      });
    } finally {
      // Turnstile tokens are single use, so the next attempt needs a fresh one.
      turnstile.reset();
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="auth-kicker">{t.memberAccess}</span>
        <h1>{t.welcomeBack}</h1>
        <p>{t.signInIntro}</p>
      </div>

      <button className="auth-provider" type="button" onClick={handleGoogle} disabled={googleLoading}>
        <span className="auth-provider-mark auth-provider-google" aria-hidden="true">G</span>
        <span>{googleLoading ? t.redirecting : t.continueGoogle}</span>
        <IconArrowRight size={18} />
      </button>
      <p className="auth-google-disclosure">{locale === "ar" ? <>بالمتابعة عبر Google، توافق على مشاركة الاسم والبريد الإلكتروني ومعرّف حساب Google لإنشاء حسابك أو تسجيل الدخول إليه. راجع <Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>By continuing with Google, you agree to share your name, email address, and Google account identifier to create or sign in to your account. See our <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</p>

      <div className="auth-divider"><span>{t.emailDivider}</span></div>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="email">{t.emailAddress} <span aria-hidden="true">*</span></label>
          <div className="field-control"><IconMail size={18} /><input id="email" name="email" type="email" autoComplete="username email" placeholder={t.emailPlaceholder} required /></div>
        </div>
        <div className="form-field">
          <div className="field-label-row"><label htmlFor="password">{t.password} <span aria-hidden="true">*</span></label><Link href={`/${locale}/forget-password`}>{t.forgotPassword}</Link></div>
          <div className="field-control"><IconLock size={18} /><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder={t.passwordPlaceholder} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t.hidePassword : t.showPassword}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button></div>
        </div>

        {message && <p className={`form-message is-${message.type}`} role="alert">{message.text}</p>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
          {loading ? t.pleaseWait : t.signIn}
          {!loading && <IconArrowRight size={18} />}
        </button>
      </form>

      {turnstile.widget}

      <p className="auth-switch">
        {t.newToTeam} <Link href={`/${locale}/sign-up`}>{t.createAnAccount}</Link>
      </p>
    </div>
  );
}
