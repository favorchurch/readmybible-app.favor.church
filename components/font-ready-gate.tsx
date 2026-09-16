"use client";

import { useEffect, useState } from "react";

import { AppBrandSplash, SplashBrandLockup } from "@/components/app-splash";

const FONT_READY_TIMEOUT_MS = 4000;
const CRITICAL_FONTS = [
  { face: '700 1em "Agharti"', sample: "Read My Bible" },
  { face: '400 1em "Favor Sans"', sample: "Read My Bible" },
] as const;

type FontGateState = "loading" | "ready" | "failed";

async function loadCriticalFonts(): Promise<void> {
  const fontSet = document.fonts;
  if (!fontSet || typeof fontSet.load !== "function") return;

  const loadedFaces = await Promise.all(
    CRITICAL_FONTS.map(({ face, sample }) => fontSet.load(face, sample)),
  );

  if (loadedFaces.some((faces) => faces.length === 0)) {
    throw new Error("A required app font did not load.");
  }

  if (typeof fontSet.check === "function" && CRITICAL_FONTS.some(({ face, sample }) => !fontSet.check(face, sample))) {
    throw new Error("A required app font is not ready.");
  }
}

function FontReadyFallback({ onRetry, onContinue }: { onRetry: () => void; onContinue: () => void }) {
  return (
    <main className="font-ready-fallback screen">
      <div className="font-ready-fallback-content">
        <div className="font-ready-fallback-brand" role="img" aria-label="Read My Bible">
          <SplashBrandLockup />
        </div>
        <section className="hero-copy">
          <p className="eyebrow">ALMOST THERE</p>
          <h1>We&apos;re taking a moment to load.</h1>
          <p>Try again, or continue with the system type and enter the app.</p>
        </section>
        <div className="login-actions">
          <button type="button" className="primary-button" onClick={onRetry}>
            <span>Try again</span>
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="secondary-link font-ready-continue" onClick={onContinue}>
            Continue without custom fonts
          </button>
        </div>
      </div>
    </main>
  );
}

export function FontReadyGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FontGateState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelled || settled) return;
      settled = true;
      setState("failed");
    }, FONT_READY_TIMEOUT_MS);

    void loadCriticalFonts()
      .then(() => {
        if (cancelled || settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        setState("ready");
      })
      .catch(() => {
        if (cancelled || settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        setState("failed");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [attempt]);

  if (state === "ready") return <>{children}</>;
  if (state === "failed") {
    return (
      <FontReadyFallback
        onRetry={() => {
          setState("loading");
          setAttempt((current) => current + 1);
        }}
        onContinue={() => setState("ready")}
      />
    );
  }
  return <AppBrandSplash />;
}
