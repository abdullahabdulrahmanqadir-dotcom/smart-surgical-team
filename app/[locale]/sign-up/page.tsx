import type { Metadata } from "next";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import AuthForm from "../../components/AuthForm";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";
import { privatePageMetadata } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  return privatePageMetadata(getDictionary(active).seo.signUpPageTitle);
}

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="account-page"><div className="account-backdrop" aria-hidden="true"/><div className="account-layout"><aside className="account-aside"><h2>{dict.account.signUpTitle}</h2><p>{dict.account.signUpBody}</p><ul><li>{dict.account.signUpBulletOne}</li><li>{dict.account.signUpBulletTwo}</li><li>{dict.account.signUpBulletThree}</li></ul></aside><AuthForm mode="sign-up" locale={active} t={dict.auth} signUpT={dict.signUp} passwordT={dict.password} protectionT={dict.protection}/></div></main><SiteFooter locale={active} dict={dict}/></>;
}
