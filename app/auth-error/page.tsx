import type { Metadata } from "next";

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
      <a className="primary-button" href="/auth/login">
        Try again
      </a>
      <a className="secondary-link" href="https://connect.favor.church">
        Go to connect.favor.church
      </a>
    </main>
  );
}
