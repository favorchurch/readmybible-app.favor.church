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

/** Resting camera: a touch off-axis so two faces read, tilted slightly down. */
const BASE_ROTATION = -28;
const BASE_PITCH = -9;
/** 0deg is eye level, where the ground collapses to a sliver and the avatars
    read as sunk into it -- stop just above that, and well above the underside
    the model does not have. */
const clampPitch = (value: number) => Math.max(-52, Math.min(-5, value));

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
  const [rotation, setRotation] = useState(BASE_ROTATION);
  const [pitch, setPitch] = useState(BASE_PITCH);
  const [coachmark, setCoachmark] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setCoachmark(!sessionStorage.getItem('home-looked-around')); } catch { setCoachmark(true); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const drag = useRef<{ x: number; y: number; rotation: number; pitch: number } | null>(null);
  const selected = homeStages[stage];

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, rotation, pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setRotation(drag.current.rotation + (event.clientX - drag.current.x) * 0.55);
    if (immersive) setPitch(clampPitch(drag.current.pitch - (event.clientY - drag.current.y) * 0.22));
    setCoachmark(false);
    try { sessionStorage.setItem('home-looked-around', '1'); } catch { /* Storage is optional. */ }
  }

  function resetView() {
    setRotation(BASE_ROTATION);
    setPitch(BASE_PITCH);
  }

  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Only the viewport itself drives the camera: in the immersive scene the
    // avatar buttons live inside it, and their keys must reach them intact.
    if (event.target !== event.currentTarget) return;
    // Leave shortcuts alone -- Alt/Cmd+Arrow is the browser's back and forward.
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    // Swallow only the keys this actually drives -- the compact card ignores
    // the tilt keys, and eating them there would trap the page's own scrolling.
    const tilts = immersive && (event.key === "ArrowUp" || event.key === "ArrowDown");
    const spins = event.key === "ArrowLeft" || event.key === "ArrowRight";
    if (tilts || spins || event.key === "Home") event.preventDefault();
    if (event.key === "ArrowLeft") setRotation((value) => value - 18);
    if (event.key === "ArrowRight") setRotation((value) => value + 18);
    if (tilts) setPitch((value) => clampPitch(value + (event.key === "ArrowUp" ? -6 : 6)));
    if (event.key === "Home") resetView();
  }

  return (
    <div className={`home3d-wrap stage-${selected.className} ${compact ? "compact" : ""} ${immersive ? "home3d-immersive" : ""}`}>
      <div className="home3d-sky">
        <i />
        <i />
        <span />
      </div>
      {/* drag/keyboard-rotatable 3D preview */}
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
        role={immersive ? "group" : "img"}
        tabIndex={0}
        aria-label={`Interactive 3D ${selected.name}. Drag, swipe, or use arrow keys to rotate${immersive ? " and tilt" : ""}.`}
      >
        {/* --home-rotation/--home-pitch let scene children counter-rotate to
            face the camera (billboarding) without prop-drilling the drag state. */}
        <div
          className="home3d-turntable"
          style={{ transform: `rotateX(${pitch}deg) rotateY(${rotation}deg)`, "--home-rotation": `${rotation}deg`, "--home-pitch": `${pitch}deg` } as React.CSSProperties}
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
      {/* Modulo, not equality: free spin means a full revolution lands back on
          the resting camera, and the hint should go away when it does. Pitch
          never moves here -- only the immersive scene tilts. */}
      {!immersive && (rotation - BASE_ROTATION) % 360 !== 0 && <div className="rotate-hint">
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
          <button type="button" className="rotate-reset-btn" onClick={resetView}>
            Reset view
          </button>
        </div>
      </div>}
      {completed && <div className="home3d-complete">✦ 10 points added</div>}
    </div>
  );
}

export function HomeIllustration({ stage, completed = false }: { stage: number; completed?: boolean }) {
  return <RotatableHome stage={stage} completed={completed} compact />;
}
