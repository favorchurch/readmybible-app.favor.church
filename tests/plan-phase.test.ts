import { describe, expect, it } from "vitest";

import { dayLabelNumber, dayOfOctober, planPhase, todaysEntry } from "@/lib/plan";

describe("planPhase", () => {
  it("is pre-launch before October 1, 2026", () => {
    expect(planPhase("2026-09-30")).toBe("pre-launch");
  });

  it("is active during October 2026", () => {
    expect(planPhase("2026-10-01")).toBe("active");
    expect(planPhase("2026-10-15")).toBe("active");
    expect(planPhase("2026-10-31")).toBe("active");
  });

  it("is closed after October 31, 2026", () => {
    expect(planPhase("2026-11-01")).toBe("closed");
  });
});

describe("dayOfOctober", () => {
  it("reads the day number out of a YYYY-MM-DD date", () => {
    expect(dayOfOctober("2026-10-08")).toBe(8);
    expect(dayOfOctober("2026-10-31")).toBe(31);
  });
});

describe("dayLabelNumber", () => {
  it("matches the day of October within the 28-chapter plan", () => {
    expect(dayLabelNumber("2026-10-08")).toBe(8);
  });

  it("clamps to 28 during the Oct 29-31 grace days", () => {
    expect(dayLabelNumber("2026-10-29")).toBe(28);
    expect(dayLabelNumber("2026-10-31")).toBe(28);
  });
});

describe("todaysEntry", () => {
  it("returns null before the plan starts", () => {
    expect(todaysEntry("2026-09-15")).toBeNull();
  });

  it("returns the matching chapter's entry during the plan", () => {
    expect(todaysEntry("2026-10-08")?.chapter).toBe(8);
  });

  it("returns null on the Oct 29-31 grace days (no new chapter)", () => {
    expect(todaysEntry("2026-10-29")).toBeNull();
    expect(todaysEntry("2026-10-31")).toBeNull();
  });

  it("returns null after the plan closes", () => {
    expect(todaysEntry("2026-11-02")).toBeNull();
  });
});
