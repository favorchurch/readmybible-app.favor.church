import { describe, expect, it } from "vitest";

import {
  assignmentReference,
  chapterReference,
  completedAssignmentsCount,
  entryChapters,
  isAssignmentCompleted,
  MATTHEW_VERSE_COUNTS,
  PLAN,
  planEntryForChapter,
  planEntryForDate,
  TOTAL_ASSIGNMENTS,
  TOTAL_CHAPTERS,
} from "@/lib/plan";

describe("PLAN", () => {
  it("has 20 entries", () => {
    expect(PLAN).toHaveLength(TOTAL_ASSIGNMENTS);
  });

  it("has day matching 1..20 in order and covers chapters 1..28", () => {
    PLAN.forEach((entry, index) => {
      expect(entry.day).toBe(index + 1);
    });
    const allChapters = PLAN.flatMap((e) => entryChapters(e));
    expect(allChapters).toHaveLength(TOTAL_CHAPTERS);
    expect(allChapters).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });

  it("dates run October 5 through October 30, 2026", () => {
    expect(PLAN[0].date).toBe("2026-10-05");
    expect(PLAN[19].date).toBe("2026-10-30");
    PLAN.forEach((entry) => {
      expect(entry.date).toMatch(/^2026-10-\d{2}$/);
    });
  });

  it("every entry has a key passage referencing its chapters and a title", () => {
    PLAN.forEach((entry) => {
      const chs = entryChapters(entry);
      expect(chs.some((c) => entry.keyPassage.startsWith(`Matthew ${c}:`))).toBe(true);
      expect(entry.title.length).toBeGreaterThan(0);
    });
  });
});

describe("planEntryForChapter", () => {
  it("finds the entry for a chapter (including multi-chapter assignments)", () => {
    expect(planEntryForChapter(1)?.date).toBe("2026-10-05");
    expect(planEntryForChapter(2)?.date).toBe("2026-10-05");
    expect(planEntryForChapter(8)?.date).toBe("2026-10-12");
    expect(planEntryForChapter(9)?.date).toBe("2026-10-12");
  });

  it("returns undefined for an out-of-range chapter", () => {
    expect(planEntryForChapter(29)).toBeUndefined();
  });
});

describe("planEntryForDate", () => {
  it("finds the entry for a scheduled reading date", () => {
    expect(planEntryForDate("2026-10-05")?.chapter).toBe(1);
    expect(planEntryForDate("2026-10-12")?.chapter).toBe(8);
  });

  it("returns undefined for weekend review dates", () => {
    expect(planEntryForDate("2026-10-10")).toBeUndefined();
    expect(planEntryForDate("2026-10-11")).toBeUndefined();
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

describe("assignmentReference", () => {
  it("formats single-chapter and multi-chapter assignment references", () => {
    expect(assignmentReference(PLAN[0])).toBe("Matthew 1–2");
    expect(assignmentReference(PLAN[2])).toBe("Matthew 5");
  });
});

describe("assignment completion", () => {
  it("checks completion and counts completed assignments", () => {
    expect(isAssignmentCompleted(PLAN[0], [1])).toBe(false);
    expect(isAssignmentCompleted(PLAN[0], [1, 2])).toBe(true);
    expect(completedAssignmentsCount([1, 2])).toBe(1);
    expect(completedAssignmentsCount([1, 2, 3, 4])).toBe(2);
  });
});

