"use client";

import { useEffect, useState } from "react";

/**
 * Dev-only A/B for how the chapter body is set, so the two candidates can be
 * compared on a real chapter rather than described.
 *
 * Deliberately NOT folded into components/prototype-switcher.tsx: that one owns
 * `?variant=A|B|C` for the today screen's reading-card layouts, and overloading
 * the same parameter would silently change what those letters mean. This reads
 * its own `?body=` and binds ArrowUp/ArrowDown, leaving Arrow Left/Right to the
 * prototype switcher so both can be driven on the same screen.
 */
export const BODY_STYLES = [
  { key: "bold", name: "Bold italic" },
  { key: "plain", name: "Readable upright" },
] as const;

export type ReadingBodyStyle = (typeof BODY_STYLES)[number]["key"];

function isBodyStyle(value: string | null): value is ReadingBodyStyle {
  return value === "bold" || value === "plain";
}

function bodyStyleFromSearch(search: string): ReadingBodyStyle {
  const value = new URLSearchParams(search).get("body");
  return isBodyStyle(value) ? value : "plain";
}

const CHANGE_EVENT = "reading-body-style-change";

/**
 * In production this always reports the shipped style and never subscribes, so
 * the switch costs nothing once a winner is picked.
 */
export function useReadingBodyStyle(): ReadingBodyStyle {
  const [style, setStyle] = useState<ReadingBodyStyle>(() =>
    typeof window === "undefined" ? "plain" : bodyStyleFromSearch(window.location.search),
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    function onChange(event: Event) {
      const next = (event as CustomEvent<ReadingBodyStyle>).detail;
      if (isBodyStyle(next)) setStyle(next);
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  if (process.env.NODE_ENV === "production") return "plain";
  return style;
}

function applyBodyStyle(next: ReadingBodyStyle) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("body", next);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
}

export function ReadingBodySwitch() {
  const current = useReadingBodyStyle();
  const currentIndex = BODY_STYLES.findIndex(({ key }) => key === current);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      // Shift is required so plain ArrowUp/ArrowDown still scroll the sheet.
      // Swallowing them outright made it impossible to keyboard-scroll down to
      // the sentinel -- disabling, in dev only, the exact interaction the
      // reading dialog exists to measure.
      if (!event.shiftKey) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      applyBodyStyle(BODY_STYLES[(currentIndex + 1) % BODY_STYLES.length].key);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <aside className="reading-body-switch" aria-label="Chapter body style">
      <button
        type="button"
        onClick={() => applyBodyStyle(BODY_STYLES[(currentIndex + 1) % BODY_STYLES.length].key)}
      >
        <b>Body</b> {BODY_STYLES[currentIndex].name} · ⇧↑↓
      </button>
    </aside>
  );
}
