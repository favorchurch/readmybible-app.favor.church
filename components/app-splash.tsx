"use client";

import { useEffect, useState } from "react";

import { Avatar, avatarSeedFor } from "@/components/avatar";
import { homeStages } from "@/components/rotatable-home";
import { StageMini } from "@/components/stage-mini";

type CompanionScene =
  | { kind: "avatar"; seed: number; gender: "male" | "female" }
  | { kind: "home"; stage: number };

const COMPANION_INTERVAL_MS = 2400;
const DEFAULT_COMPANION_SIZE = 72;

/**
 * The scene rendered on first paint, both on the server and on the client.
 * Fixed at module scope -- not Math.random(), not the wall clock, not
 * anything else that could differ between the two -- so the markup is
 * identical and there is no SSR/CSR hydration mismatch to guard against.
 * That's what lets the splash show a glyph immediately instead of an empty
 * slot until mount.
 */
const INITIAL_SCENE: CompanionScene = { kind: "avatar", seed: 0, gender: "male" };

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
 * Renders the deterministic `INITIAL_SCENE` on first paint (same markup on
 * server and client), then randomizes on an interval after mount, freezing
 * on the first pick under prefers-reduced-motion.
 *
 * Reusable outside the splash: `size` sets the square box both the avatar
 * and home-stage branches render into, so callers (e.g. issue #125's
 * reading-sheet companion) get consistent sizing without depending on
 * splash-only CSS.
 */
export function SplashCompanion({ size = DEFAULT_COMPANION_SIZE }: { size?: number } = {}) {
  const [scene, setScene] = useState<CompanionScene>(INITIAL_SCENE);

  useEffect(() => {
    // Not every environment that renders this implements matchMedia -- jsdom
    // does not, and since #125 this component mounts inside the reading sheet
    // too, so any test rendering that sheet would otherwise throw. Treat an
    // absent matchMedia as "no stated preference" and keep rotating, which is
    // what a browser without the media feature reports anyway.
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = setInterval(() => setScene(randomScene()), COMPANION_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="splash-companion" style={{ width: size, height: size }} aria-hidden="true">
      <div
        className="splash-companion-figure"
        style={{ width: size, height: size }}
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
          <StageMini name={homeStages[scene.stage].name} size={size} />
        )}
      </div>
    </div>
  );
}

function SplashBrandOverlay() {
  return (
    <div className="splash-phase-a" aria-hidden="true">
      <div className="splash-brand-scene">
        <SplashCompanion />
        <div className="brand" aria-hidden="true">
          <span>READ</span>
          <span>MY</span>
          <span>BIBLE</span>
        </div>
      </div>
    </div>
  );
}

export function AppBrandSplash() {
  return (
    <div
      className="splash app-shell"
      role="status"
      aria-busy="true"
      aria-label="Loading Read My Bible"
    >
      <SplashBrandOverlay />
    </div>
  );
}
