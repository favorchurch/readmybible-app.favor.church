import { describe, expect, it } from "vitest";

import { chapterReference, MATTHEW_VERSE_COUNTS, PLAN, planEntryForChapter, planEntryForDate } from "@/lib/plan";

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

describe("MATTHEW_VERSE_COUNTS", () => {
  it("has exactly 28 entries", () => {
    expect(MATTHEW_VERSE_COUNTS).toHaveLength(28);
  });

  it("every value is a positive integer", () => {
    MATTHEW_VERSE_COUNTS.forEach((count) => {
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThan(0);
    });
  });
});

describe("chapterReference", () => {
  it("returns the full verse range for a chapter (issue #123)", () => {
    expect(chapterReference(20)).toBe("Matthew 20:1-34");
  });

  it("handles the first chapter", () => {
    expect(chapterReference(1)).toBe("Matthew 1:1-25");
  });

  it("handles the last chapter", () => {
    expect(chapterReference(28)).toBe("Matthew 28:1-20");
  });

  it("clamps an out-of-range chapter instead of printing undefined", () => {
    expect(chapterReference(29)).toBe("Matthew 28:1-20");
    expect(chapterReference(0)).toBe("Matthew 1:1-25");
    expect(chapterReference(-5)).toBe("Matthew 1:1-25");
    expect(chapterReference(29)).not.toContain("undefined");
  });
});
