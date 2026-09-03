import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Read My Bible: We couldn't find you yet",
};

export default function NotFoundInRockPage() {
  return (
    <main className="screen not-found-screen">
      <section className="hero-copy">
        <h1>We couldn&apos;t find you yet.</h1>
        <p>
          Your login worked, but we don&apos;t have your Favor record connected yet.
          Reach out to your Connect Group leader and they&apos;ll get you sorted.
        </p>
      </section>
      <a className="secondary-link" href="/auth/logout">
        Try another account
      </a>
    </main>
  );
}
