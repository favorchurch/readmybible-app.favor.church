import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Read My Bible: Login didn't finish",
};

/** Auth0 error text is user-influenced, so it is sanitized in lib/auth0.ts and rendered as plain text only. */
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; reason?: string }>;
}) {
  const { code, reason } = await searchParams;

  return (
    <main className="screen not-found-screen">
      <section className="hero-copy">
        <h1>Login didn&apos;t finish.</h1>
        <p>
          Something went wrong on our side before we could sign you in. Try again in a
          bit, and if it keeps happening, send the Tech Team the details below.
        </p>
        {(code || reason) && (
          <p className="passage-note">
            {code ? `Code: ${code}` : null}
            {code && reason ? " · " : null}
            {reason ? `Reason: ${reason}` : null}
          </p>
        )}
      </section>
      <div className="login-actions">
        <Link className="primary-button" href="/login">
          <span>Choose a login option</span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link className="secondary-link" href="/login">
          Back to sign-in
        </Link>
      </div>
    </main>
  );
}
