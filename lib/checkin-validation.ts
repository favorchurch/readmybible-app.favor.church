/**
 * Pure validation for the check-in server action. Split out of
 * app/actions/checkIn.ts so it can be unit tested without a live DB/session.
 * See intent/GAME.md check-in rules.
 */
import { planEntryForDate } from "@/lib/plan";

export const PLAN_START = "2026-10-01";
export const PLAN_END = "2026-10-31";
export const CLOCK_SKEW_DAYS = 1;

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The reader's local YYYY-MM-DD "today" per their submitted IANA timezone,
 * derived server-side from the current instant rather than trusted from the
 * client -- otherwise a caller could pick any readingDate and satisfy its
 * own future-date check trivially by choosing a timezone/date pair that
 * makes the client-only math pass.
 */
export function localTodayFor(timezone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  } catch {
    // Invalid/unrecognized IANA zone -- fall back to UTC "today".
    return now.toISOString().slice(0, 10);
  }
}

export type CheckInValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validates readingDate against the plan window and the reader's true local
 * "today" (never a future day beyond one day of clock-skew tolerance), and
 * that chapter matches the plan's chapter for that date when the date has
 * an assigned chapter (catch-up days like Oct 29-31 have none, so any
 * already-assigned chapter is allowed there).
 */
export function validateCheckIn(
  input: { chapter: number; readingDate: string; timezone: string },
  now: Date = new Date(),
): CheckInValidationResult {
  const localToday = localTodayFor(input.timezone, now);
  const toleratedMax = addDays(localToday, CLOCK_SKEW_DAYS);
  if (input.readingDate < PLAN_START || input.readingDate > PLAN_END || input.readingDate > toleratedMax) {
    return { ok: false, error: "That date is outside the reading plan window." };
  }

  const entryForDate = planEntryForDate(input.readingDate);
  if (entryForDate && entryForDate.chapter !== input.chapter) {
    return { ok: false, error: "That chapter doesn't match that date." };
  }

  return { ok: true };
}
