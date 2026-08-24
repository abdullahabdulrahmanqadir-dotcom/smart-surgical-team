import type { Metadata } from "next";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import PasswordRecoveryForm from "../../components/PasswordRecoveryForm";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";
import { PRIVATE_PAGE_METADATA } from "../../lib/seo";

export const metadata: Metadata = PRIVATE_PAGE_METADATA;

export default async function ForgetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="account-page"><div className="account-backdrop" aria-hidden="true"/><div className="account-layout recovery-layout"><aside className="account-aside"><span className="eyebrow">{dict.account.recoveryEyebrow}</span><h2>{dict.account.recoveryTitle}</h2><p>{dict.account.recoveryBody}</p><ul><li>{dict.account.recoveryBulletOne}</li><li>{dict.account.recoveryBulletTwo}</li><li>{dict.account.recoveryBulletThree}</li></ul></aside><PasswordRecoveryForm locale={active} t={dict.recovery}/></div></main><SiteFooter locale={active} dict={dict}/></>;
}
