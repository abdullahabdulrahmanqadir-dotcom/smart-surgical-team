"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowRight, IconSearch } from "./icons";
import { localePath, type Locale } from "../lib/i18n";
import ResearchCover from "./ResearchCover";
import FilterSelect from "./FilterSelect";
import type { Publication, ResearchTopicTree } from "../lib/research";
import type { Dictionary } from "../lib/dictionaries";

const PAGE_SIZE = 9;
const RESEARCH_VIEW_KEY = "sst-research-view";

export default function ResearchExplorer({ publications, topics, locale, t }: { publications: Publication[]; topics: ResearchTopicTree[]; locale: Locale; t: Dictionary["research"] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [topic, setTopic] = useState("all");
  const [subtopic, setSubtopic] = useState("all");
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
    const savedTopic = params.get("topic");
    if (savedTopic) setTopic(savedTopic);
    const savedSubtopic = params.get("subtopic");
    if (savedSubtopic) setSubtopic(savedSubtopic);
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (year !== "all") params.set("year", year);
    if (topic !== "all") params.set("topic", topic);
    if (subtopic !== "all") params.set("subtopic", subtopic);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
    try { sessionStorage.setItem(RESEARCH_VIEW_KEY, search ? `?${search}` : ""); } catch { /* storage unavailable */ }
  }, [query, year, topic, subtopic, page]);
  const years = [...new Set(publications.map((paper) => paper.year))].sort((a, b) => b.localeCompare(a));
  // Only topics that actually hold a published paper: an empty option in a
  // filter is a dead end, and the admin can create a topic before filing
  // anything under it.
  const filledSlugs = useMemo(() => new Set(publications.flatMap((paper) => [paper.topic?.slug, paper.subtopic?.slug].filter(Boolean) as string[])), [publications]);
  const topicOptions = topics.filter((option) => filledSlugs.has(option.slug));
  const subtopicOptions = (topicOptions.find((option) => option.slug === topic)?.subtopics ?? []).filter((option) => filledSlugs.has(option.slug));
  const dateLabel = (paper: Publication) => {
    const parsed = new Date(`${paper.date}T00:00:00`);
    return Number.isNaN(parsed.valueOf()) ? paper.year : new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(parsed);
  };
  const results = useMemo(() => publications.filter((paper) => {
    const needle = query.trim().toLowerCase();
    return (year === "all" || paper.year === year)
      && (topic === "all" || paper.topic?.slug === topic)
      && (subtopic === "all" || paper.subtopic?.slug === subtopic)
      && (!needle || `${paper.title} ${paper.authors} ${paper.abstract}`.toLowerCase().includes(needle));
  }), [publications, query, year, topic, subtopic]);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageWindowStart = Math.min(Math.max(1, safePage - 2), Math.max(1, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageWindowStart + index);
  const displayed = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resetFilters = () => { setQuery(""); setYear("all"); setTopic("all"); setSubtopic("all"); setPage(1); };
  // Changing the topic strands any subtopic chosen under the previous one, so
  // it clears rather than silently filtering everything down to nothing.
  const changeTopic = (value: string) => { setTopic(value); setSubtopic("all"); setPage(1); };
  const updateQuery = (value: string) => { setQuery(value); setPage(1); };
  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("publications")?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  };

  return <section className="research-archive" id="publications" aria-labelledby="publications-heading">
    <div className="research-archive-heading"><h1 id="publications-heading">{t.publications}</h1></div>
    <div className="research-controls" aria-label={t.filterPublications}>
      <label className="research-search"><span>{t.searchPublications}</span><span className="research-search-field"><IconSearch size={18}/><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t.searchPlaceholder} /></span></label>
      <FilterSelect className="research-filter-control" label={t.topic} value={topic} onChange={changeTopic} options={[{ value: "all", label: t.allTopics }, ...topicOptions.map((option) => ({ value: option.slug, label: option.name }))]} />
      <FilterSelect className="research-filter-control" label={t.subtopic} value={subtopic} disabled={topic === "all" || !subtopicOptions.length} onChange={(value) => { setSubtopic(value); setPage(1); }} options={[{ value: "all", label: t.allSubtopics }, ...subtopicOptions.map((option) => ({ value: option.slug, label: option.name }))]} />
      <FilterSelect className="research-filter-control" label={t.year} value={year} onChange={(value) => { setYear(value); setPage(1); }} options={[{ value: "all", label: t.allYears }, ...years.map((value) => ({ value, label: value }))]} />
      {(query || year !== "all" || topic !== "all" || subtopic !== "all") && <button type="button" className="research-clear" onClick={resetFilters}>{t.clear}</button>}
    </div>
    <div className="research-card-grid">{displayed.map((paper) => <Link className="research-card research-card-link" href={localePath(locale, `research/${paper.id}`)} key={paper.id}>
      <ResearchCover title={paper.title} label={paper.topic?.name ?? t.unfiled} palette={paper.palette} paletteKey={paper.journal}/>
      <div className="research-card-copy"><p className="research-authors">{paper.authors}</p><div className="research-card-footer"><p className="research-card-date">{dateLabel(paper)}</p><span className="research-read">{t.readResearch} <IconArrowRight size={16}/></span></div></div>
    </Link>)}</div>
    {totalPages > 1 && <nav className="research-pagination" aria-label={t.publicationPages}><button type="button" onClick={() => goToPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>{t.previous}</button>{pageNumbers.map((number) => <button key={number} type="button" className={number === safePage ? "is-current" : ""} onClick={() => goToPage(number)} aria-current={number === safePage ? "page" : undefined}>{number}</button>)}<button type="button" onClick={() => goToPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>{t.next}</button></nav>}
    {!results.length && <div className="research-empty"><h3>{t.noMatches}</h3><button type="button" onClick={resetFilters}>{t.clearFilters}</button></div>}
  </section>;
}
