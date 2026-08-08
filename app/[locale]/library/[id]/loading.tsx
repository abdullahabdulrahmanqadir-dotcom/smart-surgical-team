/**
 * Shown while a case is being resolved, so following a card from the library
 * lands on the page's real shape immediately instead of a blank screen.
 */
export default function LoadingCase() {
  return (
    <LocalizedLoadingStatus className="content-page" labels={labels}>
      <div className="content-heading">
        <div>
          <span className="skeleton-line skeleton-line-xs" />
          <h1><span className="skeleton-line skeleton-line-lg" /></h1>
          <p><span className="skeleton-line" /></p>
        </div>
      </div>
      <div className="content-grid">
        <section className="content-main">
          <section className="content-player"><span className="skeleton-block" /></section>
        </section>
        <aside className="content-aside">
          <section className="presenter-card">
            <span className="skeleton-line skeleton-line-xs" />
            <span className="skeleton-line skeleton-line-lg" />
          </section>
          <section className="details-card">
            <span className="skeleton-line skeleton-line-xs" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line-sm" />
          </section>
        </aside>
      </div>
    </LocalizedLoadingStatus>
  );
}
import LocalizedLoadingStatus from "../../../components/LocalizedLoadingStatus";
import { getDictionary } from "../../../lib/dictionaries";
import type { Locale } from "../../../lib/i18n";

const labels = {
  en: getDictionary("en").loading.case,
  ar: getDictionary("ar").loading.case,
} satisfies Record<Locale, string>;
