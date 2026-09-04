import { describe, expect, it } from "vitest";

import { CAMPUS_TIMEZONES, DEFAULT_CAMPUS_TIMEZONE, defaultTranslationForCampus, timezoneForCampus } from "@/lib/campus-timezones";

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

describe("defaultTranslationForCampus", () => {
  it("defaults Seoul (campus 3) to KRV", () => {
    expect(defaultTranslationForCampus(3)).toBe("KRV");
  });

  it("defaults every other known campus to NET", () => {
    expect(defaultTranslationForCampus(1)).toBe("NET");
    expect(defaultTranslationForCampus(2)).toBe("NET");
  });

  it("defaults an unknown or null campus to NET", () => {
    expect(defaultTranslationForCampus(999)).toBe("NET");
    expect(defaultTranslationForCampus(null)).toBe("NET");
  });
});
