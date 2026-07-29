"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { signInWithGoogle } from "./AuthForm";
import { IconArrowRight, IconCheck, IconEye, IconEyeOff, IconLock, IconMail } from "./icons";

type Step = 1 | 2 | 3;
const STEPS = ["Email", "Details", "Password"];

function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : "We could not complete that request. Please try again.";
  if (/configuration is missing/i.test(text)) {
    return "Email confirmation is not configured yet. Add the Supabase public URL and anonymous key to enable registration.";
  }
  // Supabase keeps one account per email regardless of how it was created, so
  // this fires whenever the email already belongs to a Google sign-in too.
  if (/already registered|already exists|already in use/i.test(text)) {
    return "An account with this email already exists. If you signed up with Google, use “Continue with Google” above, or sign in below.";
  }
  return text;
}

export default function SignUpWizard({ locale }: { locale: string }) {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function setError(text: string) { setMessage({ type: "error", text }); }

  async function handleGoogle() {
    setGoogleLoading(true);
    setMessage(null);
    try {
      await signInWithGoogle(locale);
    } catch (error) {
      setError(error instanceof Error ? error.message : "We could not start Google sign-in. Please try again.");
      setGoogleLoading(false);
    }
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return setError("Enter the email address you would like to use.");
    setMessage(null); setStep(2);
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (![firstName, lastName, organisation, jobTitle, city, country].every((value) => value.trim())) return setError("Complete each field so we can personalise your learning profile.");
    setMessage(null); setStep(3);
  }

  // Email confirmation is temporarily disabled in Supabase (Authentication →
  // Providers → Email → "Confirm email") until a custom domain is set up for
  // Resend, so signUp returns a session immediately. If confirmation is ever
  // re-enabled, Supabase instead returns no session and we fall back to
  // pointing the user at their inbox rather than erroring.
  async function finishRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match. Please try again.");
    setLoading(true); setMessage(null);
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/sign-in`,
          data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName.trim()} ${lastName.trim()}`, organisation: organisation.trim(), job_title: jobTitle.trim(), city: city.trim(), country: country.trim() },
        },
      });
      if (error) throw error;
      if (!data.session) {
        setMessage({ type: "success", text: "Check your inbox to confirm your email, then sign in." });
        return;
      }
      window.location.assign(`/${locale}`);
    } catch (error) { setError(friendlyError(error)); } finally { setLoading(false); }
  }

  const heading = ["Let’s start with your email.", "Tell us about your practice.", "Secure your account."][step - 1];
  const description = ["We’ll use this to secure your account.", "These details help us make your learning space more relevant from day one.", "Choose a password you will remember. You can update your account later from your profile."][step - 1];
  const progress = <ol className="signup-progress" aria-label={`Registration step ${step} of 3`}>{STEPS.map((label, index) => <li key={label} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-complete" : ""}><span>{index + 1 < step ? <IconCheck size={13} /> : index + 1}</span><b>{label}</b></li>)}</ol>;
  const status = message && <p className={`form-message is-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" && <IconCheck size={17} />}{message.text}</p>;

  return <div className="auth-card auth-card-wizard">{progress}<div className="auth-card-head wizard-head"><span className="auth-kicker">Step {step} of 3</span><h1>{heading}</h1><p>{description}</p></div>{status}
    {step === 1 && <button className="auth-provider" type="button" onClick={handleGoogle} disabled={googleLoading}><span className="auth-provider-mark auth-provider-google" aria-hidden="true">G</span><span>{googleLoading ? "Redirecting…" : "Continue with Google"}</span><IconArrowRight size={18} /></button>}
    {step === 1 && <div className="auth-divider"><span>or use your email</span></div>}
    {step === 1 && <form className="auth-form" noValidate onSubmit={submitEmail}><div className="form-field"><label htmlFor="signup-email">Email address <span aria-hidden="true">*</span></label><div className="field-control"><IconMail size={18} /><input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoFocus required /></div><small>We use this only to secure your account and send important learning updates.</small></div><button className="btn btn-primary auth-submit" type="submit">Continue <IconArrowRight size={18} /></button></form>}
    {step === 2 && <form className="auth-form" noValidate onSubmit={saveDetails}><div className="wizard-field-grid"><div className="form-field"><label htmlFor="first-name">First name <span aria-hidden="true">*</span></label><div className="field-control"><input id="first-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus required /></div></div><div className="form-field"><label htmlFor="last-name">Last name <span aria-hidden="true">*</span></label><div className="field-control"><input id="last-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></div></div><div className="form-field field-span-2"><label htmlFor="organisation">Organisation <span aria-hidden="true">*</span></label><div className="field-control"><input id="organisation" autoComplete="organization" value={organisation} onChange={(event) => setOrganisation(event.target.value)} placeholder="Hospital, university, or practice" required /></div></div><div className="form-field field-span-2"><label htmlFor="job-title">Job title <span aria-hidden="true">*</span></label><div className="field-control"><input id="job-title" autoComplete="organization-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Otolaryngology resident" required /></div></div><div className="form-field"><label htmlFor="city">City <span aria-hidden="true">*</span></label><div className="field-control"><input id="city" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} required /></div></div><div className="form-field"><label htmlFor="country">Country <span aria-hidden="true">*</span></label><div className="field-control"><input id="country" autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} required /></div></div></div><button className="btn btn-primary auth-submit" type="submit">Continue <IconArrowRight size={18} /></button><button className="wizard-back" type="button" onClick={() => { setStep(1); setMessage(null); }}>Back to your email</button></form>}
    {step === 3 && <form className="auth-form" noValidate onSubmit={finishRegistration}><div className="form-field"><label htmlFor="new-password">Password <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} autoFocus required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button></div></div><div className="form-field"><label htmlFor="confirm-password">Confirm password <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your password" required /></div></div><button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Creating your account…" : "Create account"}{!loading && <IconArrowRight size={18} />}</button><button className="wizard-back" type="button" onClick={() => { setStep(2); setMessage(null); }}>Back to your details</button></form>}
    <p className="auth-switch">Already have an account? <Link href={`/${locale}/sign-in`}>Sign in</Link></p>
  </div>;
}
