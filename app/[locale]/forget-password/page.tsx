import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import PasswordRecoveryForm from "../../components/PasswordRecoveryForm";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

export default async function ForgetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="account-page"><div className="account-backdrop" aria-hidden="true"/><div className="account-layout recovery-layout"><aside className="account-aside"><span className="eyebrow">Account support</span><h2>Access should never get in the way of learning.</h2><p>We’ll help you return to your personal learning space with a private, time-limited recovery link.</p><ul><li>Secure link sent to your inbox</li><li>No account details shown on screen</li><li>Return to your saved learning after sign in</li></ul></aside><PasswordRecoveryForm locale={active}/></div></main><SiteFooter locale={active} dict={dict}/></>;
}
