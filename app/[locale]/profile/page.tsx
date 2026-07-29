import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import MemberProfile from "../../components/MemberProfile";
import { chatGPTSignOutPath, getChatGPTUser } from "../../chatgpt-auth";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const user = await getChatGPTUser();
  const initialMember = user ? { name: user.fullName ?? user.displayName, email: user.email } : null;

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><main id="main-content" className="profile-page"><MemberProfile locale={active} initialMember={initialMember} chatGPTSignOutPath={chatGPTSignOutPath(localePath(active))}/></main><SiteFooter locale={active} dict={dict}/></>;
}
