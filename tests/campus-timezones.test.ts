import { describe, expect, it } from "vitest";

import { CAMPUS_TIMEZONES, DEFAULT_CAMPUS_TIMEZONE, timezoneForCampus } from "@/lib/campus-timezones";

describe("timezoneForCampus", () => {
  it("maps each known campus id to its IANA timezone", () => {
    expect(timezoneForCampus(1)).toBe("Asia/Manila");
    expect(timezoneForCampus(2)).toBe("Australia/Brisbane");
    expect(timezoneForCampus(3)).toBe("Asia/Seoul");
  });

  it("falls back to Asia/Manila for an unknown or null campus", () => {
    expect(timezoneForCampus(999)).toBe(DEFAULT_CAMPUS_TIMEZONE);
    expect(timezoneForCampus(null)).toBe(DEFAULT_CAMPUS_TIMEZONE);
  });

  it("has exactly the three known campuses", () => {
    expect(Object.keys(CAMPUS_TIMEZONES)).toHaveLength(3);
  });
});
