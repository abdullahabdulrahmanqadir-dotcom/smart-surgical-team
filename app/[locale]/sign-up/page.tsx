import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import AuthForm from "../../components/AuthForm";
import { chatGPTSignInPath } from "../../chatgpt-auth";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const profilePath = localePath(active, "profile");

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="account-page"><div className="account-backdrop" aria-hidden="true"/><div className="account-layout"><aside className="account-aside"><span className="eyebrow">Join the learning community</span><h2>Made for the work that deserves a second look.</h2><p>Set up a focused learning space for head and neck surgery—designed to stay useful, clear, and respectful of your time.</p><ul><li>One secure account across the platform</li><li>A personal place for useful cases</li><li>Settings that remain in your control</li></ul></aside><AuthForm mode="sign-up" locale={active} chatGPTPath={chatGPTSignInPath(profilePath)}/></div></main><SiteFooter locale={active} dict={dict}/></>;
}
