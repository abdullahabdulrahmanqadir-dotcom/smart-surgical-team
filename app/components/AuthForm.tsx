"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconEye, IconEyeOff, IconLock, IconMail, IconUser } from "./icons";
import SignUpWizard from "./SignUpWizard";
import type { Dictionary } from "../lib/dictionaries";

type Mode = "sign-in" | "sign-up";

export default function AuthForm({ mode, locale, t, signUpT }: { mode: Mode; locale: string; t: Dictionary["auth"]; signUpT: Dictionary["signUp"] }) {
  return mode === "sign-up" ? <SignUpWizard locale={locale} t={signUpT} /> : <SignInForm locale={locale} t={t} />;
}

export async function signInWithGoogle(locale: string) {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/${locale}/profile` },
  });
  if (error) throw error;
}

function SignInForm({ locale, t }: { locale: string; t: Dictionary["auth"] }) {
  const isSignUp = false;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

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
    const fullName = String(form.get("fullName") ?? "").trim();

    if (isSignUp && !fullName) {
      setMessage({ type: "error", text: t.fullNameError });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: "error", text: t.passwordLengthError });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const client = getSupabaseBrowserClient();
      const result = isSignUp
        ? await client.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        : await client.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;
      if (isSignUp && !result.data.session) {
        setMessage({ type: "success", text: t.confirmationSuccess });
        return;
      }
      window.location.assign(`/${locale}/profile`);
    } catch (error) {
      const text = error instanceof Error ? error.message : t.requestError;
      const unconfigured = /configuration is missing/i.test(text);
      setMessage({
        type: "error",
        text: unconfigured
          ? t.unavailable
          : text,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="auth-kicker">{isSignUp ? t.newMember : t.memberAccess}</span>
        <h1>{isSignUp ? t.buildSpace : t.welcomeBack}</h1>
        <p>
          {isSignUp
            ? t.signUpIntro
            : t.signInIntro}
        </p>
      </div>

      <button className="auth-provider" type="button" onClick={handleGoogle} disabled={googleLoading}>
        <span className="auth-provider-mark auth-provider-google" aria-hidden="true">G</span>
        <span>{googleLoading ? t.redirecting : t.continueGoogle}</span>
        <IconArrowRight size={18} />
      </button>
      <p className="auth-google-disclosure">{locale === "ar" ? <>بالمتابعة عبر Google، توافق على مشاركة الاسم والبريد الإلكتروني ومعرّف حساب Google لإنشاء حسابك أو تسجيل الدخول إليه. راجع <Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>By continuing with Google, you agree to share your name, email address, and Google account identifier to create or sign in to your account. See our <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</p>

      <div className="auth-divider"><span>{t.emailDivider}</span></div>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        {isSignUp && (
          <div className="form-field">
            <label htmlFor="fullName">{t.fullName} <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconUser size={18} /><input id="fullName" name="fullName" autoComplete="name" placeholder={t.fullNamePlaceholder} required /></div>
          </div>
        )}
        <div className="form-field">
          <label htmlFor="email">{t.emailAddress} <span aria-hidden="true">*</span></label>
          <div className="field-control"><IconMail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder={t.emailPlaceholder} required /></div>
        </div>
        <div className="form-field">
          <div className="field-label-row"><label htmlFor="password">{t.password} <span aria-hidden="true">*</span></label>{!isSignUp && <Link href={`/${locale}/forget-password`}>{t.forgotPassword}</Link>}</div>
          <div className="field-control"><IconLock size={18} /><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} placeholder={t.passwordPlaceholder} minLength={8} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t.hidePassword : t.showPassword}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button></div>
          {isSignUp && <small>{t.passwordHelp}</small>}
        </div>

        {message && <p className={`form-message is-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" && <IconCheck size={17} />}{message.text}</p>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
          {loading ? t.pleaseWait : isSignUp ? t.createAccount : t.signIn}
          {!loading && <IconArrowRight size={18} />}
        </button>
      </form>

      <p className="auth-switch">
        {isSignUp ? t.existingAccount : t.newToTeam} {" "}
        <Link href={`/${locale}/${isSignUp ? "sign-in" : "sign-up"}`}>{isSignUp ? t.signIn : t.createAnAccount}</Link>
      </p>
    </div>
  );
}
