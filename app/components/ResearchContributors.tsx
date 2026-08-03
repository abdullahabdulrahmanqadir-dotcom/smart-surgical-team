"use client";

import { useState } from "react";
import { IconUser } from "./icons";

type Contributor = { name: string; portraitUrl?: string };

export default function ResearchContributors({ contributors }: { contributors: Contributor[] }) {
  const [isOpen, setIsOpen] = useState(true);

  return <section className="research-contributors" aria-labelledby="contributors-title">
    <div className="research-contributors-heading"><div className="research-contributor-title"><h2 id="contributors-title">Authors</h2><span className="research-contributor-count">{contributors.length}</span></div><button className="research-contributor-toggle" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-controls="research-contributor-list" aria-label={isOpen ? "Collapse authors" : "Show authors"}>{isOpen ? "−" : "+"}</button></div>
    <div className={`research-contributor-list${isOpen ? " is-open" : ""}`} id="research-contributor-list"><div className="research-contributor-grid">{contributors.map((contributor, index) => <div className="research-contributor" key={`${contributor.name}-${index}`}><span className="research-contributor-avatar">{contributor.portraitUrl ? <img src={contributor.portraitUrl} alt=""/> : <IconUser size={21}/>}</span><span>{contributor.name}</span></div>)}</div></div>
  </section>;
}
