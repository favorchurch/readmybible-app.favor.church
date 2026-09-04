import { describe, expect, it } from "vitest";

import { clampReadingChapter, isChapterRead } from "@/lib/plan";

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
});
