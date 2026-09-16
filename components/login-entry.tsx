import { SplashBrandLockup } from "@/components/app-splash";
import { authLoginPathFor } from "@/lib/auth-return";

export function LoginEntry({ returnTo = "/" }: { returnTo?: string }) {
  return (
    <main className="login-entry-screen">
      <div className="login-entry-content">
        <div className="login-entry-brand" role="img" aria-label="Read My Bible">
          <SplashBrandLockup companionSize={88} />
        </div>

        <section className="login-entry-copy">
          <p className="eyebrow">A LITTLE EVERY DAY</p>
          <h1>Read the Word. Grow together.</h1>
          <p>Make room for Scripture with your Favor community.</p>
        </section>

        <a className="primary-button login-entry-cta" href={authLoginPathFor(returnTo)}>
          <span>Enter App</span>
          <span className="login-entry-arrow" aria-hidden="true">→</span>
        </a>

        <p className="login-entry-note">Continue with your Favor account.</p>
      </div>
    </main>
  );
}
