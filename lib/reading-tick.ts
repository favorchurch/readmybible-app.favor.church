/**
 * The qualified check-in rules (issue #147).
 *
 * A reading check-in qualifies only when BOTH are true:
 * 1. at least 15 seconds have elapsed since the reading content finished loading, and
 * 2. the reader has reached the bottom of the pane -- and bottom tracking is only
 *    eligible starting 3 seconds after content load (a scroll-to-bottom at t=2s
 *    must not arm the check-in, even if the reader is still there at t=16s;
 *    re-reaching the bottom after the 3s mark is what counts).
 *
 * Qualification is per assignment, not per chapter.
 */
import type { CheckInGroupState, CheckInResult } from "@/app/actions/checkIn";
import { groupStateFor, stageFor } from "@/lib/game";
import { TOTAL_ASSIGNMENTS } from "@/lib/plan";

export const MIN_READING_TIME_MS = 15_000;
export const BOTTOM_ELIGIBLE_DELAY_MS = 3_000;
export const NO_SCROLL_DWELL_MS = 5000;

/**
 * The dialog's tick state.
 */
export type TickState =
  | { kind: "idle" }
  | { kind: "ticked"; group: CheckInGroupState | null; simulated: boolean }
  | { kind: "retrying" }
  | { kind: "failed"; error: string };

/**
 * Pure state machine tracking whether a reading check-in has qualified.
 */
export class ReadingQualificationTracker {
  private contentLoadedAt: number | null = null;
  private bottomReachedEligible = false;
  private isAtBottom = false;
  private qualified = false;
  private isVisible = true;
  private hiddenAt: number | null = null;
  private hiddenDurationMs = 0;

  constructor(
    private readonly minReadingTimeMs = MIN_READING_TIME_MS,
    private readonly bottomEligibleDelayMs = BOTTOM_ELIGIBLE_DELAY_MS,
  ) {}

  onContentLoaded(timestamp: number) {
    this.contentLoadedAt = timestamp;
    this.bottomReachedEligible = false;
    this.qualified = false;
    this.isVisible = true;
    this.hiddenAt = null;
    this.hiddenDurationMs = 0;
  }

  onVisibilityChange(isVisible: boolean, timestamp: number) {
    if (isVisible === this.isVisible) return;
    if (isVisible) {
      if (this.hiddenAt !== null) {
        this.hiddenDurationMs += Math.max(0, timestamp - this.hiddenAt);
      }
      this.hiddenAt = null;
    } else {
      this.hiddenAt = timestamp;
    }
    this.isVisible = isVisible;
  }

  onIntersectionChange(isIntersecting: boolean, timestamp: number): {
    qualifies: boolean;
    dwellMs?: number;
  } {
    this.isAtBottom = isIntersecting;

    if (!isIntersecting) {
      return { qualifies: false };
    }

    if (this.contentLoadedAt === null) {
      return { qualifies: false };
    }

    if (!this.isVisible) {
      return { qualifies: false };
    }

    const elapsed = this.elapsedAt(timestamp);

    // Bottom tracking is only eligible starting 3 seconds after content load.
    // A scroll-to-bottom before 3s does not arm the check-in.
    if (elapsed < this.bottomEligibleDelayMs) {
      this.bottomReachedEligible = false;
      return { qualifies: false };
    }

    this.bottomReachedEligible = true;

    // Condition 1: at least 15 seconds have elapsed since reading content loaded
    if (elapsed >= this.minReadingTimeMs) {
      this.qualified = true;
      return { qualifies: true };
    }

    // Condition 2 met, waiting for 15s mark:
    return {
      qualifies: false,
      dwellMs: this.minReadingTimeMs - elapsed,
    };
  }

  onTimerElapsed(timestamp: number): boolean {
    if (this.contentLoadedAt === null || !this.isVisible || !this.isAtBottom || !this.bottomReachedEligible) {
      return false;
    }
    const elapsed = this.elapsedAt(timestamp);
    if (elapsed >= this.minReadingTimeMs) {
      this.qualified = true;
      return true;
    }
    return false;
  }

  isEligibleAtBottom(): boolean {
    return this.isAtBottom && this.bottomReachedEligible;
  }

  isQualified(): boolean {
    return this.qualified;
  }

  private elapsedAt(timestamp: number): number {
    if (this.contentLoadedAt === null) return 0;
    const currentHiddenDuration = this.hiddenAt === null ? 0 : Math.max(0, timestamp - this.hiddenAt);
    return timestamp - this.contentLoadedAt - this.hiddenDurationMs - currentHiddenDuration;
  }
}

/**
 * May this check-in entry perform a real write?
 */
export function shouldWrite(args: {
  alreadyRead: boolean;
  alreadyFired: boolean;
  writesBlocked: boolean;
  preview: boolean;
}): boolean {
  if (args.preview) return false;
  if (args.writesBlocked) return false;
  if (args.alreadyRead) return false;
  if (args.alreadyFired) return false;
  return true;
}

export type SentinelAction =
  | { kind: "tick" }
  | { kind: "dwell"; delayMs: number }
  | { kind: "cancel" };

export function sentinelAction(args: {
  isIntersecting: boolean;
  contentLoadedAt?: number;
  now?: number;
  isFirstCallback?: boolean;
}): SentinelAction {
  if (!args.isIntersecting) return { kind: "cancel" };

  if (args.contentLoadedAt !== undefined && args.now !== undefined) {
    const elapsed = args.now - args.contentLoadedAt;
    if (elapsed < BOTTOM_ELIGIBLE_DELAY_MS) {
      return { kind: "cancel" };
    }
    if (elapsed >= MIN_READING_TIME_MS) {
      return { kind: "tick" };
    }
    return { kind: "dwell", delayMs: MIN_READING_TIME_MS - elapsed };
  }

  // Legacy fallback if timestamps are omitted
  if (args.isFirstCallback) return { kind: "dwell", delayMs: NO_SCROLL_DWELL_MS };
  return { kind: "tick" };
}

/**
 * One silent retry, then surface an error.
 */
export async function checkInWithRetry(
  action: () => Promise<CheckInResult>,
  onRetry?: () => void,
): Promise<CheckInResult> {
  const first = await action().catch(() => null);
  if (first?.ok) return first;
  onRetry?.();
  const second = await action().catch(() => null);
  if (second) return second;
  return first ?? { ok: false, error: "We couldn't save that just now. Tap to try again." };
}

export function simulatedCheckInGroup(args: {
  ratio: number;
  memberCount: number;
}): CheckInGroupState {
  const members = Math.max(1, args.memberCount);
  const totalSlots = members * TOTAL_ASSIGNMENTS;
  const beforeCheckins = Math.round(args.ratio * totalSlots);
  const afterCheckins = Math.min(totalSlots, beforeCheckins + 1);
  return {
    before: { ratio: args.ratio, stage: stageFor(args.ratio) },
    after: groupStateFor(afterCheckins, members),
    checkinCount: afterCheckins,
    memberCount: members,
  };
}
