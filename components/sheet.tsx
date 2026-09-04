"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

import { useEscapeToClose } from "@/components/use-escape-to-close";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one accessible modal/sheet shell every popup in the app renders
 * through: a backdrop, a `.modal-sheet` panel, and the focus behavior a
 * dialog needs (save the trigger, focus the sheet or `initialFocusRef`, trap
 * Tab inside, restore focus on close, lock body scroll while open). Screens
 * only supply the dialog's content and its accessible label.
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  className,
  children,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);

  useEscapeToClose(onClose, open);

  useEffect(() => {
    if (!open) return;
    savedFocusRef.current = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? sheetRef.current)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      savedFocusRef.current?.focus?.();
    };
    // initialFocusRef identity is expected to stay stable for the sheet's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        sheet.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!sheet.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className={className ? `modal-sheet ${className}` : "modal-sheet"} tabIndex={-1} ref={sheetRef}>
        {children}
      </div>
    </div>
  );
}
