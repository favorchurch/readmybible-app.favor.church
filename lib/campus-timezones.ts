import type { Translation } from "@/lib/scripture/types";

/**
 * Rock CampusId -> IANA timezone, used to localize "today" for cross-member
 * aggregates (group readers-today, campus leaderboard) per the campus the
 * group/reader belongs to, rather than a single fixed reference zone.
 */
export const CAMPUS_TIMEZONES: Record<number, string> = {
  1: "Asia/Manila",
  2: "Australia/Brisbane",
  3: "Asia/Seoul",
};

export const DEFAULT_CAMPUS_TIMEZONE = "Asia/Manila";

export function timezoneForCampus(campusId: number | null): string {
  if (campusId === null) return DEFAULT_CAMPUS_TIMEZONE;
  return CAMPUS_TIMEZONES[campusId] ?? DEFAULT_CAMPUS_TIMEZONE;
}

/** Seoul (Asia/Seoul campuses) defaults to KRV; every other campus defaults to NET. Overridable in the profile editor or the quick-verse popup (#44). */
export function defaultTranslationForCampus(campusId: number | null): Translation {
  return timezoneForCampus(campusId) === "Asia/Seoul" ? "KRV" : "NET";
}
