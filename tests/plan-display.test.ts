import { describe, expect, it } from "vitest";

import { checkInOpensLabel, displayPhase, dayState, longDate, planEntryForDate } from "@/lib/plan";

describe("displayPhase", () => {
  it("is pre-launch before October 1", () => {
    expect(displayPhase("2026-09-30")).toBe("pre-launch");
  });

  it("is active on October 1 and mid-plan days", () => {
    expect(displayPhase("2026-10-01")).toBe("active");
    expect(displayPhase("2026-10-28")).toBe("active");
  });

  it("is grace on October 29 through 31", () => {
    expect(displayPhase("2026-10-29")).toBe("grace");
    expect(displayPhase("2026-10-30")).toBe("grace");
    expect(displayPhase("2026-10-31")).toBe("grace");
  });

  it("is closed after October 31", () => {
    expect(displayPhase("2026-11-01")).toBe("closed");
  });
});

describe("dayState", () => {
  const entry = planEntryForDate("2026-10-10")!;

  it("is read when isRead is true, regardless of date", () => {
    expect(dayState(entry, "2026-10-10", true)).toBe("read");
    expect(dayState(entry, "2026-10-20", true)).toBe("read");
  });

  it("is today when the entry's date matches todayLocal and unread", () => {
    expect(dayState(entry, "2026-10-10", false)).toBe("today");
  });

  it("is catch-up for an unread past day", () => {
    expect(dayState(entry, "2026-10-15", false)).toBe("catch-up");
  });

  it("is upcoming for an unread future day", () => {
    expect(dayState(entry, "2026-10-05", false)).toBe("upcoming");
  });

  it("is upcoming for every day before the plan starts, even a date that would otherwise read as catch-up", () => {
    // todayLocal before PLAN_START; entry.date < todayLocal never applies pre-launch,
    // but the guard exists for the case a caller passes a pre-launch todayLocal anyway.
    expect(dayState(entry, "2026-09-15", false)).toBe("upcoming");
  });
});

describe("checkInOpensLabel", () => {
  it("names the entry's day of October", () => {
    const entry = planEntryForDate("2026-10-20")!;
    expect(checkInOpensLabel(entry)).toBe("Check-in opens October 20.");
  });
});

describe("longDate", () => {
  it("formats a date as weekday, month day", () => {
    expect(longDate("2026-10-01")).toBe("Thursday, October 1");
  });

  it("does not shift the day across a month boundary", () => {
    expect(longDate("2026-09-30")).toBe("Wednesday, September 30");
    expect(longDate("2026-11-01")).toBe("Sunday, November 1");
  });

  it("does not shift the day when the runtime timezone is behind UTC", () => {
    const original = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(longDate("2026-10-01")).toBe("Thursday, October 1");
    } finally {
      process.env.TZ = original;
    }
  });
});
