// @vitest-environment jsdom

/**
 * Issue 147 known-bad behavior exclusion tests.
 *
 * Verifies that all 5 known-bad behaviors are strictly excluded:
 * 1. A scroll-to-bottom at t=2s after content load does not qualify check-in.
 * 2. Reaching the bottom before 15s have elapsed does not qualify.
 * 3. A two-chapter day counts as exactly one assignment (not two) toward completion.
 * 4. A date after Oct 30 resolves to Review & Catch Up, not a closed/frozen state.
 * 5. Check-in attempt while blocked (test mode) performs no write, for both a
 *    single-chapter and a two-chapter assignment.
 */

import { describe, expect, it, vi } from "vitest";

import {
  PLAN,
  REVIEW_DATES,
  TOTAL_ASSIGNMENTS,
  completedAssignmentsCount,
  displayPhase,
  isAssignmentCompleted,
  planPhase,
  unfinishedAssignmentsUpTo,
} from "@/lib/plan";
import {
  BOTTOM_ELIGIBLE_DELAY_MS,
  MIN_READING_TIME_MS,
  ReadingQualificationTracker,
  sentinelAction,
  shouldWrite,
} from "@/lib/reading-tick";
import { guardWrite } from "@/components/test-mode/logic";

describe("Known-bad 1: Scroll-to-bottom at t=2s after content load does NOT qualify", () => {
  it("rejects bottom intersection occurring before 3s mark, even after 15s+ elapse", () => {
    const tracker = new ReadingQualificationTracker(MIN_READING_TIME_MS, BOTTOM_ELIGIBLE_DELAY_MS);
    const contentLoadedAt = 1000;
    tracker.onContentLoaded(contentLoadedAt);

    // Scroll to bottom at t = 2s (elapsed = 2000ms < 3000ms threshold)
    const at2s = contentLoadedAt + 2000;
    const resultAt2s = tracker.onIntersectionChange(true, at2s);

    expect(resultAt2s.qualifies).toBe(false);
    expect(resultAt2s.dwellMs).toBeUndefined();
    expect(tracker.isEligibleAtBottom()).toBe(false);
    expect(tracker.isQualified()).toBe(false);

    // Reader stays at bottom until t = 16s (elapsed = 16000ms > 15000ms min reading time)
    const at16s = contentLoadedAt + 16000;
    const timerResult = tracker.onTimerElapsed(at16s);

    expect(timerResult).toBe(false);
    expect(tracker.isQualified()).toBe(false);

    // Pure sentinelAction also rejects / cancels for t=2s
    const action = sentinelAction({
      isIntersecting: true,
      contentLoadedAt,
      now: at2s,
    });
    expect(action).toEqual({ kind: "cancel" });
  });

  it("qualifies ONLY when re-reaching bottom after the 3s mark once 15s have elapsed", () => {
    const tracker = new ReadingQualificationTracker(MIN_READING_TIME_MS, BOTTOM_ELIGIBLE_DELAY_MS);
    const contentLoadedAt = 1000;
    tracker.onContentLoaded(contentLoadedAt);

    // Reached at t=2s (ineligible)
    tracker.onIntersectionChange(true, contentLoadedAt + 2000);
    expect(tracker.isQualified()).toBe(false);

    // Re-reached after 3s mark (e.g. at t=4s)
    const at4s = contentLoadedAt + 4000;
    const resultAt4s = tracker.onIntersectionChange(true, at4s);
    expect(resultAt4s.qualifies).toBe(false);
    expect(resultAt4s.dwellMs).toBe(MIN_READING_TIME_MS - 4000);
    expect(tracker.isEligibleAtBottom()).toBe(true);

    // Timer fires at 15s
    const at15s = contentLoadedAt + MIN_READING_TIME_MS;
    const timerResult = tracker.onTimerElapsed(at15s);
    expect(timerResult).toBe(true);
    expect(tracker.isQualified()).toBe(true);
  });
});

describe("Known-bad 2: Reaching bottom before 15s have elapsed does NOT qualify", () => {
  it("does not qualify at t=5s, requiring dwell until 15s mark", () => {
    const tracker = new ReadingQualificationTracker(MIN_READING_TIME_MS, BOTTOM_ELIGIBLE_DELAY_MS);
    const contentLoadedAt = 1000;
    tracker.onContentLoaded(contentLoadedAt);

    // Reached at t=5s (eligible because >3s, but elapsed < 15s)
    const at5s = contentLoadedAt + 5000;
    const resultAt5s = tracker.onIntersectionChange(true, at5s);

    expect(resultAt5s.qualifies).toBe(false);
    expect(resultAt5s.dwellMs).toBe(10_000); // 15_000 - 5_000
    expect(tracker.isQualified()).toBe(false);

    // Check at t=10s (still before 15s)
    const at10s = contentLoadedAt + 10_000;
    expect(tracker.onTimerElapsed(at10s)).toBe(false);
    expect(tracker.isQualified()).toBe(false);

    // Reaches 15s
    const at15s = contentLoadedAt + 15_000;
    expect(tracker.onTimerElapsed(at15s)).toBe(true);
    expect(tracker.isQualified()).toBe(true);
  });

  it("qualifies immediately if reaching bottom after 15s have elapsed", () => {
    const tracker = new ReadingQualificationTracker(MIN_READING_TIME_MS, BOTTOM_ELIGIBLE_DELAY_MS);
    const contentLoadedAt = 1000;
    tracker.onContentLoaded(contentLoadedAt);

    // Reached at t=16s (>3s and >15s)
    const at16s = contentLoadedAt + 16_000;
    const resultAt16s = tracker.onIntersectionChange(true, at16s);

    expect(resultAt16s.qualifies).toBe(true);
    expect(resultAt16s.dwellMs).toBeUndefined();
    expect(tracker.isQualified()).toBe(true);
  });
});

