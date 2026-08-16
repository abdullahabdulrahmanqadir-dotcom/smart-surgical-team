"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowRight, IconSearch } from "./icons";
import { authoredTitleProps, localePath, type Locale } from "../lib/i18n";
import type { Publication } from "../lib/research";
import type { Dictionary } from "../lib/dictionaries";

const PAGE_SIZE = 9;
const RESEARCH_VIEW_KEY = "sst-research-view";

export default function ResearchExplorer({ publications, locale, t }: { publications: Publication[]; locale: Locale; t: Dictionary["research"] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  // The page number and filters live in the URL, so opening a paper and coming
  // back returns to the same page of results rather than resetting to the
  // first. Reading them after mount (rather than in the initial state) keeps
  // the server and client markup identical; `restored` stops the sync below
  // from writing the defaults over the URL before that read happens.
  // The breadcrumb and "Back to all research" links point at the bare
  // /research path, so the URL alone cannot carry the reader back to where
  // they were. The last view is kept for the tab so those links land on it
  // too; it is deliberately per-tab, so a fresh visit starts clean.
  const restored = useRef(false);
  useEffect(() => {
    let search = window.location.search;
    if (!search) {
      try { search = sessionStorage.getItem(RESEARCH_VIEW_KEY) ?? ""; } catch { /* storage unavailable */ }
    }
    const params = new URLSearchParams(search);
    const savedPage = Number(params.get("page"));
    if (Number.isFinite(savedPage) && savedPage > 1) setPage(savedPage);
    const savedQuery = params.get("q");
    if (savedQuery) setQuery(savedQuery);
    const savedYear = params.get("year");
    if (savedYear) setYear(savedYear);
    const savedCategory = params.get("type");
    if (savedCategory) setCategory(savedCategory);
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (year !== "all") params.set("year", year);
    if (category !== "all") params.set("type", category);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
    try { sessionStorage.setItem(RESEARCH_VIEW_KEY, search ? `?${search}` : ""); } catch { /* storage unavailable */ }
  }, [query, year, category, page]);
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
      <div className="research-card-image"><img src={paper.coverUrl} alt="" loading="lazy"/><span>{paper.category}</span></div>
      <div className="research-card-copy"><p className="research-card-year">{paper.year}</p><h3 {...authoredTitleProps(paper.title)}>{paper.title}</h3><p className="research-authors">{paper.authors}</p><span className="research-read">{t.readResearch} <IconArrowRight size={16}/></span></div>
    </Link>)}</div>
    {totalPages > 1 && <nav className="research-pagination" aria-label={t.publicationPages}><button type="button" onClick={() => goToPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>{t.previous}</button>{pageNumbers.map((number) => <button key={number} type="button" className={number === safePage ? "is-current" : ""} onClick={() => goToPage(number)} aria-current={number === safePage ? "page" : undefined}>{number}</button>)}<button type="button" onClick={() => goToPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>{t.next}</button></nav>}
    {!results.length && <div className="research-empty"><h3>{t.noMatches}</h3><button type="button" onClick={resetFilters}>{t.clearFilters}</button></div>}
  </section>;
}
