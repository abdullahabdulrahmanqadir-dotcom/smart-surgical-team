import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsExplorer from "../../components/NewsExplorer";
import ScrollMotion from "../../components/ScrollMotion";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { getDictionary } from "../../lib/dictionaries";
import { isLocale, type Locale } from "../../lib/i18n";
import { getNewsCategories, getNewsItems } from "../../lib/news";
import { pageMetadata } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  return pageMetadata({ locale: active, path: "news", title: dict.seo.newsTitle, description: dict.seo.newsDescription });
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const [items, categories] = await Promise.all([getNewsItems(), getNewsCategories()]);
  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict}/>
    <ScrollMotion/>
    <main id="main-content" className="news-page">
      <NewsExplorer locale={active} items={items} categories={categories} t={dict.news}/>
    </main>
    <SiteFooter locale={active} dict={dict}/>
  </>;
}
