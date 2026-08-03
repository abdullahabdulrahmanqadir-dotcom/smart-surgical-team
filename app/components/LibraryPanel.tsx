"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ContentRecord } from "../lib/content-types";
import { localePath, type Locale } from "../lib/i18n";
import { IconArrowRight, IconChevronDown, IconPlay, IconSearch } from "./icons";

const tabs = ["Videos", "Webinars", "E-Posters"] as const;

function tabFor(item: ContentRecord) {
  if (item.kind === "webinar_recording") return "Webinars";
  if (item.kind === "poster") return "E-Posters";
  return "Videos";
}

export default function LibraryPanel({ items, locale }: { items: ContentRecord[]; locale: Locale }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Videos");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        tabFor(item) === tab &&
        (needle === "" ||
          item.title.toLowerCase().includes(needle) ||
          item.presenter.name.toLowerCase().includes(needle) ||
          item.topic.toLowerCase().includes(needle)),
    );
  }, [tab, query, items]);

  return (
    <article className="panel library-panel" id="library">
      <div className="panel-heading">
        <div>
          <h2>Content Library</h2>
          <p className="panel-sub">Peer-reviewed lectures, recorded webinars and e-posters.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Library content type">
        {tabs.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? "is-active" : undefined} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>

      <div className="library-filter">
        <label className="search-field">
          <IconSearch size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={`Search ${tab.toLowerCase()}`} placeholder={`Search ${tab.toLowerCase()}…`} type="search" />
        </label>
        <button type="button" className="select-button">All topics <IconChevronDown size={16} /></button>
      </div>

      <div className="library-list">
        {visible.map((item, index) => (
          <Link href={localePath(locale, `library/${item.slug}`)} className="library-row" key={item.id}>
            <span className={`media-thumb tone-${(index % 4) + 1}`}>
              <span className="thumb-play"><IconPlay size={14} /></span>
            </span>
            <span className="library-details">
              <span className="library-topic">{item.topic}</span>
              <h3>{item.title}</h3>
              <p>{item.presenter.name}</p>
              {item.progress ? (
                <span className="progress"><span className="progress-track"><span className="progress-fill" style={{ width: `${item.progress}%` }} /></span><span className="progress-value">{item.progress}%</span></span>
              ) : <span className="progress-empty">Not started</span>}
            </span>
          </Link>
        ))}

        {visible.length === 0 && (
          <p className="empty-state">
            {query.trim()
              ? `No ${tab.toLowerCase()} match “${query.trim()}”. Try another search term.`
              : `No ${tab.toLowerCase()} have been published yet.`}
          </p>
        )}
      </div>

      <Link className="panel-link" href={localePath(locale, "topics")}>
        View all {tab.toLowerCase()} <IconArrowRight size={16} />
      </Link>
    </article>
  );
}
