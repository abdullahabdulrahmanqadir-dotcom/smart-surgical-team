"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { Dictionary } from "../lib/dictionaries";
import type { Locale } from "../lib/i18n";
import { localePath } from "../lib/i18n";
import type { TopicGroup } from "../lib/topics";
import TopicGlyph from "./TopicGlyph";
import { IconArrowRight, IconFile, IconSparkle } from "./icons";

/**
 * Temporary visual prototypes only. Replace all anatomy model renders with a
 * medically validated, licensed 3D asset before publishing this experience.
 */
const focusedViews: Record<string, string> = {
  "thyroid-parathyroid": "/anatomy-focus-thyroid.png",
  "salivary-glands": "/anatomy-focus-parotid.png",
  "neck-lymphatic": "/anatomy-focus-lymph.png",
  "skin-soft-tissue": "/anatomy-focus-skin.png",
};

function HeadNeckMap({ active }: { active: string | null }) {
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

/** Does a plain click want an in-page action rather than a real navigation? */
function isPlainClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function firstSub(group: TopicGroup | undefined) {
  return group?.subTopics[0]?.slug ?? null;
}

export default function TopicsExplorer({
  groups,
  locale,
  t,
  initialSlug,
}: {
  groups: TopicGroup[];
  locale: Locale;
  /** The `topics` slice of the dictionary — only strings this component needs. */
  t: Dictionary["topics"];
  /** When set (a `/topics/[slug]` deep-link), the explorer opens on this group. */
  initialSlug?: string;
}) {
  const initial = initialSlug && groups.some((group) => group.slug === initialSlug) ? initialSlug : null;
  const [selected, setSelected] = useState<string | null>(initial);
  const activeGroup = selected ? groups.find((group) => group.slug === selected) : undefined;
  const [openSub, setOpenSub] = useState<string | null>(firstSub(groups.find((group) => group.slug === initial)));

  // Keep the address bar in step with in-page selection so any state is
  // shareable, and mirror the browser back/forward buttons back into state.
  useEffect(() => {
    function onPop() {
      const match = window.location.pathname.match(/\/topics\/([^/?#]+)/);
      const slug = match && groups.some((group) => group.slug === match[1]) ? match[1] : null;
      setSelected(slug);
      setOpenSub(firstSub(groups.find((group) => group.slug === slug)));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [groups]);

  function open(slug: string) {
    const group = groups.find((candidate) => candidate.slug === slug);
    setSelected(slug);
    setOpenSub(firstSub(group));
    window.history.pushState({}, "", localePath(locale, `topics/${slug}`));
  }

  function close() {
    setSelected(null);
    setOpenSub(null);
    window.history.pushState({}, "", localePath(locale, "topics"));
  }

  function onSelect(event: MouseEvent, slug: string) {
    if (!isPlainClick(event)) return; // let modified clicks open in a new tab
    event.preventDefault();
    if (slug === selected) close();
    else open(slug);
  }

  const activeSubName = activeGroup?.subTopics.find((sub) => sub.slug === openSub)?.name;
  const guideIntro = activeGroup
    ? t.guideIntroActive.replace("{name}", activeGroup.name)
    : t.guideIntro;

  return (
    <section className="topics-explorer" aria-labelledby="topics-explorer-heading">
      <div className="topics-explorer-intro">
        <p className="section-kicker">{t.guideKicker}</p>
        <h2 id="topics-explorer-heading">{t.guideTitle}</h2>
        <p aria-live="polite">{guideIntro}</p>
      </div>

      <div className="topics-explorer-stage">
        <HeadNeckMap active={selected} />
        <div className="anatomy-map-label anatomy-map-label--thyroid-parathyroid">Thyroid</div>
        <div className="anatomy-map-label anatomy-map-label--salivary-glands">Salivary glands</div>
        <div className="anatomy-map-label anatomy-map-label--neck-lymphatic">Lymph nodes</div>
        <div className="anatomy-map-label anatomy-map-label--skin-soft-tissue">Skin lesion</div>
      </div>

      {/* Level 1 — region chooser. Always visible so the user can switch
          topics. Real links so the deep-link routes stay crawlable and the
          experience works without JavaScript; the client intercepts plain
          clicks to keep everything on one page. */}
      <div className="topics-explorer-grid" aria-label="Topic areas">
        {groups.map((group) => {
          const isActive = selected === group.slug;
          return (
            <a
              key={group.slug}
              className={`topic-selector${isActive ? " is-active" : ""}`}
              href={localePath(locale, `topics/${group.slug}`)}
              aria-current={isActive ? "true" : undefined}
              onClick={(event) => onSelect(event, group.slug)}
            >
              <span className="topic-selector-glyph">
                <TopicGlyph icon={group.icon} imageIcon={group.imageIcon} size={38} />
              </span>
              <span>
                <strong>{group.name}</strong>
                <small>{group.blurb}</small>
              </span>
            </a>
          );
        })}
      </div>

      {/* Level 2/3 — only the chosen topic's branch is in the flow. */}
      {activeGroup ? (
        <div className="topic-branch" key={activeGroup.slug}>
          <div className="topic-branch-head">
            <span
              className={`topic-detail-glyph${activeGroup.imageIcon ? " topic-glyph-image" : ""}`}
              aria-hidden="true"
            >
              <TopicGlyph icon={activeGroup.icon} imageIcon={activeGroup.imageIcon} size={58} />
            </span>
            <div>
              <p className="section-kicker">{t.focusAreas}</p>
              <h3>{activeGroup.name}</h3>
              <p className="topic-branch-intro">{activeGroup.intro}</p>
            </div>
          </div>

          <div className="topic-detail-grid">
            <div className="subtopic-list">
              {activeGroup.subTopics.map((sub, index) => {
                const isOpen = openSub === sub.slug;
                return (
                  <button
                    type="button"
                    key={sub.slug}
                    className={`subtopic-item${isOpen ? " is-open" : ""}`}
                    aria-expanded={isOpen}
                    aria-controls={`topic-leaf-${activeGroup.slug}`}
                    onClick={() => setOpenSub(sub.slug)}
                  >
                    <span className="subtopic-number" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="subtopic-icon" aria-hidden="true">
                      <TopicGlyph icon={activeGroup.icon} imageIcon={sub.imageIcon} size={46} />
                    </span>
                    <span className="subtopic-name">{sub.name}</span>
                    <IconArrowRight className="subtopic-arrow" size={16} />
                  </button>
                );
              })}
            </div>

            {/* Level 3 — honest empty state. The container Phase 2 fills. */}
            <aside
              className="topic-empty-state"
              id={`topic-leaf-${activeGroup.slug}`}
              role="region"
              aria-live="polite"
            >
              <span className="topic-empty-icon" aria-hidden="true">
                <IconFile size={26} />
                <IconSparkle className="topic-empty-sparkle" size={16} />
              </span>
              <p className="section-kicker">
                {activeSubName
                  ? `${t.collectionKicker} · ${activeSubName}`
                  : t.collectionKicker}
              </p>
              <h2>{t.collectionTitle}</h2>
              <p>{t.collectionBody}</p>
            </aside>
          </div>

          <div className="topic-branch-more">
            <p className="section-kicker">{t.otherTopics}</p>
            <div className="topic-related-grid">
              {groups
                .filter((group) => group.slug !== activeGroup.slug)
                .map((group) => (
                  <a
                    key={group.slug}
                    className="topic-related-card"
                    href={localePath(locale, `topics/${group.slug}`)}
                    onClick={(event) => onSelect(event, group.slug)}
                  >
                    <span className="topic-related-glyph" aria-hidden="true">
                      <TopicGlyph icon={group.icon} imageIcon={group.imageIcon} size={40} />
                    </span>
                    <strong>{group.name}</strong>
                    <IconArrowRight className="topic-related-arrow" size={16} />
                  </a>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="topic-branch topic-branch--empty">
          <p>{t.chooseRegion}</p>
        </div>
      )}
    </section>
  );
}
