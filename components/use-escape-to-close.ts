"use client";

import { useEffect } from "react";

/** Calls onClose when Escape is pressed, for as long as `enabled` stays true. */
export function useEscapeToClose(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, enabled]);
}
