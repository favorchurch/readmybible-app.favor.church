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

describe("validateCheckIn", () => {
  it("accepts today's chapter and derives its plan reading_date", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 10, timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true, readingDate: "2026-10-10" });
  });

  it("accepts one day of clock skew (tomorrow's chapter, local)", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 11, timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true, readingDate: "2026-10-11" });
  });

  it("rejects a chapter beyond the reader's true local today plus clock skew", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 20, timezone: "UTC" }, now);
    expect(result).toEqual({ ok: false, error: "That date is outside the reading plan window." });
  });

  it("catch-up for chapter 3 on Oct 10 passes", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 3, timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true, readingDate: "2026-10-03" });
  });

  it("chapter 12 on Oct 10 fails", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const result = validateCheckIn({ chapter: 12, timezone: "UTC" }, now);
    expect(result).toEqual({ ok: false, error: "That date is outside the reading plan window." });
  });

  it("chapter 28 on Oct 29 passes (grace-day catch-up)", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const result = validateCheckIn({ chapter: 28, timezone: "UTC" }, now);
    expect(result).toEqual({ ok: true, readingDate: "2026-10-28" });
  });
});
