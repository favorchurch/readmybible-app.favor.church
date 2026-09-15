"use client";

import { useEffect, useState } from "react";

import { Avatar, avatarSeedFor } from "@/components/avatar";
import { homeStages } from "@/components/rotatable-home";
import { StageMini } from "@/components/stage-mini";

type CompanionScene =
  | { kind: "avatar"; seed: number; gender: "male" | "female" }
  | { kind: "home"; stage: number };

const COMPANION_INTERVAL_MS = 2400;

function randomScene(): CompanionScene {
  if (Math.random() < 0.5) {
    const seed = Math.floor(Math.random() * 997);
    return { kind: "avatar", seed, gender: seed % 2 === 0 ? "male" : "female" };
  }
  return { kind: "home", stage: Math.floor(Math.random() * homeStages.length) };
}

/**
 * Rotates a random avatar or home-stage glyph next to the wordmark while the
 * shell loads. Purely decorative -- aria-hidden, same as the wordmark itself
 * -- so it never competes with the "Loading Read My Bible" status label.
 * Starts empty and only randomizes after mount to avoid an SSR/CSR mismatch,
 * and freezes on the first pick under prefers-reduced-motion.
 */
function SplashCompanion() {
  const [scene, setScene] = useState<CompanionScene | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only randomization has to run post-mount to avoid an SSR/CSR hydration mismatch.
    setScene(randomScene());
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = setInterval(() => setScene(randomScene()), COMPANION_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (!scene) return <div className="splash-companion" aria-hidden="true" />;

  return (
    <div className="splash-companion" aria-hidden="true">
      <div
        className="splash-companion-figure"
        key={scene.kind === "avatar" ? `avatar-${scene.seed}` : `home-${scene.stage}`}
      >
        {scene.kind === "avatar" ? (
          <Avatar
            color={avatarSeedFor(scene.seed).color}
            gender={scene.gender}
            skin={avatarSeedFor(scene.seed).skin}
            hair={avatarSeedFor(scene.seed).hair}
          />
        ) : (
          <StageMini name={homeStages[scene.stage].name} size={72} />
        )}
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="splash-phase-b" aria-hidden="true">
      <header className="splash-topbar">
        <div className="splash-brand-block" />
        <div className="splash-avatar-block" />
      </header>

      <section className="splash-hero-copy">
        <div className="splash-hero-line splash-hero-line-1" />
        <div className="splash-hero-line splash-hero-line-2" />
        <div className="splash-hero-sub-wrap">
          <div className="splash-hero-sub splash-hero-sub-1" />
          <div className="splash-hero-sub splash-hero-sub-2" />
        </div>
      </section>

      <section className="splash-card-readiness">
        <div className="splash-card-eyebrow" />
        <div className="splash-card-title" />
        <div className="splash-card-row">
          <div className="splash-card-label" />
          <div className="splash-card-val" />
        </div>
        <div className="splash-card-row">
          <div className="splash-card-label" />
          <div className="splash-card-val" />
        </div>
        <div className="splash-card-row">
          <div className="splash-card-label" />
          <div className="splash-card-val" />
        </div>
      </section>

      <section className="splash-card-preview">
        <div className="splash-card-topline" />
        <div className="splash-card-sublabel" />
        <div className="splash-card-heading-large" />
        <div className="splash-card-date" />
        <div className="splash-card-inset" />
      </section>

      <nav className="splash-nav" aria-hidden="true">
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
        <div className="splash-nav-item">
          <div className="splash-nav-icon" />
          <div className="splash-nav-label" />
        </div>
      </nav>
    </div>
  );
}

export function AppSplash() {
  return (
    <div
      className="splash app-shell"
      role="status"
      aria-busy="true"
      aria-label="Loading Read My Bible"
    >
      <div className="splash-phase-a">
        <div className="splash-brand-scene">
          <SplashCompanion />
          <div className="brand" aria-hidden="true">
            <span>READ</span>
            <span>MY</span>
            <span>BIBLE</span>
          </div>
        </div>
      </div>
      <HomeSkeleton />
    </div>
  );
}

export function AppSkeleton() {
  return (
    <div
      className="splash splash-skeleton-standalone app-shell"
      role="status"
      aria-busy="true"
      aria-label="Loading Read My Bible"
    >
      <HomeSkeleton />
    </div>
  );
}

export function AppBrandSplash() {
  return (
    <div
      className="splash splash-brand-only app-shell"
      role="status"
      aria-busy="true"
      aria-label="Loading Read My Bible"
    >
      <div className="splash-phase-a">
        <div className="splash-brand-scene">
          <SplashCompanion />
          <div className="brand" aria-hidden="true">
            <span>READ</span>
            <span>MY</span>
            <span>BIBLE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
