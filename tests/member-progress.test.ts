import { describe, expect, it } from "vitest";

import {
  deriveMemberReadingHistory,
  recentFiveDayStreak,
} from "@/lib/member-progress";

describe("deriveMemberReadingHistory", () => {
  it("derives compact reading history per member from checkin rows", () => {
    const checkinRows = [
      { rockPersonId: 101, chapter: 1, readingDate: "2026-10-01" },
      { rockPersonId: 101, chapter: 2, readingDate: "2026-10-02" },
      { rockPersonId: 102, chapter: 1, readingDate: "2026-10-01" },
    ];

    const history = deriveMemberReadingHistory(checkinRows, [101, 102, 103]);

    expect(history.get(101)).toEqual({
      chapters: [1, 2],
      dates: ["2026-10-01", "2026-10-02"],
    });
    expect(history.get(102)).toEqual({
      chapters: [1],
      dates: ["2026-10-01"],
    });
    // Reduced-value case: member 103 has 0 checkins
    expect(history.get(103)).toEqual({
      chapters: [],
      dates: [],
    });
  });

  it("never exposes verse text, notes, or private metadata in member history", () => {
    const rawRowsWithExtraMetadata = [
      {
        rockPersonId: 101,
        chapter: 5,
        readingDate: "2026-10-05",
        verseText: "Blessed are the meek",
        prayerNote: "Private prayer",
        ipAddress: "192.168.1.1",
      },
    ];

    const history = deriveMemberReadingHistory(
      rawRowsWithExtraMetadata as unknown as Array<{ rockPersonId: number; chapter: number; readingDate: string }>,
      [101],
    );
    const member101 = history.get(101)!;

    expect(Object.keys(member101).sort()).toEqual(["chapters", "dates"]);
    expect((member101 as Record<string, unknown>).verseText).toBeUndefined();
    expect((member101 as Record<string, unknown>).prayerNote).toBeUndefined();
    expect((member101 as Record<string, unknown>).ipAddress).toBeUndefined();
  });

  it("handles changed-value case when new check-ins are added or updated", () => {
    const initialRows = [
      { rockPersonId: 101, chapter: 1, readingDate: "2026-10-01" },
    ];
    const initialHistory = deriveMemberReadingHistory(initialRows, [101]);
    expect(initialHistory.get(101)?.chapters).toEqual([1]);

    // Changed-value: new checkin added
    const updatedRows = [
      { rockPersonId: 101, chapter: 1, readingDate: "2026-10-01" },
      { rockPersonId: 101, chapter: 2, readingDate: "2026-10-02" },
      { rockPersonId: 101, chapter: 3, readingDate: "2026-10-03" },
    ];
    const updatedHistory = deriveMemberReadingHistory(updatedRows, [101]);
    expect(updatedHistory.get(101)?.chapters).toEqual([1, 2, 3]);
    expect(updatedHistory.get(101)?.dates).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  });

  it("handles reduced-value case when a member has zero check-ins or duplicate rows", () => {
    const rowsWithDuplicates = [
      { rockPersonId: 201, chapter: 1, readingDate: "2026-10-01" },
      { rockPersonId: 201, chapter: 1, readingDate: "2026-10-01" },
    ];
    const history = deriveMemberReadingHistory(rowsWithDuplicates, [201, 202]);

    expect(history.get(201)?.chapters).toEqual([1]);
    expect(history.get(201)?.dates).toEqual(["2026-10-01"]);
    expect(history.get(202)?.chapters).toEqual([]);
    expect(history.get(202)?.dates).toEqual([]);
  });
});

describe("recentFiveDayStreak", () => {
  it("derives the last 5 days ending at todayLocal and marks read status", () => {
    const dates = ["2026-10-05", "2026-10-06", "2026-10-08"];
    const marks = recentFiveDayStreak(dates, "2026-10-08");

    expect(marks).toHaveLength(5);
    expect(marks.map((m) => m.date)).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
    ]);
    expect(marks.map((m) => m.day)).toEqual([4, 5, 6, 7, 8]);
    expect(marks.map((m) => m.label)).toEqual(["Oct 4", "Oct 5", "Oct 6", "Oct 7", "Oct 8"]);
    expect(marks.map((m) => m.read)).toEqual([false, true, true, false, true]);
  });

  it("keeps month labels correct when the post-campaign window is clamped", () => {
    const marks = recentFiveDayStreak(["2026-10-31"], "2026-11-05");

    expect(marks.map((m) => m.date)).toEqual([
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
    ]);
    expect(marks.map((mark) => mark.label)).toEqual(["Oct 27", "Oct 28", "Oct 29", "Oct 30", "Oct 31"]);
    expect(marks.at(-1)?.read).toBe(true);
  });

  it("returns 5 empty marks for pre-launch dates before October 1", () => {
    const marks = recentFiveDayStreak([], "2026-09-20");
    expect(marks).toHaveLength(5);
    expect(marks.every((m) => m.read === false)).toBe(true);
    expect(marks.map((m) => m.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
    ]);
  });
});
