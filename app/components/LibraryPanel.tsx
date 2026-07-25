"use client";

import { useMemo, useState } from "react";
import { IconArrowRight, IconChevronDown, IconPlay, IconSearch } from "./icons";

type LibraryItem = {
  title: string;
  presenter: string;
  duration: string;
  progress: number;
  topic: string;
  kind: "Videos" | "Webinars" | "E-Posters";
};

const items: LibraryItem[] = [
  {
    title: "Transoral Robotic Surgery for Oropharyngeal Cancer",
    presenter: "Dr. Karzan Ahmed",
    duration: "18:24",
    progress: 65,
    topic: "Oncology",
    kind: "Videos",
  },
  {
    title: "Selective Neck Dissection: Levels II–IV",
    presenter: "Dr. Shwan Omer",
    duration: "14:02",
    progress: 42,
    topic: "Oncology",
    kind: "Videos",
  },
  {
    title: "Thyroidectomy: Tips for Safe Parathyroid Preservation",
    presenter: "Dr. Ava Rashid",
    duration: "22:31",
    progress: 80,
    topic: "Thyroid",
    kind: "Videos",
  },
  {
    title: "Airway Management in Advanced Laryngeal Disease",
    presenter: "Dr. Shwan Omer",
    duration: "48:10",
    progress: 0,
    topic: "Larynx",
    kind: "Webinars",
  },
  {
    title: "Reconstruction of Mandibular Defects: Panel Discussion",
    presenter: "Dr. Karzan Ahmed",
    duration: "52:44",
    progress: 30,
    topic: "Reconstruction",
    kind: "Webinars",
  },
  {
    title: "Outcomes of Transoral Robotic Surgery — Cohort Review",
    presenter: "Dr. Shwan Omer et al.",
    duration: "12 pages",
    progress: 0,
    topic: "Oncology",
    kind: "E-Posters",
  },
  {
    title: "Parotid Surgery: Facial Nerve Mapping Atlas",
    presenter: "Dr. Ava Rashid et al.",
    duration: "8 pages",
    progress: 0,
    topic: "Salivary",
    kind: "E-Posters",
  },
];

const tabs = ["Videos", "Webinars", "E-Posters"] as const;

export default function LibraryPanel() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Videos");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.kind === tab &&
        (needle === "" ||
          item.title.toLowerCase().includes(needle) ||
          item.presenter.toLowerCase().includes(needle) ||
          item.topic.toLowerCase().includes(needle)),
    );
  }, [tab, query]);

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
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? "is-active" : undefined}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="library-filter">
        <label className="search-field">
          <IconSearch size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={`Search ${tab.toLowerCase()}`}
            placeholder={`Search ${tab.toLowerCase()}…`}
            type="search"
          />
        </label>
        <button type="button" className="select-button">
          All topics
          <IconChevronDown size={16} />
        </button>
      </div>

      <div className="library-list">
        {visible.map((item, index) => (
          <a href="#join" className="library-row" key={item.title}>
            <span className={`media-thumb tone-${(index % 4) + 1}`}>
              <span className="thumb-play">
                <IconPlay size={14} />
              </span>
              <small>{item.duration}</small>
            </span>
            <span className="library-details">
              <span className="library-topic">{item.topic}</span>
              <h3>{item.title}</h3>
              <p>{item.presenter}</p>
              {item.progress > 0 ? (
                <span className="progress">
                  <span className="progress-track">
                    <span className="progress-fill" style={{ width: `${item.progress}%` }} />
                  </span>
                  <span className="progress-value">{item.progress}%</span>
                </span>
              ) : (
                <span className="progress-empty">Not started</span>
              )}
            </span>
          </a>
        ))}

        {visible.length === 0 && (
          <p className="empty-state">
            No {tab.toLowerCase()} match “{query.trim()}”. Try another search term.
          </p>
        )}
      </div>

      <a className="panel-link" href="#join">
        View all {tab.toLowerCase()}
        <IconArrowRight size={16} />
      </a>
    </article>
  );
}
