"use client";

import { useEffect, useMemo, useState } from "react";
import { IconArrowRight, IconClose, IconFile, IconSearch } from "./icons";
import type { Publication } from "../lib/research";

const PAGE_SIZE = 9;

export default function ResearchExplorer({ publications }: { publications: Publication[] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [activePaper, setActivePaper] = useState<Publication | null>(null);
  const years = [...new Set(publications.map((paper) => paper.year))].sort((a, b) => b.localeCompare(a));
  const categories = [...new Set(publications.map((paper) => paper.category))].sort();
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
  useEffect(() => {
    if (!activePaper) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActivePaper(null); };
    window.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [activePaper]);

  return <section className="research-archive" id="publications" aria-labelledby="publications-heading">
    <div className="research-archive-heading"><h1 id="publications-heading">Research publications</h1></div>
    <div className="research-controls" aria-label="Filter publications"><label className="research-search"><IconSearch size={18}/><span className="visually-hidden">Search publications</span><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search title, author or keyword" /></label><label>Year<select value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }}><option value="all">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label><label>Type<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="all">All types</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>{(query || year !== "all" || category !== "all") && <button type="button" className="research-clear" onClick={resetFilters}>Clear</button>}</div>
    <div className="research-card-grid">{displayed.map((paper) => <article className="research-card" key={paper.id}>
      <div className="research-card-image">{paper.imageUrl ? <img src={paper.imageUrl} alt="" loading="lazy"/> : <IconFile size={34}/>}<span>{paper.category}</span></div>
      <div className="research-card-copy"><p className="research-card-year">{paper.year}</p><h3>{paper.title}</h3><p className="research-authors">{paper.authors}</p><button type="button" className="research-read" onClick={() => setActivePaper(paper)}>Read research <IconArrowRight size={16}/></button></div>
    </article>)}</div>
    {totalPages > 1 && <nav className="research-pagination" aria-label="Publication pages"><button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>Previous</button>{pageNumbers.map((number) => <button key={number} type="button" className={number === safePage ? "is-current" : ""} onClick={() => setPage(number)} aria-current={number === safePage ? "page" : undefined}>{number}</button>)}<button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>Next</button></nav>}
    {!results.length && <div className="research-empty"><h3>No publications match those filters.</h3><button type="button" onClick={resetFilters}>Clear filters</button></div>}
    {activePaper && <div className="research-dialog-backdrop" role="presentation" onMouseDown={() => setActivePaper(null)}><section className="research-dialog" role="dialog" aria-modal="true" aria-labelledby="research-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="research-dialog-close" type="button" onClick={() => setActivePaper(null)} aria-label="Close research preview"><IconClose size={19}/></button>
      <div className="research-dialog-art">{activePaper.imageUrl ? <img src={activePaper.imageUrl} alt=""/> : <IconFile size={40}/>}</div>
      <div className="research-dialog-copy"><span className="section-kicker">{activePaper.category} · {activePaper.year}</span><h2 id="research-dialog-title">{activePaper.title}</h2><p className="research-authors">{activePaper.authors}</p><div className="research-abstract"><h3>Abstract</h3><p>{activePaper.abstract || "The abstract is available on the publisher’s website."}</p></div><a className="btn btn-primary" href={activePaper.link} target="_blank" rel="noreferrer">Continue to publisher <IconArrowRight size={17}/></a></div>
    </section></div>}
  </section>;
}
