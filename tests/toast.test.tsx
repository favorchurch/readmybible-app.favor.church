// @vitest-environment jsdom

import { useEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast, useToastAction, type ToastContextValue } from "@/components/toast";
import { guardWrite, TEST_MODE_BLOCKED_MESSAGE } from "@/components/test-mode/logic";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Exposes the provider's context to the test without a click-driven UI. */
function ContextGrabber({ onReady }: { onReady: (ctx: ToastContextValue) => void }) {
  const ctx = useToast();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

function statusEl(): HTMLElement {
  return screen.getByRole("status");
}

describe("ToastProvider show/resolve lifecycle", () => {
  it("opens a pending toast with the given message", () => {
    let ctx!: ToastContextValue;
    render(
      <ToastProvider>
        <ContextGrabber onReady={(c) => (ctx = c)} />
      </ToastProvider>,
    );

    act(() => {
      ctx.show("Saving your reading…");
    });

    expect(statusEl().textContent).toBe("Saving your reading…");
    expect(statusEl().className).toContain("toast--pending");
    expect(statusEl().className).toContain("toast--visible");
  });

  it("resolves to a success tone and message, then auto-dismisses", () => {
    vi.useFakeTimers();
    let ctx!: ToastContextValue;
    render(
      <ToastProvider>
        <ContextGrabber onReady={(c) => (ctx = c)} />
      </ToastProvider>,
    );

    let id!: number;
    act(() => {
      id = ctx.show("Saving your profile…");
    });
    act(() => {
      ctx.resolve(id, { ok: true, message: "Profile saved." });
    });

    expect(statusEl().textContent).toBe("Profile saved.");
    expect(statusEl().className).toContain("toast--success");

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // Text clears rather than the node unmounting, so the live region stays
    // in the DOM for the next announcement.
    expect(statusEl().textContent).toBe("");
    expect(statusEl().className).not.toContain("toast--visible");
  });

  it("resolves to an error tone with the failure message and stays up longer than a success toast", () => {
    vi.useFakeTimers();
    let ctx!: ToastContextValue;
    render(
      <ToastProvider>
        <ContextGrabber onReady={(c) => (ctx = c)} />
      </ToastProvider>,
    );

    let id!: number;
    act(() => {
      id = ctx.show("Joining group…");
    });
    act(() => {
      ctx.resolve(id, { ok: false, message: "That code didn't match a group." });
    });

    expect(statusEl().textContent).toBe("That code didn't match a group.");
    expect(statusEl().className).toContain("toast--error");

    // A success toast (2200ms) would already be gone by now; the error toast
    // must still be showing its message at this point.
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(statusEl().textContent).toBe("That code didn't match a group.");

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(statusEl().textContent).toBe("");
  });

  it("still surfaces a superseded action's FAILURE rather than dropping it", () => {
    // A stale success is uninteresting -- a newer action has the user's
    // attention. A stale failure is not: handleSaveProfile has no error branch
    // of its own and has already closed the editor, so dropping it is how a
    // failed profile save became completely invisible when a check-in raced
    // past it.
    let ctx!: ToastContextValue;
    render(
      <ToastProvider>
        <ContextGrabber onReady={(c) => (ctx = c)} />
      </ToastProvider>,
    );

    let firstId!: number;
    act(() => {
      firstId = ctx.show("Saving your profile…");
    });
    act(() => {
      ctx.show("Saving your reading…");
    });
    act(() => {
      ctx.resolve(firstId, { ok: false, message: "That name is taken." });
    });

    expect(statusEl().textContent).toBe("That name is taken.");
    expect(statusEl().className).toContain("toast--error");
  });

  it("does not schedule a dismiss timer after unmount", () => {
    vi.useFakeTimers();
    let ctx!: ToastContextValue;
    const view = render(
      <ToastProvider>
        <ContextGrabber onReady={(c) => (ctx = c)} />
      </ToastProvider>,
    );

    let id!: number;
    act(() => {
      id = ctx.show("Joining group…");
    });
    view.unmount();

    // Navigating away mid-flight: the action settles after the provider is
    // gone. Resolving must be inert rather than starting a stray timer.
    expect(() => act(() => ctx.resolve(id, { ok: true, message: "You're in." }))).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a resolve() for a toast a newer show() has already replaced", () => {
    let ctx!: ToastContextValue;
    render(
      <ToastProvider>
        <ContextGrabber onReady={(c) => (ctx = c)} />
      </ToastProvider>,
    );

    let firstId!: number;
    act(() => {
      firstId = ctx.show("Saving your profile…");
    });
    act(() => {
      ctx.show("Saving your reading…");
    });

    // The stale resolve must not resurrect or overwrite the newer toast.
    act(() => {
      ctx.resolve(firstId, { ok: true, message: "Profile saved." });
    });

    expect(statusEl().textContent).toBe("Saving your reading…");
    expect(statusEl().className).toContain("toast--pending");
  });
});

describe("useToastAction", () => {
  function ActionGrabber({ onReady }: { onReady: (run: ReturnType<typeof useToastAction>) => void }) {
    const run = useToastAction();
    useEffect(() => {
      onReady(run);
    }, [run, onReady]);
    return null;
  }

  it("surfaces a test-mode guardWrite blocked reason as an error toast, not a success", async () => {
    let run!: ReturnType<typeof useToastAction>;
    render(
      <ToastProvider>
        <ActionGrabber onReady={(r) => (run = r)} />
      </ToastProvider>,
    );

    const realAction = vi.fn(async () => ({ ok: true as const }));
    const guarded = guardWrite(true, realAction);

    await act(async () => {
      await run("Saving your group…", "Group saved.", () => guarded());
    });

    expect(realAction).not.toHaveBeenCalled();
    expect(statusEl().textContent).toBe(TEST_MODE_BLOCKED_MESSAGE);
    expect(statusEl().className).toContain("toast--error");
  });

  it("resolves an error toast (not a stuck pending one) when the action rejects", async () => {
    let run!: ReturnType<typeof useToastAction>;
    render(
      <ToastProvider>
        <ActionGrabber onReady={(r) => (run = r)} />
      </ToastProvider>,
    );

    await act(async () => {
      await run("Saving your reading…", "Reading saved.", () => Promise.reject(new Error("network down"))).catch(
        () => {},
      );
    });

    expect(statusEl().className).toContain("toast--error");
    expect(statusEl().className).not.toContain("toast--pending");
  });
});
