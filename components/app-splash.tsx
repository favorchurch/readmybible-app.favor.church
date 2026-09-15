function HomeSkeleton() {
  return (
    <div className="splash-phase-b" aria-hidden="true">
      <header className="splash-topbar">
        <div className="splash-brand-block" />
        <div className="splash-avatar-block" />
      </header>

      <section className="splash-hero-copy">
        <div className="splash-hero-line splash-hero-line-1" />
        <div className="splash-hero-line splash-hero-line-2" />
        <div className="splash-hero-sub-wrap">
          <div className="splash-hero-sub splash-hero-sub-1" />
          <div className="splash-hero-sub splash-hero-sub-2" />
        </div>
      </section>

      <section className="splash-card-readiness">
        <div className="splash-card-eyebrow" />
        <div className="splash-card-title" />
        <div className="splash-card-row">
          <div className="splash-card-label" />
          <div className="splash-card-val" />
        </div>
        <div className="splash-card-row">
          <div className="splash-card-label" />
          <div className="splash-card-val" />
        </div>
        <div className="splash-card-row">
          <div className="splash-card-label" />
          <div className="splash-card-val" />
        </div>
      </section>

      <section className="splash-card-preview">
        <div className="splash-card-topline" />
        <div className="splash-card-sublabel" />
        <div className="splash-card-heading-large" />
        <div className="splash-card-date" />
        <div className="splash-card-inset" />
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
