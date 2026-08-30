"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconUser } from "./icons";
import { ACCOUNT_DETAIL_FIELDS, EMPTY_ACCOUNT_DETAILS, accountMetadataPatch, isAccountComplete, readAccountDetails, type AccountDetailField, type AccountDetails } from "../lib/account";
import { clearAuthRedirectParams, isSignInMethodConflict, readAuthRedirectError } from "../lib/auth-redirect";
import type { Dictionary } from "../lib/dictionaries";

type Phase = "loading" | "form" | "signed-out" | "conflict" | "failed";

const FIELD_LAYOUT: { field: AccountDetailField; span: boolean; autoComplete: string }[] = [
  { field: "first_name", span: false, autoComplete: "given-name" },
  { field: "last_name", span: false, autoComplete: "family-name" },
  { field: "organisation", span: true, autoComplete: "organization" },
  { field: "job_title", span: true, autoComplete: "organization-title" },
  { field: "city", span: false, autoComplete: "address-level2" },
  { field: "country", span: false, autoComplete: "country-name" },
];

export default function CompleteProfileForm({ locale, t, signUpT }: { locale: string; t: Dictionary["completeProfile"]; signUpT: Dictionary["signUp"] }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [details, setDetails] = useState<AccountDetails>(EMPTY_ACCOUNT_DETAILS);
  const [acceptedLegal, setAcceptedLegal] = useState(true);
  const [needsLegal, setNeedsLegal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState("");

  const label: Record<AccountDetailField, string> = {
    first_name: signUpT.firstName, last_name: signUpT.lastName, organisation: signUpT.organisation,
    job_title: signUpT.jobTitle, city: signUpT.city, country: signUpT.country,
  };
  const placeholder: Partial<Record<AccountDetailField, string>> = { organisation: signUpT.organisationPlaceholder, job_title: signUpT.jobPlaceholder };

  useEffect(() => {
    let active = true;

    async function load() {
      // Supabase reports a refused OAuth round trip in the URL it redirects
      // back to, and there is no session to read in that case, so this has to
      // come before the session check or the reason is lost.
      const redirectError = readAuthRedirectError(window.location.href);
      if (redirectError) {
        clearAuthRedirectParams();
        setFailure(redirectError);
        setPhase(isSignInMethodConflict(redirectError) ? "conflict" : "failed");
        return;
      }

      try {
        const { data } = await getSupabaseBrowserClient().auth.getUser();
        if (!active) return;
        if (!data.user) return setPhase("signed-out");

        const metadata = data.user.user_metadata as Record<string, unknown> | null;
        if (isAccountComplete(metadata)) return window.location.replace(`/${locale}/profile`);

        setDetails(readAccountDetails(metadata));
        const alreadyAccepted = typeof metadata?.legal_accepted_at === "string" && metadata.legal_accepted_at.length > 0;
        setNeedsLegal(!alreadyAccepted);
        setAcceptedLegal(alreadyAccepted);
        setPhase("form");
      } catch {
        if (active) setPhase("signed-out");
      }
    }

    void load();
    return () => { active = false; };
  }, [locale]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ACCOUNT_DETAIL_FIELDS.every((field) => details[field].trim())) return setError(t.required);
    if (!acceptedLegal) return setError(locale === "ar" ? "يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة." : "Please agree to the Terms of Use and Privacy Policy to continue.");

    setSaving(true);
    setError("");
    try {
      const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ data: accountMetadataPatch(details, { acceptLegal: true }) });
      if (updateError) throw updateError;
      window.location.assign(`/${locale}/profile`);
    } catch {
      setError(t.error);
      setSaving(false);
    }
  }

  if (phase === "loading") return <div className="auth-card auth-card-wizard"><div className="auth-card-head wizard-head"><span className="auth-kicker">{t.kicker}</span><p role="status">{t.loading}</p></div></div>;

  if (phase === "signed-out") {
    return <div className="auth-card auth-card-wizard"><div className="auth-card-head wizard-head"><span className="auth-kicker">{t.kicker}</span><h1>{t.title}</h1><p>{t.signInRequired}</p></div><Link className="btn btn-primary auth-submit" href={`/${locale}/sign-in`}>{t.goToSignIn}<IconArrowRight size={18} /></Link></div>;
  }

  if (phase === "conflict" || phase === "failed") {
    const conflict = phase === "conflict";
    return <div className="auth-card auth-card-wizard"><div className="auth-card-head wizard-head"><span className="auth-kicker">{t.problemKicker}</span><h1>{conflict ? t.conflictTitle : t.problemTitle}</h1><p>{conflict ? t.conflictBody : failure}</p></div><Link className="btn btn-primary auth-submit" href={`/${locale}/sign-in`}>{t.tryAgain}<IconArrowRight size={18} /></Link></div>;
  }

  return (
    <div className="auth-card auth-card-wizard">
      <div className="auth-card-head wizard-head"><span className="auth-kicker">{t.kicker}</span><h1>{t.title}</h1><p>{t.body}</p></div>
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      <form className="auth-form" noValidate onSubmit={save}>
        <div className="wizard-field-grid">
          {FIELD_LAYOUT.map(({ field, span, autoComplete }) => (
            <div className={span ? "form-field field-span-2" : "form-field"} key={field}>
              <label htmlFor={`complete-${field}`}>{label[field]} <span aria-hidden="true">*</span></label>
              <div className="field-control">
                {field === "first_name" && <IconUser size={18} />}
                <input id={`complete-${field}`} autoComplete={autoComplete} placeholder={placeholder[field]} value={details[field]} onChange={(event) => { setDetails((current) => ({ ...current, [field]: event.target.value })); setError(""); }} required />
              </div>
            </div>
          ))}
        </div>
        {needsLegal && <label className="legal-consent"><input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)}/><span>{locale === "ar" ? <>أوافق على <Link href={`/${locale}/terms`}>شروط الاستخدام</Link> و<Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>I agree to the <Link href={`/${locale}/terms`}>Terms of Use</Link> and <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</span></label>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={saving}>{saving ? t.saving : t.save}{saving ? null : <IconCheck size={18} />}</button>
      </form>
    </div>
  );
}
