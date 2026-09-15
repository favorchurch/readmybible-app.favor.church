function HomeSkeleton() {
  return (
    <div className="splash-phase-b" aria-hidden="true">
      <header className="splash-topbar">
        <div className="splash-brand-block" />
        <div className="splash-avatar-block" />
      </header>

      <section className="splash-stage-card">
        <div className="splash-stage-scene" />
        <div className="splash-stage-info">
          <div className="splash-stage-row">
            <div className="splash-pill" />
          </div>
          <div className="splash-progress-bar" />
          <div className="splash-stage-detail">
            <div className="splash-detail-left" />
            <div className="splash-detail-right" />
          </div>
        </div>
      </section>

      <section className="splash-reading-card">
        <div className="splash-card-line-sm" />
        <div className="splash-card-heading" />
        <div className="splash-card-button" />
      </section>

      <nav className="splash-nav" aria-hidden="true">
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
      </nav>
    </div>
  );
}

export function AppSplash() {
  return (
    <div
      className="splash app-shell"
      role="status"
      aria-busy="true"
      aria-label="Loading Read My Bible"
    >
      <div className="splash-phase-a">
        <div className="brand" aria-hidden="true">
          <span>READ</span>
          <span>MY</span>
          <span>BIBLE</span>
        </div>
      </div>
      <HomeSkeleton />
    </div>
  );
}

export function AppSkeleton() {
  return (
    <div
      className="splash splash-skeleton-standalone app-shell"
      role="status"
      aria-busy="true"
      aria-label="Loading Read My Bible"
    >
      <HomeSkeleton />
    </div>
  );
}

export function AppBrandSplash() {
  return (
    <div
      className="splash splash-brand-only app-shell"
      role="status"
      aria-busy="true"
      aria-label="Loading Read My Bible"
    >
      <div className="splash-phase-a">
        <div className="brand" aria-hidden="true">
          <span>READ</span>
          <span>MY</span>
          <span>BIBLE</span>
        </div>
      </div>
    </div>
  );
}
