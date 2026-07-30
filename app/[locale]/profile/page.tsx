import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import MemberProfile from "../../components/MemberProfile";
import ScrollMotion from "../../components/ScrollMotion";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><ScrollMotion /><main id="main-content" className="profile-page"><MemberProfile locale={active} initialMember={null}/></main><SiteFooter locale={active} dict={dict}/></>;
}
