"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastTone = "pending" | "success" | "error";

type ToastEntry = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastOutcome = { ok: true; message?: string } | { ok: false; message: string };

export type ToastContextValue = {
  /** Opens (or replaces) the toast in a pending state and returns a token for `resolve`. */
  show: (message: string) => number;
  /**
   * Settles the toast a matching `show()` opened. A `resolve` whose id no
   * longer matches the live toast is a no-op -- a later `show()` has already
   * replaced it, and an in-flight action settling after that must not
   * resurrect the toast it started.
   */
  resolve: (id: number, outcome: ToastOutcome) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const SUCCESS_DISMISS_MS = 2200;
const ERROR_DISMISS_MS = 4500;

let nextToastId = 0;

export function ToastProvider({
  children,
  hasBottomNav = true,
}: {
  children: React.ReactNode;
  /** false on routes rendered outside AppShell, which have no bottom nav to clear. */
  hasBottomNav?: boolean;
}) {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The source of truth for "is this the live toast", read synchronously --
  // `setState` updater callbacks are not guaranteed to run before the next
  // line of code (React batches them), so `resolve()` cannot rely on one to
  // decide whether it still owns the toast it's settling.
  const liveRef = useRef<{ id: number; message: string } | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimer.current !== null) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearDismissTimer();
    };
  }, [clearDismissTimer]);

  const show = useCallback(
    (message: string) => {
      const id = ++nextToastId;
      liveRef.current = { id, message };
      clearDismissTimer();
      setToast({ id, message, tone: "pending" });
      return id;
    },
    [clearDismissTimer],
  );

  const resolve = useCallback(
    (id: number, outcome: ToastOutcome) => {
      if (!mounted.current) return;

      const live = liveRef.current;
      const owns = live !== null && live.id === id;

      // A stale success is genuinely uninteresting -- a newer action already
      // has the user's attention. A stale FAILURE is not: dropping it is how a
      // failed profile save became invisible when a check-in raced past it,
      // since handleSaveProfile has no error branch of its own and has already
      // closed the editor. Promote it onto a fresh id instead.
      if (!owns && outcome.ok) return;

      const settle = (toastId: number, tone: ToastTone, message: string, dismissMs: number) => {
        liveRef.current = { id: toastId, message };
        setToast({ id: toastId, tone, message });
        clearDismissTimer();
        dismissTimer.current = setTimeout(() => {
          if (liveRef.current?.id === toastId) {
            liveRef.current = null;
            setToast(null);
          }
        }, dismissMs);
      };

      if (!outcome.ok) {
        settle(owns ? id : ++nextToastId, "error", outcome.message, ERROR_DISMISS_MS);
        return;
      }
      settle(id, "success", outcome.message ?? live!.message, SUCCESS_DISMISS_MS);
    },
    [clearDismissTimer],
  );

  // Memoized: `children` is a stable element, but AppShellInner consumes this
  // context, so a fresh object identity re-renders the whole shell -- three
  // times per check-in (show, resolve, auto-dismiss), while the celebration
  // and the 3D home scene are mounted. `show`/`resolve` are already stable.
  const value = useMemo(() => ({ show, resolve }), [show, resolve]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={toast} hasBottomNav={hasBottomNav} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/**
 * The show-then-resolve dance every one of the four mutations (saveProfile,
 * checkIn, chooseGroup, joinByCode) repeats: open the toast before the
 * request, settle it with the result. `guardWrite`'s test-mode block returns
 * the same `{ok:false, error}` shape as a real failure, so it surfaces here
 * automatically -- no separate "blocked" branch needed.
 */
export function useToastAction() {
  const { show, resolve } = useToast();
  return useCallback(
    async function runToastAction<R extends { ok: boolean; error?: string }>(
      pendingMessage: string,
      successMessage: string,
      action: () => Promise<R>,
      // Used when the action throws. Callers that show their own inline copy
      // for a thrown failure pass the same sentence here, so the user is not
      // shown two different explanations of one failure at the same time.
      throwMessage = "Something went wrong. Please try again.",
    ): Promise<R> {
      const id = show(pendingMessage);
      try {
        const result = await action();
        resolve(
          id,
          result.ok
            ? { ok: true, message: successMessage }
            : { ok: false, message: result.error || "Something went wrong. Please try again." },
        );
        return result;
      } catch (error) {
        // A rejected action must still settle the toast -- otherwise it's
        // stuck on "pending" forever, which is worse than no toast at all.
        resolve(id, { ok: false, message: throwMessage });
        throw error;
      }
    },
    [show, resolve],
  );
}

function ToastViewport({ toast, hasBottomNav }: { toast: ToastEntry | null; hasBottomNav: boolean }) {
  const tone = toast?.tone ?? "pending";
  return (
    <div className={`toast-viewport${hasBottomNav ? "" : " toast-viewport--no-nav"}`}>
      {/* Kept mounted (not conditionally rendered) so the live region is
          established before the first message lands -- a role="status" node
          that appears and disappears with its content is announced
          unreliably by screen readers, versus one whose text just changes. */}
      <div className={`toast toast--${tone}${toast ? " toast--visible" : ""}`} role="status" aria-live="polite">
        {toast ? toast.message : ""}
      </div>
    </div>
  );
}
