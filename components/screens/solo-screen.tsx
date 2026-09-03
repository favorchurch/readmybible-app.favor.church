"use client";

import { useRef, useState } from "react";

import { Brand } from "@/components/brand";

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
    <main className="screen solo-screen">
      <Brand />
      <section className="hero-copy">
        <h1>You&apos;re reading solo for now.</h1>
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
          <button className="primary-button" type="submit" disabled={pending || code.trim().length !== 4}>
            <strong>Join group</strong>
          </button>
        </form>
      )}
    </main>
  );
}
