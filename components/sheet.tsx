"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let locks = 0;
let bodyOverflow = "";
const INTERACTIVE = 'a, button, input, select, textarea, summary, [role="button"], [contenteditable="true"]';

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
  immersive = false,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  immersive?: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const drag = useRef<{ id: number; x: number; y: number; lastY: number; time: number; startedAt: number; velocity: number; offset: number; active: boolean; mode: 'sheet' | 'scroll'; scrollTop: number } | null>(null);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    savedFocusRef.current = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? sheetRef.current)?.focus();

    if (locks++ === 0) bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (--locks === 0) document.body.style.overflow = bodyOverflow;
      savedFocusRef.current?.focus?.();
    };
    // initialFocusRef identity is expected to stay stable for the sheet's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const dialogs = document.querySelectorAll('.modal-wrap');
      if (sheet.parentElement !== dialogs[dialogs.length - 1]) return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(el => el.getClientRects().length > 0);
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
      } else if (event.shiftKey && (active === first || active === sheet)) {
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

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (immersive || !event.isPrimary || event.button !== 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest('.sheet-drag-handle');
    if (!handle && target.closest(INTERACTIVE)) return;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY, time: event.timeStamp, startedAt: event.timeStamp, velocity: 0, offset: 0, active: false, mode: handle || scrollTop === 0 ? 'sheet' : 'scroll', scrollTop };
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    const panel = sheetRef.current;
    if (!gesture || !panel || gesture.id !== event.pointerId) return;
    const dy = event.clientY - gesture.y;
    // Decide after the first few pixels whether an upward gesture from the
    // top is content scrolling. Pointer Events give us the direction before
    // the sheet has moved, so the same surface can support both gestures.
    if (gesture.mode === 'sheet' && !gesture.active && dy < -8 && scrollRef.current && scrollRef.current.scrollHeight > scrollRef.current.clientHeight) {
      gesture.mode = 'scroll';
      gesture.scrollTop = scrollRef.current.scrollTop;
    }
    if (gesture.mode === 'scroll') {
      const nextScrollTop = Math.max(0, gesture.scrollTop - dy);
      if (!(nextScrollTop === 0 && dy > 0)) {
        if (scrollRef.current) scrollRef.current.scrollTop = nextScrollTop;
        return;
      }
      gesture.mode = 'sheet';
      gesture.y = event.clientY;
      gesture.startedAt = event.timeStamp;
      gesture.lastY = event.clientY;
      gesture.time = event.timeStamp;
    }
    if (!gesture.active) {
      if (dy < -8 || Math.abs(event.clientX - gesture.x) > Math.max(10, dy)) { drag.current = null; return; }
      if (dy < 8) return;
      gesture.active = true;
      panel.setPointerCapture(event.pointerId);
      panel.style.animation = 'none';
      panel.style.transition = 'none';
    }
    const dt = event.timeStamp - gesture.time;
    if (dt > 0) gesture.velocity = (event.clientY - gesture.lastY) / dt;
    gesture.lastY = event.clientY;
    gesture.time = event.timeStamp;
    gesture.offset = Math.max(0, dy);
    panel.style.transform = `translateY(${gesture.offset}px)`;
  }

  function pointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    const panel = sheetRef.current;
    drag.current = null;
    if (!gesture || !panel || !gesture.active || gesture.mode !== 'sheet') return;
    if (panel.hasPointerCapture(event.pointerId)) panel.releasePointerCapture(event.pointerId);
    const fast = event.timeStamp - gesture.startedAt < 260 && gesture.velocity > .55 && gesture.offset > 36;
    if (event.type !== 'pointercancel' && (gesture.offset > Math.min(140, panel.clientHeight * .25) || fast)) {
      closeRef.current();
    } else {
      panel.style.transition = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'transform 200ms ease-out';
      panel.style.transform = 'translateY(0)';
    }
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`modal-wrap${immersive ? ' modal-wrap--immersive' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <div className={`modal-sheet ${className ?? ''}`} tabIndex={-1} ref={sheetRef}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
        {!immersive && <button className="sheet-drag-handle" aria-label="Drag down to close" onClick={event => { if (event.detail === 0) onClose(); }}><span /></button>}
        <div className="sheet-scroll" ref={scrollRef}>{children}</div>
      </div>
    </div>, document.body
  );
}
