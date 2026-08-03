/**
 * Shown while a case is being resolved, so following a card from the library
 * lands on the page's real shape immediately instead of a blank screen.
 */
export default function LoadingCase() {
  return (
    <main id="main-content" className="content-page" role="status" aria-label="Loading case">
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
    </main>
  );
}
