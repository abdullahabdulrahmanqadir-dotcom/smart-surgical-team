/* Local and R2 poster images are already served at their final URLs. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { IconArrowRight } from "../../components/icons";
import { getDictionary } from "../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../lib/i18n";
import { getPosters, type PosterEntry } from "../../lib/posters";
import { pageMetadata } from "../../lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const posters = await getPosters();
  return pageMetadata({
    locale: active,
    path: "posters",
    title: dict.seo.postersTitle,
    description: dict.seo.postersDescription,
    image: posters[0] ? { url: posters[0].imageUrl, alt: posters[0].imageAlt } : undefined,
  });
}

function PosterCard({ poster, locale, label }: { poster: PosterEntry; locale: Locale; label: string }) {
  return <Link className="poster-card" href={localePath(locale, `posters/${poster.slug}`)} aria-label={`${label}: ${poster.title}`}>
    <span className="poster-card-image"><img src={poster.imageUrl} alt="" loading="lazy" width={640} height={640}/></span>
    <span className="poster-card-copy"><small>{poster.label}</small><strong {...authoredTitleProps(poster.title)}>{poster.title}</strong><span>{label} <IconArrowRight size={16}/></span></span>
  </Link>;
}

export default async function PostersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const dict = getDictionary(active);
  const t = dict.posters;
  const [featured, ...archive] = await getPosters();

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict}/>
    <main id="main-content" className="posters-page">
      <header className="posters-intro">
        <h1>{t.heroTitle}</h1>
      </header>

      {featured && <article className="poster-feature" aria-labelledby="featured-poster-title">
        <Link className="poster-sheet" href={localePath(active, `posters/${featured.slug}`)} aria-label={`${t.viewDetails}: ${featured.title}`}>
          <img src={featured.imageUrl} alt={featured.imageAlt} width={1280} height={1280} fetchPriority="high"/>
        </Link>
        <div className="poster-details">
          <span className="poster-featured-label">{t.featured}</span>
          <span className="poster-study-type">{featured.label}</span>
          <h2 id="featured-poster-title" {...authoredTitleProps(featured.title)}>{featured.title}</h2>
          <p className="poster-summary">{featured.summary}</p>
          <Link className="btn btn-primary btn-lg poster-open" href={localePath(active, `posters/${featured.slug}`)}>{t.viewDetails} <IconArrowRight size={18}/></Link>
        </div>
      </article>}

      {archive.length > 0 && <section className="poster-archive" aria-labelledby="poster-archive-title">
        <div className="poster-archive-heading"><h2 id="poster-archive-title">{t.archiveTitle}</h2></div>
        <div className="poster-card-grid">{archive.map((poster) => <PosterCard key={poster.id} poster={poster} locale={active} label={t.viewDetails}/>)}</div>
      </section>}
    </main>
    <SiteFooter locale={active} dict={dict}/>
  </>;
}
