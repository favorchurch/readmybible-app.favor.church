"use client";

import { useEffect, useState } from "react";

export const PROTOTYPE_VARIANTS = [
  { key: "shipped", name: "Shipped card" },
  { key: "A", name: "One reading card" },
  { key: "B", name: "Chapter rail" },
  { key: "C", name: "Reading sheet" },
] as const;

type PrototypeVariant = (typeof PROTOTYPE_VARIANTS)[number]["key"];

function isPrototypeVariant(value: string | null): value is PrototypeVariant {
  return value === "shipped" || value === "A" || value === "B" || value === "C";
}

function variantFromSearch(search: string): PrototypeVariant {
  const value = new URLSearchParams(search).get("variant");
  return isPrototypeVariant(value) ? value : "shipped";
}

function updateVariantUrl(next: PrototypeVariant) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("variant", next);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  window.dispatchEvent(new CustomEvent("reading-prototype-change", { detail: next }));
}

export function PrototypeSwitcher() {
  const [current, setCurrent] = useState<PrototypeVariant>(() =>
    typeof window === "undefined" ? "shipped" : variantFromSearch(window.location.search),
  );
  const currentIndex = PROTOTYPE_VARIANTS.findIndex(({ key }) => key === current);

  function setVariant(next: PrototypeVariant) {
    if (process.env.NODE_ENV === "production") return;
    setCurrent(next);
    updateVariantUrl(next);
  }

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
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + offset + PROTOTYPE_VARIANTS.length) % PROTOTYPE_VARIANTS.length;
      const next = PROTOTYPE_VARIANTS[nextIndex].key;
      setCurrent(next);
      updateVariantUrl(next);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex]);

  if (process.env.NODE_ENV === "production") return null;

  const variantName = PROTOTYPE_VARIANTS[currentIndex].name;

  return (
    <aside className="prototype-switcher" aria-label="Reading prototype choices">
      <button type="button" onClick={() => setVariant(PROTOTYPE_VARIANTS[(currentIndex + PROTOTYPE_VARIANTS.length - 1) % PROTOTYPE_VARIANTS.length].key)} aria-label="Previous prototype">
        ←
      </button>
      <span><b>Prototype</b> {current} · {variantName}</span>
      <button type="button" onClick={() => setVariant(PROTOTYPE_VARIANTS[(currentIndex + 1) % PROTOTYPE_VARIANTS.length].key)} aria-label="Next prototype">
        →
      </button>
    </aside>
  );
}
