import { describe, expect, it } from "vitest";

import { dayLabelNumber, dayOfOctober, planPhase, todaysEntry } from "@/lib/plan";

describe("planPhase", () => {
  it("is pre-launch before October 5, 2026", () => {
    expect(planPhase("2026-09-30")).toBe("pre-launch");
    expect(planPhase("2026-10-04")).toBe("pre-launch");
  });

  it("is active October 5 through October 30, 2026", () => {
    expect(planPhase("2026-10-05")).toBe("active");
    expect(planPhase("2026-10-15")).toBe("active");
    expect(planPhase("2026-10-30")).toBe("active");
  });

  it("is review after October 30, 2026 (perpetual Review & Catch Up, no closed state)", () => {
    expect(planPhase("2026-10-31")).toBe("review");
    expect(planPhase("2026-11-01")).toBe("review");
    expect(planPhase("2026-12-25")).toBe("review");
  });
});

describe("dayOfOctober", () => {
  it("reads the day number out of a YYYY-MM-DD date", () => {
    expect(dayOfOctober("2026-10-08")).toBe(8);
    expect(dayOfOctober("2026-10-31")).toBe(31);
  });
});

describe("dayLabelNumber", () => {
  it("matches the assignment day within the 20-assignment plan", () => {
    expect(dayLabelNumber("2026-10-05")).toBe(1);
    expect(dayLabelNumber("2026-10-07")).toBe(3);
  });

  it("clamps to 20 after October 30", () => {
    expect(dayLabelNumber("2026-10-31")).toBe(20);
    expect(dayLabelNumber("2026-11-15")).toBe(20);
  });
});

describe("todaysEntry", () => {
  it("returns null before the plan starts", () => {
    expect(todaysEntry("2026-09-15")).toBeNull();
    expect(todaysEntry("2026-10-04")).toBeNull();
  });

  it("returns the matching assignment's entry during the plan", () => {
    expect(todaysEntry("2026-10-05")?.chapter).toBe(1);
    expect(todaysEntry("2026-10-05")?.day).toBe(1);
  });

  it("returns null on weekend review days (no new assignment)", () => {
    expect(todaysEntry("2026-10-10")).toBeNull();
    expect(todaysEntry("2026-10-11")).toBeNull();
  });

  it("returns null after October 30 (handled via Review & Catch Up)", () => {
    expect(todaysEntry("2026-10-31")).toBeNull();
    expect(todaysEntry("2026-11-02")).toBeNull();
  });
});
