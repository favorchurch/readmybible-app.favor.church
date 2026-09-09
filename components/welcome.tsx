/**
 * Public welcome screen for a logged-out visitor at `/`. Server Component,
 * no client JS: the only interactive element is a plain anchor to
 * `/auth/login` (SDK-mounted route) so the SDK's own redirect handles the
 * login flow -- see lib/auth0.ts and proxy.ts. Do not add `"use client"`
 * or an onClick handler here; that is exactly the client-side routing this
 * screen is required to avoid.
 */
export function WelcomeLanding() {
  return (
    <div className="welcome-page">
      {/*
       * Measured: cold-load CLS was 0.152 (over the 0.1 budget) with plain
       * font-display:swap alone, because the huge display headline reflows
       * when Agharti swaps in over the fallback font. Preloading it (the
       * one large, above-the-fold use of that font on this page) removed
       * the shift in testing -- see .office/login-landing/evidence/.
       * Warm-cache loads already had 0 CLS; this only helps first visits.
       * A rendered <link> (React hoists it to <head>), not react-dom's
       * preload() API -- the latter silently no-op'd under this RSC render.
       */}
      <link rel="preload" as="font" type="font/ttf" href="/fonts/Agharti-Bold.ttf" crossOrigin="anonymous" />
      <header className="welcome-header">
        <div className="welcome-brand">Read My Bible</div>
        <div className="welcome-eyebrow">A little every day. Together.</div>
      </header>

      <main className="welcome-main">
        <section className="welcome-intro">
          <div className="welcome-kicker">Make room for the Word</div>
          <h1 className="welcome-headline">
            Open your
            <br />
            Bible.
            <br />
            <em>Grow daily.</em>
          </h1>
          <p className="welcome-description">
            Build a rhythm of reading Scripture.
            <br />
            One passage, one day at a time — with your Favor community.
          </p>
          <a className="welcome-login" href="/auth/login">
            Log in with Favor
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          </a>
          <p className="welcome-hint">Continue with your Favor account.</p>
        </section>

        <section className="welcome-art" aria-label="Sample reading">
          <div className="welcome-orbit" aria-hidden="true" />
          <article className="welcome-reading">
            <div className="welcome-reading-eyebrow">A moment in the Word</div>
            <h2>
              Light for
              <br />
              the next step.
            </h2>
            <div className="welcome-reference">Psalm 119:105 · KJV</div>
            <div className="welcome-rule" />
            <p className="welcome-verse">
              Thy word is a <span>lamp unto my feet,</span> and a light unto my path.
            </p>
            <div className="welcome-reading-bottom">
              <span>READ. REFLECT. RESPOND.</span>
              <span>01</span>
            </div>
          </article>
          <p className="welcome-caption">Small beginnings. A daily rhythm.</p>
        </section>
      </main>

      <div className="welcome-benefits">
        <span>
          <b>01</b> Read Scripture
        </span>
        <span>
          <b>02</b> Build your daily rhythm
        </span>
        <span>
          <b>03</b> Grow with your Connect Group
        </span>
      </div>

      <footer className="welcome-footer">
        <div className="welcome-footer-brand">
          <img src="/favor-logo-white.png" alt="Favor Church" width={32} height={32} />
          A life shaped by the Word.
        </div>
        <span>Sample reading, not a personal assignment</span>
      </footer>
    </div>
  );
}
