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

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="account-page"><div className="account-backdrop" aria-hidden="true"/><div className="account-layout"><aside className="account-aside"><span className="eyebrow">Smart Surgical Team membership</span><h2>A quieter, more useful way to keep learning.</h2><p>Bring together the topics and surgical cases worth returning to, in a private space shaped around your practice.</p><ul><li>Save cases for your next review</li><li>Keep selected topics in one place</li><li>Receive only thoughtful team updates</li></ul></aside><AuthForm mode="sign-in" locale={active}/></div></main><SiteFooter locale={active} dict={dict}/></>;
}
