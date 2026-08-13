"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { signInWithGoogle } from "./AuthForm";
import { IconArrowRight, IconCheck, IconEye, IconEyeOff, IconLock, IconMail } from "./icons";
import { fill, type Dictionary } from "../lib/dictionaries";

type Step = 1 | 2 | 3;
function friendlyError(error: unknown, t: Dictionary["signUp"]) {
  const text = error instanceof Error ? error.message : t.requestError;
  if (/configuration is missing/i.test(text)) {
    return t.confirmationUnavailable;
  }
  // Supabase keeps one account per email regardless of how it was created, so
  // this fires whenever the email already belongs to a Google sign-in too.
  if (/already registered|already exists|already in use/i.test(text)) {
    return t.existingEmail;
  }
  return text;
}

export default function SignUpWizard({ locale, t }: { locale: string; t: Dictionary["signUp"] }) {
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
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function setError(text: string) { setMessage({ type: "error", text }); }

  async function handleGoogle() {
    if (!acceptedLegal) return setError(locale === "ar" ? "يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة." : "Please agree to the Terms of Use and Privacy Policy to continue.");
    setGoogleLoading(true);
    setMessage(null);
    try {
      await signInWithGoogle(locale);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.googleError);
      setGoogleLoading(false);
    }
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return setError(t.emailRequired);
    if (!acceptedLegal) return setError(locale === "ar" ? "يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة." : "Please agree to the Terms of Use and Privacy Policy to continue.");
    setMessage(null); setStep(2);
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (![firstName, lastName, organisation, jobTitle, city, country].every((value) => value.trim())) return setError(t.detailsRequired);
    setMessage(null); setStep(3);
  }

  // Email confirmation is temporarily disabled in Supabase (Authentication →
  // Providers → Email → "Confirm email") until a custom domain is set up for
  // Resend, so signUp returns a session immediately. If confirmation is ever
  // re-enabled, Supabase instead returns no session and we fall back to
  // pointing the user at their inbox rather than erroring.
  async function finishRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) return setError(t.passwordLength);
    if (password !== confirmation) return setError(t.passwordMismatch);
    setLoading(true); setMessage(null);
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/sign-in`,
          data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName.trim()} ${lastName.trim()}`, organisation: organisation.trim(), job_title: jobTitle.trim(), city: city.trim(), country: country.trim(), legal_accepted_at: new Date().toISOString(), legal_version: "2026-08-13" },
        },
      });
      if (error) throw error;
      if (!data.session) {
        setMessage({ type: "success", text: t.confirmEmail });
        return;
      }
      window.location.assign(`/${locale}`);
    } catch (error) { setError(friendlyError(error, t)); } finally { setLoading(false); }
  }

  const steps = [t.emailStep, t.detailsStep, t.passwordStep];
  const heading = [t.emailHeading, t.detailsHeading, t.passwordHeading][step - 1];
  const description = [t.emailDescription, t.detailsDescription, t.passwordDescription][step - 1];
  const progress = <ol className="signup-progress" aria-label={fill(t.registrationStep, { step })}>{steps.map((label, index) => <li key={label} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-complete" : ""}><span>{index + 1 < step ? <IconCheck size={13} /> : index + 1}</span><b>{label}</b></li>)}</ol>;
  const status = message && <p className={`form-message is-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" && <IconCheck size={17} />}{message.text}</p>;

  return <div className="auth-card auth-card-wizard">{progress}<div className="auth-card-head wizard-head"><span className="auth-kicker">{fill(t.stepKicker, { step })}</span><h1>{heading}</h1><p>{description}</p></div>{status}
    {step === 1 && <label className="legal-consent"><input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)}/><span>{locale === "ar" ? <>أوافق على <Link href={`/${locale}/terms`}>شروط الاستخدام</Link> و<Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>I agree to the <Link href={`/${locale}/terms`}>Terms of Use</Link> and <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</span></label>}
    {step === 1 && <button className="auth-provider" type="button" onClick={handleGoogle} disabled={googleLoading}><span className="auth-provider-mark auth-provider-google" aria-hidden="true">G</span><span>{googleLoading ? t.redirecting : t.continueGoogle}</span><IconArrowRight size={18} /></button>}
    {step === 1 && <p className="auth-google-disclosure">{locale === "ar" ? <>بالمتابعة عبر Google، توافق على مشاركة الاسم والبريد الإلكتروني ومعرّف حساب Google لإنشاء حسابك أو تسجيل الدخول إليه. راجع <Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>By continuing with Google, you agree to share your name, email address, and Google account identifier to create or sign in to your account. See our <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</p>}
    {step === 1 && <div className="auth-divider"><span>{t.emailDivider}</span></div>}
    {step === 1 && <form className="auth-form" noValidate onSubmit={submitEmail}><div className="form-field"><label htmlFor="signup-email">{t.emailAddress} <span aria-hidden="true">*</span></label><div className="field-control"><IconMail size={18} /><input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.emailPlaceholder} autoFocus required /></div><small>{t.emailHelp}</small></div><button className="btn btn-primary auth-submit" type="submit">{t.continue} <IconArrowRight size={18} /></button></form>}
    {step === 2 && <form className="auth-form" noValidate onSubmit={saveDetails}><div className="wizard-field-grid"><div className="form-field"><label htmlFor="first-name">{t.firstName} <span aria-hidden="true">*</span></label><div className="field-control"><input id="first-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus required /></div></div><div className="form-field"><label htmlFor="last-name">{t.lastName} <span aria-hidden="true">*</span></label><div className="field-control"><input id="last-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></div></div><div className="form-field field-span-2"><label htmlFor="organisation">{t.organisation} <span aria-hidden="true">*</span></label><div className="field-control"><input id="organisation" autoComplete="organization" value={organisation} onChange={(event) => setOrganisation(event.target.value)} placeholder={t.organisationPlaceholder} required /></div></div><div className="form-field field-span-2"><label htmlFor="job-title">{t.jobTitle} <span aria-hidden="true">*</span></label><div className="field-control"><input id="job-title" autoComplete="organization-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder={t.jobPlaceholder} required /></div></div><div className="form-field"><label htmlFor="city">{t.city} <span aria-hidden="true">*</span></label><div className="field-control"><input id="city" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} required /></div></div><div className="form-field"><label htmlFor="country">{t.country} <span aria-hidden="true">*</span></label><div className="field-control"><input id="country" autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} required /></div></div></div><button className="btn btn-primary auth-submit" type="submit">{t.continue} <IconArrowRight size={18} /></button><button className="wizard-back" type="button" onClick={() => { setStep(1); setMessage(null); }}>{t.backEmail}</button></form>}
    {step === 3 && <form className="auth-form" noValidate onSubmit={finishRegistration}><div className="form-field"><label htmlFor="new-password">{t.password} <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.passwordPlaceholder} minLength={8} autoFocus required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t.hidePassword : t.showPassword}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button></div></div><div className="form-field"><label htmlFor="confirm-password">{t.confirmPassword} <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={t.repeatPassword} required /></div></div><button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? t.creating : t.createAccount}{!loading && <IconArrowRight size={18} />}</button><button className="wizard-back" type="button" onClick={() => { setStep(2); setMessage(null); }}>{t.backDetails}</button></form>}
    <p className="auth-switch">{t.existingAccount} <Link href={`/${locale}/sign-in`}>{t.signIn}</Link></p>
  </div>;
}
