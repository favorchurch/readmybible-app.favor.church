import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Read My Bible: Log in",
};

/**
 * A quiet handoff screen between the public landing page and Auth0. Joining a
 * Connect Group happens only after a successful sign-in, so it is never
 * mistaken for a login requirement.
 */
export default function LoginPage() {
  return (
    <main className="screen login-screen">
      <section className="hero-copy">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Log in to keep reading.</h1>
        <p>Use the Favor account connected to your Rock profile.</p>
      </section>
      <div className="login-actions">
        <a className="primary-button" href="/auth/login">
          <span>Log in with Favor</span>
          <span aria-hidden="true">→</span>
        </a>
        <Link className="secondary-link" href="/">
          Back to landing page
        </Link>
      </div>
    </main>
  );
}
