"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { signInWithGoogle } from "./AuthForm";
import AccountDetailFields from "./AccountDetailFields";
import PasswordStrength from "./PasswordStrength";
import { isTurnstileUnavailable, useTurnstile } from "./Turnstile";
import { IconArrowRight, IconCheck, IconEye, IconEyeOff, IconLock, IconMail } from "./icons";
import { EMPTY_ACCOUNT_DETAILS, accountMetadataPatch, type AccountDetailField, type AccountDetails } from "../lib/account";
import { DEFAULT_COUNTRY } from "../lib/countries";
import { clearFailures, formatWait, registerFailure, throttleWait } from "../lib/auth-throttle";
import { assessPassword, isLeakedPasswordError } from "../lib/password-strength";
import { fill, type Dictionary } from "../lib/dictionaries";

type Step = 1 | 2 | 3 | 4;

const STEP_COUNT = 4;
/** Supabase rate-limits confirmation email sends; keep the button honest about it. */
const RESEND_COOLDOWN_SECONDS = 60;

/** Nearly every member practises in Iraq, so the country field opens on it. */
const STARTING_DETAILS: AccountDetails = { ...EMPTY_ACCOUNT_DETAILS, country: DEFAULT_COUNTRY };

function friendlyError(error: unknown, t: Dictionary["signUp"], passwordT: Dictionary["password"]) {
  const text = error instanceof Error ? error.message : t.requestError;
  if (/configuration is missing/i.test(text)) return t.confirmationUnavailable;
  // Supabase keeps one account per email regardless of how it was created, so
  // this fires whenever the email already belongs to a Google sign-in too.
  if (/already registered|already exists|already in use/i.test(text)) return t.existingEmail;
  if (isLeakedPasswordError(text)) return passwordT.leaked;
  if (/error sending|smtp|email rate limit/i.test(text)) return t.codeSendError;
  return text;
}

