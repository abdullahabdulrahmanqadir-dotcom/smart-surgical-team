"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "../lib/i18n";
import { localePath } from "../lib/i18n";
import type { TopicGroup } from "../lib/topics";
import TopicGlyph from "./TopicGlyph";
import { IconArrowRight, IconFile } from "./icons";

type Region = "thyroid-parathyroid" | "salivary-glands" | "neck-lymphatic" | "skin-soft-tissue";

/**
 * Temporary visual prototypes only. Replace all anatomy model renders with a
 * medically validated, licensed 3D asset before publishing this experience.
 */
const focusedViews: Record<Region, string> = {
  "thyroid-parathyroid": "/anatomy-focus-thyroid.png",
  "salivary-glands": "/anatomy-focus-parotid.png",
  "neck-lymphatic": "/anatomy-focus-lymph.png",
  "skin-soft-tissue": "/anatomy-focus-skin.png",
};

function HeadNeckMap({ active }: { active: Region | null }) {
  return (
    <div className={`anatomy-model${active ? ` anatomy-model--${active}` : ""}`} aria-hidden="true">
      {/* Static delivery avoids the Next Image compatibility route used by vinext. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="anatomy-model-overview" src="/anatomy-topics-model-v2.png" alt="" />
      {Object.entries(focusedViews).map(([region, src]) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={`anatomy-model-focus anatomy-model-focus--${region}${active === region ? " is-visible" : ""}`} src={src} alt="" key={region} />
      ))}
      <span className="model-hotspot model-hotspot--thyroid-parathyroid" />
      <span className="model-hotspot model-hotspot--salivary-glands" />
      <span className="model-hotspot model-hotspot--neck-lymphatic" />
      <span className="model-hotspot model-hotspot--skin-soft-tissue" />
    </div>
  );
}

export default function TopicsExplorer({ groups, locale }: { groups: TopicGroup[]; locale: Locale }) {
  const [selected, setSelected] = useState<Region | null>(null);
  const active = selected ? groups.find((group) => group.slug === selected) : undefined;
  return (
    <section className="topics-explorer" aria-labelledby="topics-explorer-heading">
      <div className="topics-explorer-intro">
        <p className="section-kicker">Anatomical guide</p>
        <h2 id="topics-explorer-heading">Start with the region</h2>
        <p>{active ? `Focused on ${active.name}. Choose a learning area below or open the complete collection.` : "Select a highlighted area or one of the topic cards to move from the whole head and neck to a focused surgical view."}</p>
      </div>
      <div className="topics-explorer-stage" aria-live="polite">
        <HeadNeckMap active={selected} />
        <div className="anatomy-map-label anatomy-map-label--thyroid-parathyroid">Thyroid</div>
        <div className="anatomy-map-label anatomy-map-label--salivary-glands">Salivary glands</div>
        <div className="anatomy-map-label anatomy-map-label--neck-lymphatic">Lymph nodes</div>
        <div className="anatomy-map-label anatomy-map-label--skin-soft-tissue">Skin lesion</div>
      </div>
      <div className="topics-explorer-grid" aria-label="Topic areas">
        {groups.map((group) => {
          const isActive = selected === group.slug;
          return <button key={group.slug} className={`topic-selector${isActive ? " is-active" : ""}`} type="button" onClick={() => setSelected(group.slug as Region)} aria-pressed={isActive}>
            <span className="topic-selector-glyph"><TopicGlyph icon={group.icon} imageIcon={group.imageIcon} size={38} /></span>
            <span><strong>{group.name}</strong><small>{group.blurb}</small></span>
          </button>;
        })}
      </div>
      <div className="topic-library" aria-labelledby="topic-library-heading">
        <div className="topic-library-heading">
          <div>
            <p className="section-kicker">Learning library</p>
            <h3 id="topic-library-heading">Browse by surgical area</h3>
          </div>
          <p>Open a category overview or a focused learning area to begin reading.</p>
        </div>

        <div className="topic-library-sections">
          {groups.map((group) => {
            const isSelected = selected === group.slug;
            return (
              <section className={`topic-library-section${isSelected ? " is-selected" : ""}`} key={group.slug} aria-labelledby={`${group.slug}-heading`}>
                <div className="topic-library-section-head">
                  <span className="topic-selector-glyph" aria-hidden="true">
                    <TopicGlyph icon={group.icon} imageIcon={group.imageIcon} size={34} />
                  </span>
                  <div>
                    <h4 id={`${group.slug}-heading`}>{group.name}</h4>
                    <p>{group.blurb}</p>
                  </div>
                </div>
                <div className="topic-content-grid">
                  <Link className="topic-content-card topic-content-card--overview" href={localePath(locale, `topics/${group.slug}`)}>
                    <span className="topic-content-card-icon" aria-hidden="true"><IconFile size={18} /></span>
                    <span className="topic-content-type">Category guide</span>
                    <strong>{group.name} overview</strong>
                    <span className="topic-content-open">Open guide <IconArrowRight size={15} /></span>
                  </Link>
                  {group.subTopics.map((subtopic) => (
                    <Link className="topic-content-card" href={localePath(locale, `topics/${group.slug}`)} key={subtopic.slug}>
                      <span className="topic-content-card-icon" aria-hidden="true">
                        <TopicGlyph icon={group.icon} imageIcon={subtopic.imageIcon} size={25} />
                      </span>
                      <span className="topic-content-type">Focused learning area</span>
                      <strong>{subtopic.name}</strong>
                      <span className="topic-content-open">Explore <IconArrowRight size={15} /></span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
