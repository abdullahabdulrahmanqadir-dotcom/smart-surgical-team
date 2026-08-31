"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import AccountDetailFields from "./AccountDetailFields";
import { IconArrowRight, IconCheck } from "./icons";
import { ACCOUNT_DETAIL_FIELDS, EMPTY_ACCOUNT_DETAILS, accountMetadataPatch, isAccountComplete, readAccountDetails, type AccountDetailField, type AccountDetails } from "../lib/account";
import { DEFAULT_COUNTRY } from "../lib/countries";
import { clearAuthRedirectParams, isSignInMethodConflict, readAuthRedirectError } from "../lib/auth-redirect";
import type { Dictionary } from "../lib/dictionaries";

type Phase = "loading" | "form" | "signed-out" | "conflict" | "failed";

export default function CompleteProfileForm({ locale, t, signUpT }: { locale: string; t: Dictionary["completeProfile"]; signUpT: Dictionary["signUp"] }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [details, setDetails] = useState<AccountDetails>(EMPTY_ACCOUNT_DETAILS);
  const [acceptedLegal, setAcceptedLegal] = useState(true);
  const [needsLegal, setNeedsLegal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState("");

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

        // Google supplies no address at all, so a member arriving here starts
        // on Iraq like the email wizard does rather than on a blank choice.
        const stored = readAccountDetails(metadata);
        setDetails({ ...stored, country: stored.country || DEFAULT_COUNTRY });
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
          <AccountDetailFields idPrefix="complete" locale={locale} details={details} t={signUpT} onChange={(field: AccountDetailField, value: string) => { setDetails((current) => ({ ...current, [field]: value })); setError(""); }} />
        </div>
        {needsLegal && <label className="legal-consent"><input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)}/><span>{locale === "ar" ? <>أوافق على <Link href={`/${locale}/terms`}>شروط الاستخدام</Link> و<Link href={`/${locale}/privacy`}>سياسة الخصوصية</Link>.</> : <>I agree to the <Link href={`/${locale}/terms`}>Terms of Use</Link> and <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</>}</span></label>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={saving}>{saving ? t.saving : t.save}{saving ? null : <IconCheck size={18} />}</button>
      </form>
    </div>
  );
}
