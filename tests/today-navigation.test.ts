import { describe, expect, it } from "vitest";

import { clampReadingChapter, isChapterRead, planEntryForDate, syncViewedChapter } from "@/lib/plan";
import { dateForSimulatedDay, simulatedTodayState } from "@/components/test-mode/logic";

describe("Today reading navigation", () => {
  it("clamps the previous boundary to chapter 1", () => {
    expect(clampReadingChapter(0, 5)).toBe(1);
  });

  it("allows the single forward preview at today's next chapter", () => {
    expect(clampReadingChapter(6, 5)).toBe(6);
  });

  it("clamps the forward boundary to entry.chapter + 1", () => {
    expect(clampReadingChapter(7, 5)).toBe(6);
  });

  it("checks read state for the viewed chapter", () => {
    const chapters = [1, 3, 5];

    expect(isChapterRead(3, chapters)).toBe(true);
    expect(isChapterRead(4, chapters)).toBe(false);
  });

  it("resets the viewed chapter when the simulated test day changes", () => {
    const dayOne = simulatedTodayState(dateForSimulatedDay(1, "active"), "UTC").entry;
    const dayFive = simulatedTodayState(dateForSimulatedDay(5, "active"), "UTC").entry;

    expect(syncViewedChapter(dayFive?.chapter ?? null, dayOne?.chapter ?? 1, dayOne?.chapter ?? 1)).toEqual({
      syncedChapter: 5,
      viewedChapter: 5,
    });
  });

  it("resets the viewed chapter when today's entry changes overnight", () => {
    const yesterday = planEntryForDate("2026-10-01");
    const today = planEntryForDate("2026-10-02");

    expect(syncViewedChapter(today?.chapter ?? null, yesterday?.chapter ?? 1, yesterday?.chapter ?? 1)).toEqual({
      syncedChapter: 2,
      viewedChapter: 2,
    });
  });
});
