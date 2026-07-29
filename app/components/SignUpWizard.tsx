"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { signInWithGoogle } from "./AuthForm";
import { IconArrowRight, IconCheck, IconEye, IconEyeOff, IconLock, IconMail } from "./icons";

type Step = 1 | 2 | 3 | 4;
const STEPS = ["Email", "Verify", "Details", "Password"];

function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : "We could not complete that request. Please try again.";
  return /configuration is missing/i.test(text)
    ? "Email confirmation is not configured yet. Add the Supabase public URL and anonymous key to enable registration."
    : text;
}

export default function SignUpWizard({ locale }: { locale: string }) {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
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

  async function sendCode() {
    if (!email.trim()) return setError("Enter the email address you would like to use.");
    setLoading(true); setMessage(null);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setStep(2);
      setMessage({ type: "success", text: `A confirmation code was sent to ${email.trim()}.` });
    } catch (error) { setError(friendlyError(error)); } finally { setLoading(false); }
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await sendCode(); }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = code.replace(/\s/g, "");
    if (token.length < 6) return setError("Enter the confirmation code from your email.");
    setLoading(true); setMessage(null);
    try {
      const { error } = await getSupabaseBrowserClient().auth.verifyOtp({ email: email.trim(), token, type: "email" });
      if (error) throw error;
      setStep(3);
    } catch (error) { setError(friendlyError(error)); } finally { setLoading(false); }
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (![firstName, lastName, organisation, jobTitle, city, country].every((value) => value.trim())) return setError("Complete each field so we can personalise your learning profile.");
    setMessage(null); setStep(4);
  }

  async function finishRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match. Please try again.");
    setLoading(true); setMessage(null);
    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ password, data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName.trim()} ${lastName.trim()}`, organisation: organisation.trim(), job_title: jobTitle.trim(), city: city.trim(), country: country.trim() } });
      if (error) throw error;
      window.location.assign(`/${locale}`);
    } catch (error) { setError(friendlyError(error)); } finally { setLoading(false); }
  }

  const heading = ["Let’s start with your email.", "Check your inbox.", "Tell us about your practice.", "Secure your account."][step - 1];
  const description = ["We will send a one-time code to confirm that this email belongs to you.", "Enter the code from the email to continue your registration.", "These details help us make your learning space more relevant from day one.", "Choose a password you will remember. You can update your account later from your profile."][step - 1];
  const progress = <ol className="signup-progress" aria-label={`Registration step ${step} of 4`}>{STEPS.map((label, index) => <li key={label} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-complete" : ""}><span>{index + 1 < step ? <IconCheck size={13} /> : index + 1}</span><b>{label}</b></li>)}</ol>;
  const status = message && <p className={`form-message is-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" && <IconCheck size={17} />}{message.text}</p>;

  return <div className="auth-card auth-card-wizard">{progress}<div className="auth-card-head wizard-head"><span className="auth-kicker">Step {step} of 4</span><h1>{heading}</h1><p>{description}</p></div>{status}
    {step === 1 && <button className="auth-provider" type="button" onClick={handleGoogle} disabled={googleLoading}><span className="auth-provider-mark auth-provider-google" aria-hidden="true">G</span><span>{googleLoading ? "Redirecting…" : "Continue with Google"}</span><IconArrowRight size={18} /></button>}
    {step === 1 && <div className="auth-divider"><span>or use your email</span></div>}
    {step === 1 && <form className="auth-form" noValidate onSubmit={requestCode}><div className="form-field"><label htmlFor="signup-email">Email address <span aria-hidden="true">*</span></label><div className="field-control"><IconMail size={18} /><input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoFocus required /></div><small>We use this only to secure your account and send important learning updates.</small></div><button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Sending code…" : "Send confirmation code"}{!loading && <IconArrowRight size={18} />}</button></form>}
    {step === 2 && <form className="auth-form" noValidate onSubmit={verifyCode}><div className="form-field"><label htmlFor="confirmation-code">Confirmation code <span aria-hidden="true">*</span></label><input className="code-field" id="confirmation-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus required /><small>For your security, this code expires shortly after it is sent.</small></div><button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Confirming…" : "Confirm email"}{!loading && <IconArrowRight size={18} />}</button><div className="wizard-secondary-actions"><button type="button" onClick={() => { setStep(1); setMessage(null); }}>Use a different email</button><button type="button" disabled={loading} onClick={() => void sendCode()}>Resend code</button></div></form>}
    {step === 3 && <form className="auth-form" noValidate onSubmit={saveDetails}><div className="wizard-field-grid"><div className="form-field"><label htmlFor="first-name">First name <span aria-hidden="true">*</span></label><div className="field-control"><input id="first-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus required /></div></div><div className="form-field"><label htmlFor="last-name">Last name <span aria-hidden="true">*</span></label><div className="field-control"><input id="last-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></div></div><div className="form-field field-span-2"><label htmlFor="organisation">Organisation <span aria-hidden="true">*</span></label><div className="field-control"><input id="organisation" autoComplete="organization" value={organisation} onChange={(event) => setOrganisation(event.target.value)} placeholder="Hospital, university, or practice" required /></div></div><div className="form-field field-span-2"><label htmlFor="job-title">Job title <span aria-hidden="true">*</span></label><div className="field-control"><input id="job-title" autoComplete="organization-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Otolaryngology resident" required /></div></div><div className="form-field"><label htmlFor="city">City <span aria-hidden="true">*</span></label><div className="field-control"><input id="city" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} required /></div></div><div className="form-field"><label htmlFor="country">Country <span aria-hidden="true">*</span></label><div className="field-control"><input id="country" autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} required /></div></div></div><button className="btn btn-primary auth-submit" type="submit">Continue <IconArrowRight size={18} /></button><button className="wizard-back" type="button" onClick={() => { setStep(2); setMessage(null); }}>Back to email confirmation</button></form>}
    {step === 4 && <form className="auth-form" noValidate onSubmit={finishRegistration}><div className="form-field"><label htmlFor="new-password">Password <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} autoFocus required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button></div></div><div className="form-field"><label htmlFor="confirm-password">Confirm password <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your password" required /></div></div><button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Creating your account…" : "Create account"}{!loading && <IconArrowRight size={18} />}</button><button className="wizard-back" type="button" onClick={() => { setStep(3); setMessage(null); }}>Back to your details</button></form>}
    <p className="auth-switch">Already have an account? <Link href={`/${locale}/sign-in`}>Sign in</Link></p>
  </div>;
}
