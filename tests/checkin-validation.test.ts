import { describe, expect, it } from "vitest";

import { localTodayFor, validateCheckIn } from "@/lib/checkin-validation";

describe("localTodayFor", () => {
  it("derives the reader's local date from their IANA timezone, not UTC", () => {
    // 2026-10-08T01:00:00Z is still 2026-10-07 in Manila (UTC+8 is ahead, so
    // this instant is 2026-10-08 09:00 there -- pick an instant that
    // actually differs across zones instead).
    const instant = new Date("2026-10-08T23:30:00Z");
    expect(localTodayFor("UTC", instant)).toBe("2026-10-08");
    expect(localTodayFor("Asia/Manila", instant)).toBe("2026-10-09");
    expect(localTodayFor("America/Los_Angeles", instant)).toBe("2026-10-08");
  });

  it("falls back to UTC today for an unrecognized zone", () => {
    const instant = new Date("2026-10-08T12:00:00Z");
    expect(localTodayFor("Not/AZone", instant)).toBe("2026-10-08");
  });
});

describe("validateCheckIn (F1: future-date guard)", () => {
  it("rejects a readingDate beyond the reader's true local today plus clock skew", () => {
    // Server "now" is 2026-10-10 in UTC; client claims a far-future
    // readingDate. Before the fix, the guard derived its ceiling from
    // readingDate itself, so this never failed.
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 20, readingDate: "2026-10-20", timezone: "UTC" }, now);
    expect(result).toEqual({ ok: false, error: "That date is outside the reading plan window." });
  });

  it("accepts today in the reader's timezone", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 10, readingDate: "2026-10-10", timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true });
  });

  it("accepts one day of clock skew (tomorrow, local)", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 11, readingDate: "2026-10-11", timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a date before the plan starts", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 1, readingDate: "2026-09-30", timezone: "UTC" }, now);
    expect(result.ok).toBe(false);
  });
});

describe("validateCheckIn (F2: chapter/day pairing)", () => {
  it("rejects a chapter that doesn't match the plan's chapter for that date", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 5, readingDate: "2026-10-10", timezone: "UTC" }, now);
    expect(result).toEqual({ ok: false, error: "That chapter doesn't match that date." });
  });

  it("allows the matching chapter for that date", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 10, readingDate: "2026-10-10", timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true });
  });

  it("allows catch-up on a past day whose chapter matches the plan", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 7, readingDate: "2026-10-07", timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true });
  });

  it("allows any already-assigned chapter on a grace day with no plan entry", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    const result = validateCheckIn({ chapter: 15, readingDate: "2026-10-29", timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true });
  });
});
