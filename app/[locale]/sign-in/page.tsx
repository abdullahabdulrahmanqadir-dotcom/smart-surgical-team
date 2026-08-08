import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import AuthForm from "../../components/AuthForm";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="account-page"><div className="account-backdrop" aria-hidden="true"/><div className="account-layout"><aside className="account-aside"><span className="eyebrow">{dict.account.signInEyebrow}</span><h2>{dict.account.signInTitle}</h2><p>{dict.account.signInBody}</p><ul><li>{dict.account.signInBulletOne}</li><li>{dict.account.signInBulletTwo}</li><li>{dict.account.signInBulletThree}</li></ul></aside><AuthForm mode="sign-in" locale={active} t={dict.auth} signUpT={dict.signUp}/></div></main><SiteFooter locale={active} dict={dict}/></>;
}
