import { describe, expect, it } from "vitest";

import { PLAN, planEntryForChapter, planEntryForDate } from "@/lib/plan";

describe("PLAN", () => {
  it("has 28 entries", () => {
    expect(PLAN).toHaveLength(28);
  });

  it("has day and chapter matching 1..28 in order", () => {
    PLAN.forEach((entry, index) => {
      expect(entry.day).toBe(index + 1);
      expect(entry.chapter).toBe(index + 1);
    });
  });

  it("dates run October 1 through October 28, 2026", () => {
    expect(PLAN[0].date).toBe("2026-10-01");
    expect(PLAN[27].date).toBe("2026-10-28");
    PLAN.forEach((entry) => {
      expect(entry.date).toMatch(/^2026-10-\d{2}$/);
    });
  });

  it("every entry has a key passage referencing its own chapter and a title", () => {
    PLAN.forEach((entry) => {
      expect(entry.keyPassage.startsWith(`Matthew ${entry.chapter}:`)).toBe(true);
      expect(entry.title.length).toBeGreaterThan(0);
    });
  });
});

describe("planEntryForChapter", () => {
  it("finds the entry for a chapter", () => {
    expect(planEntryForChapter(8)?.date).toBe("2026-10-08");
  });

  it("returns undefined for an out-of-range chapter", () => {
    expect(planEntryForChapter(29)).toBeUndefined();
  });
});

describe("planEntryForDate", () => {
  it("finds the entry for a date", () => {
    expect(planEntryForDate("2026-10-08")?.chapter).toBe(8);
  });
});
