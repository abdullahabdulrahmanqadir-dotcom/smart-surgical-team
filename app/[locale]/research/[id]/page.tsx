import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import ResearchContributors from "../../../components/ResearchContributors";
import ImageGallery from "../../../components/ImageGallery";
import TranslatableContent from "../../../components/TranslatableContent";
import { IconArrowRight, IconCalendar } from "../../../components/icons";
import { proseClass } from "../../../lib/content-types";
import { fill, getDictionary, type Dictionary } from "../../../lib/dictionaries";
import { authoredTitleProps, isLocale, localePath, type Locale } from "../../../lib/i18n";
import { pageMetadata, seoDescription } from "../../../lib/seo";
import { getResearchById } from "../../../lib/research";

function readableDate(value: string, locale: Locale, t: Dictionary["research"]) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value || t.publicationDateUnavailable : new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(date);
}

// Abstracts edited in the admin rich editor arrive as sanitised HTML; older
// imported ones are plain text. Detect a tag and render accordingly.
function isHtml(value: string) {
  return /<\/?[a-z][^>]*>/i.test(value);
}

function abstractParagraphs(abstract: string) {
  const sentences = abstract.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
  return (sentences.length ? sentences : [abstract]).reduce<string[]>((paragraphs, sentence, index) => {
    const paragraph = Math.floor(index / 3);
    paragraphs[paragraph] = `${paragraphs[paragraph] ? `${paragraphs[paragraph]} ` : ""}${sentence}`;
    return paragraphs;
  }, []);
}

function contributorsFor(paper: { authors: string; contributors?: { name: string; portraitUrl?: string }[] }) {
  if (paper.contributors?.length) return paper.contributors;
  return paper.authors.split(/,|\band\b/i).map((name) => name.trim()).filter((name) => name && !/^colleagues$/i.test(name)).map((name) => ({ name }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const active: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(active);
  const paper = await getResearchById(id);
  const summary = paper?.abstract ?? "";
  // The generated cover is the paper's link preview. It no longer appears on
  // this page, but it is still the one image that represents the paper, and
  // without this the SVG endpoint would have no caller at all.
  const description = seoDescription(summary, fill(dict.research.readDescription, { title: paper?.title ?? "" }));
  return paper ? pageMetadata({
    locale: active,
    path: `research/${paper.id}`,
    title: `${paper.title} | ${dict.brand.name}`,
    description,
    image: { url: paper.coverUrl, alt: paper.title },
  }) : { title: `${dict.research.notFound} | ${dict.brand.name}`, robots: { index: false, follow: false } };
}

export default async function ResearchDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const paper = await getResearchById(id);
  if (!paper) notFound();
  const dict = getDictionary(active);
  const contributors = contributorsFor(paper);
  // Only the paper's own figures. The cover is generated from the title now,
  // so there is no uploaded cover image to lead the gallery with.
  const researchImages = (paper.media ?? []).map((item, index) => ({ id: `figure-${index}`, publicUrl: item.publicUrl, altText: item.altText, caption: item.caption }));

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict}/>
    <main id="main-content" className="research-detail-page">
      <nav className="research-breadcrumb" aria-label={dict.research.breadcrumb}><Link href={localePath(active, "research")}>{dict.research.research}</Link><span>/</span><b {...authoredTitleProps(paper.title)}>{paper.title}</b></nav>
      {/* Plain heading, not a cover panel. The generated cover earns its place
          in the grid, where it distinguishes one card from the next; on the
          paper's own page there is nothing to distinguish it from, and setting
          the title inside artwork only pushed the abstract further down. */}
      <header className="research-detail-hero"><div className="research-detail-heading" {...authoredTitleProps(paper.title)}><span className="section-kicker">{[paper.topic?.name, paper.subtopic?.name].filter(Boolean).join(" · ") || dict.research.unfiled} · {paper.year}</span><h1>{paper.title}</h1></div></header>
      <div className="research-detail-grid">
        <article className="research-detail-main"><ResearchContributors contributors={contributors} t={dict.research}/><section className="research-abstract-section" aria-labelledby="abstract-title"><h2 id="abstract-title">{dict.research.abstract}</h2><TranslatableContent
          locale={active}
          autoTranslate={active === "ar"}
          className={proseClass("research-detail-abstract", paper.justifyBody)}
          labels={{
            translate: dict.library.translateCase,
            translating: dict.library.translatingCase,
            downloading: dict.library.downloadingModel,
            showOriginal: dict.library.showOriginalCase,
            failed: dict.library.translateFailed,
          }}
        >
          {paper.abstract && isHtml(paper.abstract) ? <div dangerouslySetInnerHTML={{ __html: paper.abstract }}/> : abstractParagraphs(paper.abstract || dict.research.abstractFallback).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </TranslatableContent></section></article>
        <aside className="research-detail-aside">{researchImages.length > 0 && <ImageGallery images={researchImages} label={dict.research.images} t={dict.media}/>}<section className="research-metadata"><span className="aside-label">{dict.research.publicationDetails}</span><dl><div><dt>{dict.research.topicLabel}</dt><dd>{paper.topic?.name ?? dict.research.unfiled}</dd></div>{paper.journal && <div><dt>{dict.research.journal}</dt><dd>{paper.journal}</dd></div>}<div><dt>{dict.research.published}</dt><dd><IconCalendar size={16}/>{readableDate(paper.date, active, dict.research)}</dd></div></dl><a className="btn btn-primary research-paper-link" href={paper.link} target="_blank" rel="noreferrer">{dict.research.openPaper} <IconArrowRight size={17}/></a></section><Link className="research-back-link" href={localePath(active, "research")}><IconArrowRight size={16}/>{dict.research.backToResearch}</Link></aside>
      </div>
    </main>
    <SiteFooter locale={active} dict={dict}/>
  </>;
}
