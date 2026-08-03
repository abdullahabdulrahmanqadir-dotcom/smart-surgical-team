import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import ResearchContributors from "../../../components/ResearchContributors";
import { IconArrowRight, IconCalendar, IconGlobe } from "../../../components/icons";
import { getDictionary } from "../../../lib/dictionaries";
import { isLocale, localePath, type Locale } from "../../../lib/i18n";
import { getResearchById } from "../../../lib/research";

function readableDate(value: string, locale: Locale) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value || "Publication date unavailable" : new Intl.DateTimeFormat(locale === "ckb" ? "ku" : locale, { year: "numeric", month: "long", day: "numeric" }).format(date);
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const paper = await getResearchById((await params).id);
  return paper ? { title: `${paper.title} | Smart Surgical Team`, description: paper.abstract || `Read ${paper.title}.` } : { title: "Research not found | Smart Surgical Team" };
}

export default async function ResearchDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const active: Locale = locale;
  const paper = await getResearchById(id);
  if (!paper) notFound();
  const dict = getDictionary(active);
  const contributors = contributorsFor(paper);

  return <>
    <a className="skip-link" href="#main-content">{dict.nav.skipToContent}</a>
    <SiteHeader locale={active} dict={dict}/>
    <main id="main-content" className="research-detail-page">
      <nav className="research-breadcrumb" aria-label="Breadcrumb"><Link href={localePath(active, "research")}>Research</Link><span>/</span><b>{paper.title}</b></nav>
      <header className="research-detail-hero"><div className="research-detail-heading"><span className="section-kicker">{paper.category} · {paper.year}</span><h1>{paper.title}</h1></div></header>
      <div className="research-detail-grid">
        <article className="research-detail-main"><ResearchContributors contributors={contributors}/><section className="research-abstract-section" aria-labelledby="abstract-title"><span className="section-kicker">Research summary</span><h2 id="abstract-title">Abstract</h2><div className="research-detail-abstract">{abstractParagraphs(paper.abstract || "The abstract is available on the publisher’s website.").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section></article>
        <aside className="research-detail-aside"><section className="research-metadata"><span className="aside-label">Publication details</span><dl><div><dt>Type</dt><dd>{paper.category}</dd></div><div><dt>Published</dt><dd><IconCalendar size={16}/>{readableDate(paper.date, active)}</dd></div><div><dt>Journal</dt><dd><IconGlobe size={16}/>{paper.journal}</dd></div></dl><a className="btn btn-primary research-paper-link" href={paper.link} target="_blank" rel="noreferrer">Open paper <IconArrowRight size={17}/></a></section><Link className="research-back-link" href={localePath(active, "research")}>Back to all research <IconArrowRight size={16}/></Link></aside>
      </div>
    </main>
    <SiteFooter locale={active} dict={dict}/>
  </>;
}
