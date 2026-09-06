import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));

const mockCheckins = [
  { rockPersonId: 101, groupId: 24077, chapter: 1, readingDate: "2026-10-01" }, // active group
  { rockPersonId: 101, groupId: 24001, chapter: 2, readingDate: "2026-10-02" }, // other group
  { rockPersonId: 101, groupId: null,  chapter: 3, readingDate: "2026-10-03" }, // solo read (groupId NULL)
  { rockPersonId: 102, groupId: 24077, chapter: 1, readingDate: "2026-10-01" }, // active group
  { rockPersonId: 999, groupId: 24077, chapter: 5, readingDate: "2026-10-05" }, // other member not in roster
];

const dialect = new PgDialect();

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((predicate) => {
          const { sql, params } = dialect.sqlToQuery(predicate);
          const hasGroupFilter = sql.includes("group_id");
          const targetGroupId = hasGroupFilter ? (params[0] as number) : null;
          const personIds = hasGroupFilter ? (params.slice(1) as number[]) : (params as number[]);

          const matchingRows = mockCheckins
            .filter((row) => {
              const matchesPerson = Array.isArray(personIds) && personIds.includes(row.rockPersonId);
              const matchesGroup = hasGroupFilter ? row.groupId === targetGroupId : true;
              return matchesPerson && matchesGroup;
            })
            .map((r) => ({
              rockPersonId: r.rockPersonId,
              chapter: r.chapter,
              readingDate: r.readingDate,
            }));

          return Promise.resolve(matchingRows);
        }),
      })),
    })),
  },
}));

import { getGroupMembersReadingHistory } from "@/lib/data/stats";
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

  it("does not show pre-campaign dates during launch week", () => {
    const marks = recentFiveDayStreak(["2026-10-02"], "2026-10-02");

    expect(marks.map((mark) => mark.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
    ]);
    expect(marks.filter((mark) => mark.read)).toHaveLength(1);
  });

  it("returns 5 empty marks for pre-launch dates before October 1", () => {
    const marks = recentFiveDayStreak([], "2026-09-20");
    expect(marks).toHaveLength(5);
    expect(marks.every((m) => m.read === false)).toBe(true);
    expect(marks.every((m) => m.future === true)).toBe(true);
    expect(marks.map((m) => m.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
    ]);
  });

  it("marks not-yet-available launch-week days as upcoming", () => {
    const marks = recentFiveDayStreak([], "2026-10-02");

    expect(marks.map((mark) => mark.future)).toEqual([false, false, true, true, true]);
    expect(marks.filter((mark) => mark.read)).toHaveLength(0);
  });

  it("handles launch day with only day 1 available and future days suppressed", () => {
    const marks = recentFiveDayStreak(["2026-10-01"], "2026-10-01");
    expect(marks[0]).toMatchObject({
      date: "2026-10-01",
      day: 1,
      read: true,
      future: false,
    });
    expect(marks[1]).toMatchObject({
      date: "2026-10-02",
      day: 2,
      read: false,
      future: true,
    });
    expect(marks.slice(1).every((m) => m.future)).toBe(true);
    expect(marks.slice(1).every((m) => !m.read)).toBe(true);
  });

  it("never marks future days as read even if dates array contains them", () => {
    const marks = recentFiveDayStreak(["2026-10-01", "2026-10-03"], "2026-10-02");
    const day3 = marks.find((m) => m.date === "2026-10-03");
    expect(day3).toBeDefined();
    expect(day3?.future).toBe(true);
    expect(day3?.read).toBe(false);
  });
});

describe("getGroupMembersReadingHistory", () => {
  it("filters check-ins strictly to the active group, excluding solo (NULL) and other-group rows", async () => {
    const activeGroupId = 24077;
    const rosterPersonIds = [101, 102, 103];

    // member 101 has:
    // - ch 1 with groupId 24077 (current group)
    // - ch 2 with groupId 24001 (other group)
    // - ch 3 with groupId NULL (solo read)
    // member 102 has:
    // - ch 1 with groupId 24077 (current group)
    // member 103 has no check-ins
    // person 999 has checkin with groupId 24077 but is not in roster

    const history = await getGroupMembersReadingHistory(activeGroupId, rosterPersonIds);

    expect(history.has(101)).toBe(true);
    expect(history.has(102)).toBe(true);
    expect(history.has(103)).toBe(true);
    expect(history.has(999)).toBe(false);

    // Only current-group check-ins must reach the member history model
    expect(history.get(101)?.chapters).toEqual([1]);
    expect(history.get(101)?.dates).toEqual(["2026-10-01"]);

    // Proves other-group (24001) and solo (NULL) rows are excluded
    expect(history.get(101)?.chapters).not.toContain(2);
    expect(history.get(101)?.chapters).not.toContain(3);

    expect(history.get(102)?.chapters).toEqual([1]);
    expect(history.get(102)?.dates).toEqual(["2026-10-01"]);

    // Reduced-value case: member 103 with zero check-ins in active group
    expect(history.get(103)?.chapters).toEqual([]);
    expect(history.get(103)?.dates).toEqual([]);
  });

  it("returns an empty map when groupId is missing or personIds is empty", async () => {
    expect((await getGroupMembersReadingHistory(0, [101])).size).toBe(0);
    expect((await getGroupMembersReadingHistory(24077, [])).size).toBe(0);
  });
});
