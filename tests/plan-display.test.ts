import { describe, expect, it } from "vitest";

import { checkInOpensLabel, displayPhase, dayState, longDate, planEntryForDate } from "@/lib/plan";

describe("displayPhase", () => {
  it("is pre-launch before October 5", () => {
    expect(displayPhase("2026-09-30")).toBe("pre-launch");
    expect(displayPhase("2026-10-04")).toBe("pre-launch");
  });

  it("is active on scheduled assignment days", () => {
    expect(displayPhase("2026-10-05")).toBe("active");
    expect(displayPhase("2026-10-12")).toBe("active");
    expect(displayPhase("2026-10-30")).toBe("active");
  });

  it("is review on weekend review days", () => {
    expect(displayPhase("2026-10-10")).toBe("review");
    expect(displayPhase("2026-10-11")).toBe("review");
    expect(displayPhase("2026-10-17")).toBe("review");
    expect(displayPhase("2026-10-18")).toBe("review");
    expect(displayPhase("2026-10-24")).toBe("review");
    expect(displayPhase("2026-10-25")).toBe("review");
  });

  it("is review after October 30 forever (perpetual Review & Catch Up, no closed state)", () => {
    expect(displayPhase("2026-10-31")).toBe("review");
    expect(displayPhase("2026-11-01")).toBe("review");
    expect(displayPhase("2026-12-01")).toBe("review");
  });
});

describe("dayState", () => {
  const entry = planEntryForDate("2026-10-12")!;

  it("is read when isRead is true, regardless of date", () => {
    expect(dayState(entry, "2026-10-12", true)).toBe("read");
    expect(dayState(entry, "2026-10-20", true)).toBe("read");
  });

  it("is today when the entry's date matches todayLocal and unread", () => {
    expect(dayState(entry, "2026-10-12", false)).toBe("today");
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
