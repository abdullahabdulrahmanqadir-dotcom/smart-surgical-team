import type { Metadata } from "next";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ScrollMotion from "../../components/ScrollMotion";
import MemberProfile from "../../components/MemberProfile";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { notFound } from "next/navigation";
import { PRIVATE_PAGE_METADATA } from "../../lib/seo";

export const metadata: Metadata = PRIVATE_PAGE_METADATA;

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);

  return <><a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a><SiteHeader locale={active} dict={dict}/><ScrollMotion /><main id="main-content" className="profile-page"><MemberProfile locale={active} initialMember={null} t={dict.profile} signUpT={dict.signUp}/></main><SiteFooter locale={active} dict={dict}/></>;
}
