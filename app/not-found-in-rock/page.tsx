import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Read My Bible — We couldn't find you yet",
};

export default function NotFoundInRockPage() {
  return (
    <main className="screen not-found-screen">
      <section className="hero-copy">
        <h1>We couldn&apos;t find you yet.</h1>
        <p>
          Your login worked, but we don&apos;t have your Favor record connected. Reach
          out to your Connect Group leader, or visit connect.favor.church and we&apos;ll
          get you sorted.
        </p>
      </section>
      <a className="primary-button" href="https://connect.favor.church">
        Go to connect.favor.church
      </a>
      <a className="secondary-link" href="/auth/logout">
        Try another account
      </a>
    </main>
  );
}
