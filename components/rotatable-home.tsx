"use client";

import { useEffect, useRef, useState } from "react";

import { HomeModel } from "@/components/home-model";
import type { Stage } from "@/lib/game";

export const homeStages: Array<{ name: Stage; className: string; note: string }> = [
  { name: "Tent", className: "tent", note: "A humble beginning" },
  { name: "Trailer", className: "trailer", note: "Making room" },
  { name: "Cabin", className: "cabin3d", note: "Feels like home" },
  { name: "Apartment", className: "apartment", note: "Room to grow" },
  { name: "House", className: "house3d", note: "Growing together" },
  { name: "Mansion", className: "mansion", note: "Look what we built" },
];

export function stageIndex(stage: Stage): number {
  const index = homeStages.findIndex((s) => s.name === stage);
  return index === -1 ? 0 : index;
}

export function RotatableHome({
  stage,
  completed,
  compact = false,
  immersive = false,
  children,
}: {
  stage: number;
  completed: boolean;
  compact?: boolean;
  immersive?: boolean;
  children?: React.ReactNode;
}) {
  const [rotation, setRotation] = useState(-28);
  const [pan, setPan] = useState(0);
  const [coachmark, setCoachmark] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setCoachmark(!sessionStorage.getItem('home-looked-around')); } catch { setCoachmark(true); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const drag = useRef<{ x: number; y: number; rotation: number; pan: number } | null>(null);
  const selected = homeStages[stage];

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, rotation, pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setRotation(drag.current.rotation + (event.clientX - drag.current.x) * 0.55);
    if (immersive) setPan(Math.max(-80, Math.min(80, drag.current.pan + (event.clientY - drag.current.y) * .4)));
    setCoachmark(false);
    try { sessionStorage.setItem('home-looked-around', '1'); } catch { /* Storage is optional. */ }
  }

  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") setRotation((value) => value - 18);
    if (event.key === "ArrowRight") setRotation((value) => value + 18);
  }

  return (
    <div className={`home3d-wrap ${compact ? "compact" : ""} ${immersive ? "home3d-immersive" : ""}`}>
      <div className="home3d-sky">
        <i />
        <i />
        <span />
      </div>
      {/* drag/keyboard-rotatable 3D preview, not a semantic control */}
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div
        className="home3d-viewport"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={keyDown}
        role="img"
        tabIndex={0}
        aria-label={`Interactive 3D ${selected.name}. Drag, swipe, or use arrow keys to rotate.`}
      >
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        {/* --home-rotation lets scene children counter-rotate to face the
            camera (billboarding) without prop-drilling the drag state. */}
        <div
          className="home3d-turntable"
          style={{ transform: `translateY(${pan}px) rotateX(-9deg) rotateY(${rotation}deg)`, "--home-rotation": `${rotation}deg` } as React.CSSProperties}
        >
          <div className="home3d-ground">
            <span className="path3d" />
            <span className="shrub shrub-one" />
            <span className="shrub shrub-two" />
          </div>
          <HomeModel stageClassName={selected.className} />
          {children}
        </div>
      </div>
      {coachmark && <div className="home-coachmark" aria-hidden="true">Swipe to look around</div>}
      {!immersive && rotation !== -28 && <div className="rotate-hint">
        <span className="rotate-glyph" aria-hidden="true">↔</span>
        <div className="rotate-actions">
          <button
            type="button"
            className="rotate-btn"
            aria-label="Rotate left"
            onClick={() => setRotation((value) => value - 18)}
          >
            ←
          </button>
          <button
            type="button"
            className="rotate-btn"
            aria-label="Rotate right"
            onClick={() => setRotation((value) => value + 18)}
          >
            →
          </button>
          <button type="button" className="rotate-reset-btn" onClick={() => setRotation(-28)}>
            Reset view
          </button>
        </div>
      </div>}
      {completed && <div className="home3d-complete">✦ 10 coins added</div>}
    </div>
  );
}

export function HomeIllustration({ stage, completed = false }: { stage: number; completed?: boolean }) {
  return <RotatableHome stage={stage} completed={completed} compact />;
}
