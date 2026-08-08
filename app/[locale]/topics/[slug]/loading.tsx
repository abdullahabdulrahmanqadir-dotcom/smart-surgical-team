/**
 * Covers navigations into a single topic, which still resolves that topic's
 * cases on the server.
 *
 * Deliberately scoped to this route and not to /topics: the bare index opens
 * on the whole head and neck with no topic chosen, so a case-grid placeholder
 * there would promise a library the page is not going to show.
 */
export default function LoadingTopics() {
  return (
    <LocalizedLoadingStatus labels={labels}>
      <section className="section section-topic-index">
        <div className="content-browser">
          <div className="content-browser-hero">
            <div className="content-browser-hero-copy">
              <span className="skeleton-line skeleton-line-xs" />
              <span className="skeleton-line skeleton-line-lg" />
              <span className="skeleton-line" />
            </div>
          </div>
          <div className="content-case-grid">
            {[0, 1, 2].map((index) => (
              <div className="content-case-card is-skeleton" key={index} aria-hidden="true">
                <div className="content-case-art"><span className="skeleton-block" /></div>
                <div className="content-case-copy">
                  <span className="skeleton-line skeleton-line-xs" />
                  <span className="skeleton-line skeleton-line-lg" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line skeleton-line-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </LocalizedLoadingStatus>
  );
}
import LocalizedLoadingStatus from "../../../components/LocalizedLoadingStatus";
import { getDictionary } from "../../../lib/dictionaries";
import type { Locale } from "../../../lib/i18n";

const labels = {
  en: getDictionary("en").loading.topics,
  ar: getDictionary("ar").loading.topics,
} satisfies Record<Locale, string>;
