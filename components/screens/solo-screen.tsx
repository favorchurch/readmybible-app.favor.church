"use client";

import { useRef, useState } from "react";

import { Brand } from "@/components/brand";
import Link from "next/link";

export function SoloScreen({
  error,
  pending,
  onJoin,
}: {
  error: string | null;
  pending: boolean;
  onJoin: (code: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [entering, setEntering] = useState(false);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <main className="screen solo-screen frame--focused">
      <Brand />
      <section className="hero-copy">
        <h1>Join a connect to start!</h1>
        <p>Ask a Connect Group leader for their group code and join in. Your coins come with you.</p>
      </section>
      {!entering ? (
        <button className="primary-button" onClick={() => setEntering(true)}>
          <strong>Enter a group code</strong>
        </button>
      ) : (
        <form
          className="join-code-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await onJoin(code.trim().toUpperCase());
          }}
        >
          <label>
            <span>Group code</span>
            <input
              ref={inputRef}
              value={code}
              maxLength={4}
              autoCapitalize="characters"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="F52A"
            />
          </label>
          {error && <p className="error-note">{error}</p>}
          <button className="primary-button" type="submit" disabled={pending || code.trim().length !== 4} aria-busy={pending}>
            <strong>Join group</strong>
          </button>
        </form>
      )}
      <p className="onboarding-note">
        Looking for a connect group? Sign up at <Link href="https://favor.church/connect" target="_blank" className="text-orange-600 underline-offset-2 underline hover:underline-offset-4">
          favor.church/connect
        </Link>
      </p>
      <a className="secondary-link" href="/auth/logout">
        Log out
      </a>
    </main>
  );
}
