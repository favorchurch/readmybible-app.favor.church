/**
 * The scroll-to-bottom check-in rules (D4-D10 of docs/reading-dialog-tick.md).
 *
 * These are the "known-bad" tests for this change: each one fails if the
 * corresponding rule is removed. The sentinel fires on a gesture users make
 * without thinking, so "writes exactly once" and "never writes in test mode"
 * need a direct unit test rather than confidence in the component wiring --
 * see issue #58 for the same lesson learned the expensive way.
 */
import { describe, expect, it, vi } from "vitest";

import {
  NO_SCROLL_DWELL_MS,
  BOTTOM_ELIGIBLE_DELAY_MS,
  MIN_READING_TIME_MS,
  ReadingQualificationTracker,
  checkInWithRetry,
  sentinelAction,
  shouldWrite,
  simulatedCheckInGroup,
} from "@/lib/reading-tick";

const OPEN = { alreadyRead: false, alreadyFired: false, writesBlocked: false, preview: false };

describe("shouldWrite", () => {
  it("writes on the first sentinel entry for an unread chapter", () => {
    expect(shouldWrite(OPEN)).toBe(true);
  });

  it("never writes twice for the same chapter (D5/D6 replay)", () => {
    expect(shouldWrite({ ...OPEN, alreadyFired: true })).toBe(false);
  });

  it("never writes for a chapter already marked read (D8)", () => {
    expect(shouldWrite({ ...OPEN, alreadyRead: true })).toBe(false);
  });

  it("never writes when the per-action guard is blocking (D10)", () => {
    expect(shouldWrite({ ...OPEN, writesBlocked: true })).toBe(false);
  });

  it("never writes in pre-launch preview (D12)", () => {
    expect(shouldWrite({ ...OPEN, preview: true })).toBe(false);
  });

  it("writes in the sandbox state, where the guard permits it (D10)", () => {
    // `writesBlocked` is false only when the sandbox group IS the tester's own
    // real active group, so the row can land nowhere else. Exercising a real
    // check-in there is the sandbox's purpose; blocking it here would strand
    // the machinery and make tests/test-mode-wiring.test.ts vacuous.
    expect(shouldWrite({ ...OPEN, writesBlocked: false })).toBe(true);
  });

  it("still refuses a sandbox write for a chapter already read", () => {
    expect(shouldWrite({ ...OPEN, writesBlocked: false, alreadyRead: true })).toBe(false);
  });
});

describe("ReadingQualificationTracker visibility", () => {
  it("does not count time while the document is hidden", () => {
    const tracker = new ReadingQualificationTracker(MIN_READING_TIME_MS, BOTTOM_ELIGIBLE_DELAY_MS);
    tracker.onContentLoaded(1_000);
    tracker.onIntersectionChange(true, 6_000);

    tracker.onVisibilityChange(false, 6_000);
    expect(tracker.onTimerElapsed(20_000)).toBe(false);

    tracker.onVisibilityChange(true, 20_000);
    expect(tracker.onTimerElapsed(20_000)).toBe(false);
    expect(tracker.onTimerElapsed(30_000)).toBe(true);
  });
});

describe("checkInWithRetry", () => {
  it("calls the action once when it succeeds", async () => {
    const action = vi.fn(async () => ({ ok: true as const, group: null }));
    const result = await checkInWithRetry(action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("retries once silently, and reports the retry", async () => {
    const onRetry = vi.fn();
    const action = vi
      .fn<() => Promise<{ ok: true; group: null } | { ok: false; error: string }>>()
      .mockResolvedValueOnce({ ok: false, error: "network" })
      .mockResolvedValueOnce({ ok: true, group: null });
    const result = await checkInWithRetry(action, onRetry);
    expect(action).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("gives up after the second failure and surfaces an error (D9)", async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: "still down" }));
    const result = await checkInWithRetry(action);
    expect(action).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: false, error: "still down" });
  });

  it("never retries more than once", async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: "down" }));
    await checkInWithRetry(action);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("survives a thrown action rather than rejecting", async () => {
    const action = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await checkInWithRetry(action);
    expect(result.ok).toBe(false);
  });
});

describe("simulatedCheckInGroup", () => {
  it("advances the group by exactly one check-in", () => {
    const group = simulatedCheckInGroup({ ratio: 0.5, memberCount: 10 });
    // 10 members * 20 assignments = 200 slots; half is 100, plus this one read.
    expect(group.checkinCount).toBe(101);
    expect(group.memberCount).toBe(10);
    expect(group.after.ratio).toBeGreaterThan(group.before.ratio);
  });

  it("keeps the before-ratio exactly as the panel simulated it", () => {
    const group = simulatedCheckInGroup({ ratio: 0.25, memberCount: 8 });
    expect(group.before.ratio).toBe(0.25);
  });

  it("does not exceed a fully-read group", () => {
    const group = simulatedCheckInGroup({ ratio: 1, memberCount: 4 });
    expect(group.checkinCount).toBe(4 * 20);
    expect(group.after.ratio).toBe(1);
  });

  it("does not divide by zero on an empty group", () => {
    const group = simulatedCheckInGroup({ ratio: 0, memberCount: 0 });
    expect(Number.isFinite(group.after.ratio)).toBe(true);
    expect(group.memberCount).toBe(1);
  });
});

describe("sentinelAction decides instant vs dwell (D13)", () => {
  it("dwells when the end of the reading was already in view on open", () => {
    expect(sentinelAction({ isIntersecting: true, isFirstCallback: true })).toEqual({
      kind: "dwell",
      delayMs: NO_SCROLL_DWELL_MS,
    });
  });

  it("ticks instantly when the reader scrolled the end into view", () => {
    expect(sentinelAction({ isIntersecting: true, isFirstCallback: false })).toEqual({ kind: "tick" });
  });

  it("cancels a pending dwell when the end leaves view", () => {
    expect(sentinelAction({ isIntersecting: false, isFirstCallback: false })).toEqual({ kind: "cancel" });
    expect(sentinelAction({ isIntersecting: false, isFirstCallback: true })).toEqual({ kind: "cancel" });
  });

  it("keeps the dwell a pause rather than a reading-speed test", () => {
    expect(NO_SCROLL_DWELL_MS).toBeGreaterThan(1000);
    expect(NO_SCROLL_DWELL_MS).toBeLessThanOrEqual(10_000);
  });
});
