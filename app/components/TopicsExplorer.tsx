"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { Dictionary } from "../lib/dictionaries";
import type { Locale } from "../lib/i18n";
import { localePath } from "../lib/i18n";
import type { SubTopic, TopicGroup } from "../lib/topics";
import TopicGlyph from "./TopicGlyph";
import { IconArrowRight, IconFile, IconSparkle, IconPlay } from "./icons";

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

/**
 * A single case-video box. PLACEHOLDER: the case is a real example from the
 * team's current archive and has no destination yet, so the card is a static
 * preview rather than a link. Phase 2 turns it into a link to the real video.
 */
function CaseCard({ item, t }: { item: NonNullable<SubTopic["cases"]>[number]; t: Dictionary["topics"] }) {
  return (
    <article className="case-card">
      <span className="case-card-type">
        {item.hasVideo ? (
          <>
            <IconPlay size={14} /> {t.caseVideoLabel}
          </>
        ) : (
          <>
            <IconFile size={14} /> {t.caseReadLabel}
          </>
        )}
      </span>
      <h4 className="case-card-title">{item.title}</h4>
      <p className="case-card-summary">{item.summary}</p>
      <span className="case-card-foot">
        <span>{item.date}</span>
        <span aria-hidden="true">·</span>
        <span>
          {item.readMinutes} {t.minRead}
        </span>
      </span>
    </article>
  );
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

  const activeCondition = activeGroup?.subTopics.find((sub) => sub.slug === openSub);
  const activeCases = activeCondition?.cases ?? [];
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

      {/* Level 2/3 — only the chosen topic's branch is in the flow. Conditions
          run horizontally; the chosen condition's case videos sit below. */}
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
              <p className="section-kicker">{activeGroup.name}</p>
              <h3>{t.conditions}</h3>
              <p className="topic-branch-intro">{activeGroup.intro}</p>
            </div>
          </div>

          {/* Conditions — horizontal, selectable. */}
          <div className="condition-rail" role="tablist" aria-label={t.conditions}>
            {activeGroup.subTopics.map((sub) => {
              const isOpen = openSub === sub.slug;
              const count = sub.cases?.length ?? 0;
              return (
                <button
                  type="button"
                  key={sub.slug}
                  role="tab"
                  aria-selected={isOpen}
                  aria-controls={`cases-${activeGroup.slug}`}
                  className={`condition-chip${isOpen ? " is-open" : ""}`}
                  onClick={() => setOpenSub(sub.slug)}
                >
                  <span className="condition-chip-glyph" aria-hidden="true">
                    <TopicGlyph icon={activeGroup.icon} imageIcon={sub.imageIcon} size={30} />
                  </span>
                  <span className="condition-chip-name">{sub.name}</span>
                  {count > 0 ? <span className="condition-chip-count">{count}</span> : null}
                </button>
              );
            })}
          </div>

          {/* Case videos for the chosen condition, or an honest empty state. */}
          <div className="condition-panel" id={`cases-${activeGroup.slug}`} role="tabpanel" aria-live="polite">
            {activeCases.length > 0 ? (
              <>
                <p className="case-caption">{t.exampleCaption}</p>
                <div className="case-rail">
                  {activeCases.map((item) => (
                    <CaseCard item={item} t={t} key={item.slug} />
                  ))}
                </div>
              </>
            ) : (
              <div className="case-empty">
                <span className="case-empty-icon" aria-hidden="true">
                  <IconFile size={22} />
                  <IconSparkle className="case-empty-sparkle" size={14} />
                </span>
                <div>
                  <p className="section-kicker">{t.collectionKicker}</p>
                  <h4>{t.caseEmptyTitle}</h4>
                  <p>{t.caseEmptyBody}</p>
                </div>
              </div>
            )}
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
