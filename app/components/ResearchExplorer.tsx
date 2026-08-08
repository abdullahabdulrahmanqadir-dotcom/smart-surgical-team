"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconArrowRight, IconFile, IconSearch } from "./icons";
import { localePath, type Locale } from "../lib/i18n";
import type { Publication } from "../lib/research";
import type { Dictionary } from "../lib/dictionaries";

const PAGE_SIZE = 9;

export default function ResearchExplorer({ publications, locale, t }: { publications: Publication[]; locale: Locale; t: Dictionary["research"] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const years = [...new Set(publications.map((paper) => paper.year))].sort((a, b) => b.localeCompare(a));
  const categories = [...new Set(publications.map((paper) => paper.category))].sort();
  const categoryLabel = (value: string) => ({ Publication: t.publication, Article: t.article, "Clinical study": t.clinicalStudy, Review: t.review }[value] ?? value);
  const results = useMemo(() => publications.filter((paper) => {
    const needle = query.trim().toLowerCase();
    return (year === "all" || paper.year === year) && (category === "all" || paper.category === category) && (!needle || `${paper.title} ${paper.authors} ${paper.abstract}`.toLowerCase().includes(needle));
  }), [publications, query, year, category]);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageWindowStart = Math.min(Math.max(1, safePage - 2), Math.max(1, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageWindowStart + index);
  const displayed = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resetFilters = () => { setQuery(""); setYear("all"); setCategory("all"); setPage(1); };
  const updateQuery = (value: string) => { setQuery(value); setPage(1); };
  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("publications")?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  };

  return <section className="research-archive" id="publications" aria-labelledby="publications-heading">
    <div className="research-archive-heading"><h1 id="publications-heading">{t.publications}</h1></div>
    <div className="research-controls" aria-label={t.filterPublications}><label className="research-search"><IconSearch size={18}/><span className="visually-hidden">{t.searchPublications}</span><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t.searchPlaceholder} /></label><label>{t.year}<select value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }}><option value="all">{t.allYears}</option>{years.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label>{t.type}<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="all">{t.allTypes}</option>{categories.map((value) => <option value={value} key={value}>{categoryLabel(value)}</option>)}</select></label>{(query || year !== "all" || category !== "all") && <button type="button" className="research-clear" onClick={resetFilters}>{t.clear}</button>}</div>
    <div className="research-card-grid">{displayed.map((paper) => <Link className="research-card research-card-link" href={localePath(locale, `research/${paper.id}`)} key={paper.id}>
      <div className="research-card-image">{paper.imageUrl ? <img src={paper.imageUrl} alt="" loading="lazy"/> : <IconFile size={34}/>}<span>{paper.category}</span></div>
      <div className="research-card-copy"><p className="research-card-year">{paper.year}</p><h3>{paper.title}</h3><p className="research-authors">{paper.authors}</p><span className="research-read">{t.readResearch} <IconArrowRight size={16}/></span></div>
    </Link>)}</div>
    {totalPages > 1 && <nav className="research-pagination" aria-label={t.publicationPages}><button type="button" onClick={() => goToPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>{t.previous}</button>{pageNumbers.map((number) => <button key={number} type="button" className={number === safePage ? "is-current" : ""} onClick={() => goToPage(number)} aria-current={number === safePage ? "page" : undefined}>{number}</button>)}<button type="button" onClick={() => goToPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>{t.next}</button></nav>}
    {!results.length && <div className="research-empty"><h3>{t.noMatches}</h3><button type="button" onClick={resetFilters}>{t.clearFilters}</button></div>}
  </section>;
}
