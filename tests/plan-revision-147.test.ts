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

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const testModeHarness = vi.hoisted(() => ({
  checkIn: vi.fn(async (input: { chapter: number; timezone: string }) => ({ ok: true as const, group: null, input })),
}));
const searchParams = vi.hoisted(() => ({ value: new URLSearchParams("test=1&day=3") }));

vi.mock("@/app/actions/checkIn", () => ({ checkIn: (input: { chapter: number; timezone: string }) => testModeHarness.checkIn(input) }));
vi.mock("@/app/actions/joinByCode", () => ({ joinByCode: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/chooseGroup", () => ({ chooseGroup: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/saveProfile", () => ({ saveProfile: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({ getOrCreateJoinCode: vi.fn(async () => ({ ok: true, code: "TEST12" })) }));
vi.mock("@/app/actions/getTestGroupSnapshot", () => ({ getTestGroupSnapshot: vi.fn(async () => ({ ok: false, error: "not used" })) }));
vi.mock("@/app/actions/getJoinCodeForGroup", () => ({ getJoinCodeForGroup: vi.fn(async () => ({ ok: true, code: null })) }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => searchParams.value,
}));

import { AppShell, type AppShellProps } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";

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
} from "@/lib/reading-tick";

const roster = [{
  personId: 7001,
  avatar: { ...defaultAvatarConfig },
  isSelf: true,
  name: "Synthetic Reader",
  isLeader: false,
  readToday: false,
  chapters: [],
  readingDates: [],
}];

function baseProps(): AppShellProps {
  return {
    displayName: "Synthetic Reader",
    avatar: { ...defaultAvatarConfig },
    avatarCustomized: true,
    translation: "NIV",
    memberships: [],
    activeGroup: { groupId: 12345, groupName: "Synthetic Group", campusId: 1, roleId: 23, isLeader: false },
    needsGroupChoice: false,
    isLeader: false,
    campusName: "Synthetic Campus",
    roster,
    chapters: [],
    readingDates: [],
    groupStats: { checkinCount: 0, memberCount: 1, ratio: 0, readersTodayIds: [] },
    campusBoard: [],
    appBaseUrl: "https://example.test",
    devMockToday: "2026-10-05",
    campusGroups: [],
    testWritableGroupId: null,
    testModeAuthorized: true,
    sectionSlot: null,
  };
}

let mockNow = 1_000;
class ImmediateIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: false, target } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    queueMicrotask(() => {
      mockNow += 16_000;
      this.callback([{ isIntersecting: true, target } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    });
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

beforeEach(() => {
  mockNow = 1_000;
  searchParams.value = new URLSearchParams("test=1&day=3");
  testModeHarness.checkIn.mockClear();
  vi.spyOn(performance, "now").mockImplementation(() => mockNow);
  vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    ref: "Matthew 5",
    translation: "NIV",
    text: "A passage",
    verses: { "1": "A verse" },
    bibleComUrl: "",
    attribution: "",
  }), { status: 200, headers: { "content-type": "application/json" } })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
  it.each([
    ["single-chapter", "3"],
    ["two-chapter", "1"],
  ])("drives the real AppShell and performs no %s write", async (_label, day) => {
    searchParams.value = new URLSearchParams(`test=1&day=${day}`);
    render(React.createElement(AppShell, baseProps()));

    fireEvent.click(screen.getByRole("button", { name: /read matthew/i }));
    await waitFor(() => expect(document.querySelector('[data-section="reading-tick"]')?.getAttribute("data-state")).toBe("ticked"));
    expect(testModeHarness.checkIn).not.toHaveBeenCalled();
  });
});