export default function SignUpWizard({ locale, t, passwordT, protectionT }: { locale: string; t: Dictionary["signUp"]; passwordT: Dictionary["password"]; protectionT: Dictionary["protection"] }) {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState<AccountDetails>(STARTING_DETAILS);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const turnstile = useTurnstile(locale);

  function setError(text: string) { setMessage({ type: "error", text }); }
  const legalRequired = locale === "ar"
    ? "يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة."
    : "Please agree to the Terms of Use and Privacy Policy to continue.";

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  /**
   * Every submit that reaches Supabase goes through here first: it refuses
   * while the member is backed off, and it attaches the Turnstile token that
   * Supabase's CAPTCHA protection requires. Returning `null` means the caller
   * has already shown the reason and must not continue.
   */
  async function guard(action: "sign-up" | "verify", identifier: string): Promise<{ captchaToken?: string } | null> {
    const wait = throttleWait(action, identifier);
    if (wait > 0) {
      setError(fill(protectionT.lockedOut, { wait: formatWait(wait, locale) }));
      return null;
    }
    try {
      return { captchaToken: await turnstile.getToken() };
    } catch (error) {
      setError(isTurnstileUnavailable(error) ? protectionT.unavailable : t.requestError);
      return null;
    }
  }

  async function handleGoogle() {
    if (!acceptedLegal) return setError(legalRequired);
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
    if (!acceptedLegal) return setError(legalRequired);
    setMessage(null); setStep(2);
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Object.values(details).every((value) => value.trim())) return setError(t.detailsRequired);
    setMessage(null); setStep(3);
  }

  /**
   * With "Confirm email" on, signUp() creates the account but withholds the
   * session until the six-digit code is verified, so registration continues on
   * step 4. With it off, Supabase returns a session immediately and the member
   * goes straight in — both paths are handled, so the site keeps working either
   * side of that dashboard toggle.
   */
  async function finishRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assessPassword(password).acceptable) return setError(passwordT.tooWeak);
    if (password !== confirmation) return setError(t.passwordMismatch);

    const address = email.trim();
    const options = await guard("sign-up", address);
    if (!options) return;

    setLoading(true); setMessage(null);
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.signUp({
        email: address,
        password,
        options: {
          captchaToken: options.captchaToken,
          emailRedirectTo: `${window.location.origin}/${locale}/sign-in`,
          data: accountMetadataPatch(details, { acceptLegal: true }),
        },
      });
      if (error) throw error;
      // Rather than admit that an address is taken, Supabase returns a decoy
      // user with no identities attached. It is the only signal available, and
      // it covers an existing password account and an existing Google one alike.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setStep(1);
        return setError(t.existingEmail);
      }
      clearFailures("sign-up", address);
      if (data.session) return window.location.assign(`/${locale}/profile`);
      // No status line here: step 4's own description already names the address
      // the code went to, and "a new code is on its way" would be a lie on the
      // first send. The resend button sets it after that.
      setStep(4);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      registerFailure("sign-up", address);
      setError(friendlyError(error, t, passwordT));
    } finally {
      // The token is spent whether or not the call succeeded.
      turnstile.reset();
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) return setError(t.codeRequired);

    const address = email.trim();
    // Guessing a six-digit code is exactly what the back-off is for, so this
    // step is throttled even though Supabase expires the code on its own.
    const wait = throttleWait("verify", address);
    if (wait > 0) return setError(fill(protectionT.lockedOut, { wait: formatWait(wait, locale) }));

    setLoading(true); setMessage(null);
    try {
      const { data, error } = await getSupabaseBrowserClient().auth.verifyOtp({ email: address, token, type: "signup" });
      if (error) throw error;
      if (!data.session) throw new Error(t.codeInvalid);
      clearFailures("verify", address);
      window.location.assign(`/${locale}/profile`);
    } catch (error) {
      registerFailure("verify", address);
      const text = error instanceof Error ? error.message : t.requestError;
      setError(/expired|invalid|token/i.test(text) ? t.codeInvalid : friendlyError(error, t, passwordT));
    } finally { setLoading(false); }
  }

  async function resendCode() {
    if (resendSeconds > 0) return;
    const address = email.trim();
    const options = await guard("sign-up", address);
    if (!options) return;

    setLoading(true); setMessage(null);
    try {
      const { error } = await getSupabaseBrowserClient().auth.resend({
        type: "signup",
        email: address,
        options: { captchaToken: options.captchaToken, emailRedirectTo: `${window.location.origin}/${locale}/sign-in` },
      });
      if (error) throw error;
      setCode("");
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setMessage({ type: "success", text: fill(t.codeResent, { email: address }) });
    } catch (error) {
      setError(friendlyError(error, t, passwordT));
    } finally {
      turnstile.reset();
      setLoading(false);
    }
  }

  function startOver() {
    setStep(1); setCode(""); setMessage(null); setResendSeconds(0);
  }

  const steps = [t.emailStep, t.detailsStep, t.passwordStep, t.verifyStep];
  const heading = [t.emailHeading, t.detailsHeading, t.passwordHeading, t.verifyHeading][step - 1];
  const description = [t.emailDescription, t.detailsDescription, t.passwordDescription, fill(t.verifyDescription, { email: email.trim() })][step - 1];
  const progress = <ol className="signup-progress" aria-label={fill(t.registrationStep, { step, total: STEP_COUNT })}>{steps.map((label, index) => <li key={label} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-complete" : ""}><span>{index + 1 < step ? <IconCheck size={13} /> : index + 1}</span><b>{label}</b></li>)}</ol>;
  const status = message && <p className={`form-message is-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" && <IconCheck size={17} />}{message.text}</p>;

  /**
   * Sits below the choices it applies to rather than above them, so the member
   * reads what they are joining last, immediately before committing to it.
   */
  const legalConsent = <label className="legal-consent"><input type="checkbox" name="legal-consent" checked={acceptedLegal} onChange={(event) => { setAcceptedLegal(event.target.checked); setMessage(null); }}/><span>{locale === "ar" ? <>أوافق على <Link href={`/${locale}/terms`}>شروط الاستخدام</Link> و<Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>I agree to the <Link href={`/${locale}/terms`}>Terms of Use</Link> and <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</span></label>;

  return <div className="auth-card auth-card-wizard">{progress}<div className="auth-card-head wizard-head"><span className="auth-kicker">{fill(t.stepKicker, { step, total: STEP_COUNT })}</span><h1>{heading}</h1><p>{description}</p></div>{status}
    {step === 1 && <button className="auth-provider" type="button" onClick={handleGoogle} disabled={googleLoading}><span className="auth-provider-mark auth-provider-google" aria-hidden="true">G</span><span>{googleLoading ? t.redirecting : t.continueGoogle}</span><IconArrowRight size={18} /></button>}
    {step === 1 && <p className="auth-google-disclosure">{locale === "ar" ? <>بالمتابعة عبر Google، توافق على مشاركة الاسم والبريد الإلكتروني ومعرّف حساب Google لإنشاء حسابك أو تسجيل الدخول إليه. راجع <Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>By continuing with Google, you agree to share your name, email address, and Google account identifier to create or sign in to your account. See our <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</p>}
    {step === 1 && <div className="auth-divider"><span>{t.emailDivider}</span></div>}
    {step === 1 && <form className="auth-form" noValidate onSubmit={submitEmail}><div className="form-field"><label htmlFor="signup-email">{t.emailAddress} <span aria-hidden="true">*</span></label><div className="field-control"><IconMail size={18} /><input id="signup-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.emailPlaceholder} autoFocus required /></div><small>{t.emailHelp}</small></div><button className="btn btn-primary auth-submit" type="submit">{t.continue} <IconArrowRight size={18} /></button></form>}
    {step === 1 && legalConsent}
    {step === 2 && <form className="auth-form" noValidate onSubmit={saveDetails}><div className="wizard-field-grid"><AccountDetailFields idPrefix="signup" locale={locale} details={details} onChange={(field: AccountDetailField, value: string) => { setDetails((current) => ({ ...current, [field]: value })); setMessage(null); }} t={t} autoFocusFirst /></div><button className="btn btn-primary auth-submit" type="submit">{t.continue} <IconArrowRight size={18} /></button><button className="wizard-back" type="button" onClick={() => { setStep(1); setMessage(null); }}>{t.backEmail}</button></form>}
    {step === 3 && <form className="auth-form" noValidate onSubmit={finishRegistration}>
      {/* Password managers only offer to save a credential when they can see the
          account it belongs to. The address was collected two steps ago, so it
          is repeated here, hidden but readable, as the username half of the pair. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden aria-hidden="true" tabIndex={-1} />
      <div className="form-field"><label htmlFor="new-password">{t.password} <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="new-password" name="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setMessage(null); }} placeholder={t.passwordPlaceholder} autoFocus required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t.hidePassword : t.showPassword}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button></div><PasswordStrength value={password} t={passwordT} /></div>
      <div className="form-field"><label htmlFor="confirm-password">{t.confirmPassword} <span aria-hidden="true">*</span></label><div className="field-control"><IconLock size={18} /><input id="confirm-password" name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={t.repeatPassword} required /></div></div>
      <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? t.creating : t.createAccount}{!loading && <IconArrowRight size={18} />}</button><button className="wizard-back" type="button" onClick={() => { setStep(2); setMessage(null); }}>{t.backDetails}</button></form>}
    {step === 4 && <form className="auth-form" noValidate onSubmit={verifyCode}><div className="form-field"><label htmlFor="signup-code">{t.verificationCode} <span aria-hidden="true">*</span></label><input id="signup-code" name="one-time-code" className="code-field" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} dir="ltr" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t.codePlaceholder} autoFocus required /></div><button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? t.verifying : t.verify}{!loading && <IconArrowRight size={18} />}</button><div className="wizard-secondary-actions"><button type="button" onClick={() => void resendCode()} disabled={loading || resendSeconds > 0}>{resendSeconds > 0 ? fill(t.resendIn, { seconds: resendSeconds }) : t.resendCode}</button><button type="button" onClick={startOver}>{t.useDifferentEmail}</button></div></form>}
    {turnstile.widget}
    <p className="auth-switch">{t.existingAccount} <Link href={`/${locale}/sign-in`}>{t.signIn}</Link></p>
  </div>;
}
