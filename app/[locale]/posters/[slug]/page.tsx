/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { IconArrowRight, IconFullscreen } from "../../../components/icons";
import { getDictionary } from "../../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../../lib/i18n";
import { getPoster } from "../../../lib/posters";

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const poster = await getPoster(slug);
  if (!poster) return {};
  return { title: `${poster.title} | Smart Surgical Team`, description: poster.summary, openGraph: { title: poster.title, description: poster.summary, images: [{ url: poster.imageUrl, alt: poster.imageAlt }] } };
}

export default async function PosterDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const poster = await getPoster(slug);
  if (!poster) notFound();

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict}/>
    <main id="main-content" className="poster-detail-page">
      <nav className="poster-breadcrumb" aria-label={dict.posters.breadcrumb}><Link href={localePath(active, "posters")}>{dict.nav.posters}</Link><span>/</span><b>{poster.title}</b></nav>
      <header className="poster-detail-heading"><span className="section-kicker">{poster.label}</span><h1>{poster.title}</h1><p>{poster.summary}</p><small>{poster.authors}</small></header>
      <div className="poster-detail-layout">
        <div>
          <a className="poster-sheet" href={poster.imageUrl} target="_blank" rel="noreferrer" aria-label={dict.posters.openPoster}>
            <img src={poster.imageUrl} alt={poster.imageAlt} width={1280} height={1280}/>
            <span className="poster-sheet-action" aria-hidden="true"><IconFullscreen size={18}/> {dict.posters.openPoster}</span>
          </a>
          <a className="btn btn-outline poster-original" href={poster.imageUrl} target="_blank" rel="noreferrer">{dict.posters.openPoster} <IconArrowRight size={17}/></a>
        </div>
        <article className="poster-written-details">
          <span className="section-kicker">{dict.posters.detailsLabel}</span>
          {poster.sections.length ? poster.sections.map((section) => <section key={section.key}><h2>{section.label}</h2><div className="rich-text" dangerouslySetInnerHTML={{ __html: section.body }}/></section>) : <p>{poster.summary}</p>}
        </article>
      </div>
      <Link className="poster-back" href={localePath(active, "posters")}><IconArrowRight size={16}/> {dict.posters.backToPosters}</Link>
    </main>
    <SiteFooter locale={active} dict={dict}/>
  </>;
}