describe("Known-bad 3: A two-chapter day counts as exactly one assignment toward completion", () => {
  it("treats Matthew 1-2 (Day 1) as incomplete if only chapter 1 is read", () => {
    const day1 = PLAN[0]; // chapters: [1, 2]
    expect(day1.chapters).toEqual([1, 2]);

    expect(isAssignmentCompleted(day1, [1])).toBe(false);
    expect(completedAssignmentsCount([1])).toBe(0);
  });

  it("counts Day 1 as exactly 1 assignment when both chapters [1, 2] are read", () => {
    const day1 = PLAN[0];
    expect(isAssignmentCompleted(day1, [1, 2])).toBe(true);
    expect(completedAssignmentsCount([1, 2])).toBe(1);
  });

  it("counts Day 1 and Day 2 (4 total chapters: 1, 2, 3, 4) as exactly 2 assignments, not 4", () => {
    expect(completedAssignmentsCount([1, 2, 3, 4])).toBe(2);
  });

  it("counts all 28 Matthew chapters as exactly 20 assignments total", () => {
    const all28 = Array.from({ length: 28 }, (_, i) => i + 1);
    expect(completedAssignmentsCount(all28)).toBe(TOTAL_ASSIGNMENTS);
    expect(TOTAL_ASSIGNMENTS).toBe(20);
  });
});

describe("Known-bad 4: Dates after Oct 30 resolve to Review & Catch Up forever, never closed/frozen", () => {
  it("resolves planPhase and displayPhase to review for all dates after Oct 30", () => {
    const postPlanDates = [
      "2026-10-31",
      "2026-11-01",
      "2026-11-15",
      "2026-12-31",
      "2027-01-01",
      "2030-10-05",
    ];

    for (const date of postPlanDates) {
      expect(planPhase(date)).toBe("review");
      expect(displayPhase(date)).toBe("review");
    }
  });

  it("keeps all 20 assignments available for catch-up after Oct 30", () => {
    const unfinished = unfinishedAssignmentsUpTo("2026-11-05", []);
    expect(unfinished).toHaveLength(20);
    expect(unfinished.map((e) => e.day)).toEqual(PLAN.map((e) => e.day));
  });

  it("resolves weekend review dates during the campaign to review phase", () => {
    for (const date of REVIEW_DATES) {
      expect(displayPhase(date)).toBe("review");
    }
  });
});

describe("Known-bad 5: Check-in attempts while blocked in Test Mode perform NO write", () => {
  it("blocks writes for a single-chapter assignment when blocked is true", async () => {
    const rawCheckIn = vi.fn(async (input: { chapter: number; timezone: string }) => ({
      ok: true as const,
      group: null,
      input,
    }));
    const guardedCheckIn = guardWrite(true, rawCheckIn);

    // Single-chapter assignment (e.g. Matthew 5)
    const day3 = PLAN[2];
    const chaptersToRecord = day3.chapters ?? [day3.chapter];
    expect(chaptersToRecord).toEqual([5]);

    const results = await Promise.all(
      chaptersToRecord.map((chapter) => guardedCheckIn({ chapter, timezone: "UTC" })),
    );

    // No write occurred
    expect(rawCheckIn).not.toHaveBeenCalled();
    expect(results[0]).toEqual({ ok: false, error: "Test mode: writes are disabled." });

    // shouldWrite logic also agrees
    expect(
      shouldWrite({
        alreadyRead: false,
        alreadyFired: false,
        writesBlocked: true,
        preview: false,
      }),
    ).toBe(false);
  });

  it("blocks writes for both chapters of a two-chapter assignment when blocked is true", async () => {
    const rawCheckIn = vi.fn(async (input: { chapter: number; timezone: string }) => ({
      ok: true as const,
      group: null,
      input,
    }));
    const guardedCheckIn = guardWrite(true, rawCheckIn);

    // Two-chapter assignment (e.g. Day 1: Matthew 1-2)
    const day1 = PLAN[0];
    const chaptersToRecord = day1.chapters ?? [day1.chapter];
    expect(chaptersToRecord).toEqual([1, 2]);

    const results = await Promise.all(
      chaptersToRecord.map((chapter) => guardedCheckIn({ chapter, timezone: "UTC" })),
    );

    // Neither chapter 1 nor chapter 2 was written to the server
    expect(rawCheckIn).not.toHaveBeenCalled();
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ ok: false, error: "Test mode: writes are disabled." });
    expect(results[1]).toEqual({ ok: false, error: "Test mode: writes are disabled." });
  });

  it("permits writes through guardWrite only when blocked is false", async () => {
    const rawCheckIn = vi.fn(async (input: { chapter: number; timezone: string }) => ({
      ok: true as const,
      group: null,
      chapter: input.chapter,
    }));
    const guardedCheckIn = guardWrite(false, rawCheckIn);

    // Two-chapter assignment writes both chapters through when unblocked
    const day1 = PLAN[0];
    const chaptersToRecord = day1.chapters ?? [day1.chapter];

    const results = await Promise.all(
      chaptersToRecord.map((chapter) => guardedCheckIn({ chapter, timezone: "UTC" })),
    );

    expect(rawCheckIn).toHaveBeenCalledTimes(2);
    expect(results[0]).toMatchObject({ ok: true, chapter: 1 });
    expect(results[1]).toMatchObject({ ok: true, chapter: 2 });
  });
});
