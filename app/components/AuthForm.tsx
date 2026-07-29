"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconEye, IconEyeOff, IconLock, IconMail, IconUser } from "./icons";
import SignUpWizard from "./SignUpWizard";

type Mode = "sign-in" | "sign-up";

export default function AuthForm({
  mode,
  locale,
  chatGPTPath,
}: {
  mode: Mode;
  locale: string;
  chatGPTPath: string;
}) {
  return mode === "sign-up" ? <SignUpWizard locale={locale} /> : <SignInForm locale={locale} chatGPTPath={chatGPTPath} />;
}

function SignInForm({ locale, chatGPTPath }: { locale: string; chatGPTPath: string }) {
  const isSignUp = false;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();

    if (isSignUp && !fullName) {
      setMessage({ type: "error", text: "Please enter your full name." });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: "error", text: "Use a password with at least 8 characters." });
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
        setMessage({ type: "success", text: "Check your inbox to confirm your account, then return to sign in." });
        return;
      }
      window.location.assign(`/${locale}/profile`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "We could not complete that request. Please try again.";
      const unconfigured = /configuration is missing/i.test(text);
      setMessage({
        type: "error",
        text: unconfigured
          ? "Email sign-in is not available here yet. Continue with ChatGPT to access your learning profile."
          : text,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="auth-kicker">{isSignUp ? "New member" : "Member access"}</span>
        <h1>{isSignUp ? "Build your learning space." : "Welcome back."}</h1>
        <p>
          {isSignUp
            ? "Keep your surgical learning organised in one thoughtful, private space."
            : "Continue where your learning left off, with your saved cases close at hand."}
        </p>
      </div>

      <a className="auth-provider" href={chatGPTPath}>
        <span className="auth-provider-mark" aria-hidden="true">AI</span>
        <span>Continue with ChatGPT</span>
        <IconArrowRight size={18} />
      </a>

      <div className="auth-divider"><span>or use your email</span></div>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        {isSignUp && (
          <div className="form-field">
            <label htmlFor="fullName">Full name <span aria-hidden="true">*</span></label>
            <div className="field-control"><IconUser size={18} /><input id="fullName" name="fullName" autoComplete="name" placeholder="Dr. Alex Morgan" required /></div>
          </div>
        )}
        <div className="form-field">
          <label htmlFor="email">Email address <span aria-hidden="true">*</span></label>
          <div className="field-control"><IconMail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
        </div>
        <div className="form-field">
          <div className="field-label-row"><label htmlFor="password">Password <span aria-hidden="true">*</span></label>{!isSignUp && <a href="mailto:info@smartsurgicalteam.com?subject=Password%20reset">Forgot password?</a>}</div>
          <div className="field-control"><IconLock size={18} /><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} placeholder="At least 8 characters" minLength={8} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button></div>
          {isSignUp && <small>Use 8 or more characters to protect your account.</small>}
        </div>

        {message && <p className={`form-message is-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" && <IconCheck size={17} />}{message.text}</p>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
          {loading ? "Please wait…" : isSignUp ? "Create your account" : "Sign in"}
          {!loading && <IconArrowRight size={18} />}
        </button>
      </form>

      <p className="auth-switch">
        {isSignUp ? "Already have an account?" : "New to Smart Surgical Team?"} {" "}
        <Link href={`/${locale}/${isSignUp ? "sign-in" : "sign-up"}`}>{isSignUp ? "Sign in" : "Create an account"}</Link>
      </p>
    </div>
  );
}
