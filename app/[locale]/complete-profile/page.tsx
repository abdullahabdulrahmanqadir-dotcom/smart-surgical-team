import type { Metadata } from "next";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import CompleteProfileForm from "../../components/CompleteProfileForm";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";
import { PRIVATE_PAGE_METADATA } from "../../lib/seo";

export const metadata: Metadata = PRIVATE_PAGE_METADATA;

export default async function CompleteProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="account-page"><div className="account-backdrop" aria-hidden="true"/><div className="account-layout"><aside className="account-aside"><span className="eyebrow">{dict.account.signUpEyebrow}</span><h2>{dict.account.signUpTitle}</h2><p>{dict.account.signUpBody}</p><ul><li>{dict.account.signUpBulletOne}</li><li>{dict.account.signUpBulletTwo}</li><li>{dict.account.signUpBulletThree}</li></ul></aside><CompleteProfileForm locale={active} t={dict.completeProfile} signUpT={dict.signUp}/></div></main><SiteFooter locale={active} dict={dict}/></>;
}
