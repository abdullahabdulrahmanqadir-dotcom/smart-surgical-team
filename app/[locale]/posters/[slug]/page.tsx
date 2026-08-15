import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ImageGallery from "../../../components/ImageGallery";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import TranslatableContent from "../../../components/TranslatableContent";
import { IconArrowRight } from "../../../components/icons";
import { getDictionary } from "../../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../../lib/i18n";
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
      <nav className="poster-breadcrumb" aria-label={dict.posters.breadcrumb}><Link href={localePath(active, "posters")}>{dict.nav.posters}</Link><span>/</span><b {...authoredTitleProps(poster.title)}>{poster.title}</b></nav>
      <header className="poster-detail-heading"><span className="section-kicker">{poster.label}</span><h1 {...authoredTitleProps(poster.title)}>{poster.title}</h1><p>{poster.summary}</p><small>{poster.authors}</small></header>
      <div className="poster-detail-layout">
        <div className="poster-display"><ImageGallery presentation="poster" images={[{ id: poster.id, publicUrl: poster.imageUrl, altText: poster.imageAlt, caption: poster.title }]} label={dict.posters.openPoster} t={dict.media}/>{poster.cta ? <a className="poster-resource-link" href={poster.cta.url} target="_blank" rel="noopener noreferrer"><span>{poster.cta.text}</span><IconArrowRight size={17}/></a> : null}</div>
        <article className="poster-written-details">
          <span className="section-kicker">{dict.posters.detailsLabel}</span>
          <TranslatableContent
            locale={active}
            autoTranslate
            className="poster-translatable-sections"
            labels={{
              translate: dict.library.translateCase,
              translating: dict.library.translatingCase,
              downloading: dict.library.downloadingModel,
              showOriginal: dict.library.showOriginalCase,
              failed: dict.library.translateFailed,
            }}
          >
            {poster.sections.length ? poster.sections.map((section) => <section key={section.key}><h2>{section.label}</h2><div className="rich-text" dangerouslySetInnerHTML={{ __html: section.body }}/></section>) : <p>{poster.summary}</p>}
          </TranslatableContent>
        </article>
      </div>
      <Link className="poster-back" href={localePath(active, "posters")}><IconArrowRight size={16}/> {dict.posters.backToPosters}</Link>
    </main>
    <SiteFooter locale={active} dict={dict}/>
  </>;
}
