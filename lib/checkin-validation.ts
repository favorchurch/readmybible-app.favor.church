/**
 * Pure validation for the check-in server action. Split out of
 * app/actions/checkIn.ts so it can be unit tested without a live DB/session.
 * See intent/GAME.md check-in rules.
 */
import { planEntryForChapter } from "@/lib/plan";

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

export type CheckInValidationResult =
  | { ok: true; readingDate: string }
  | { ok: false; error: string };

/**
 * A check-in is for a chapter, not a date the client picks: its reading_date
 * is that chapter's plan date (2026-10-{chapter}), derived server-side so a
 * caller can't submit an arbitrary date/chapter pair. Accepted whenever that
 * plan date is at or before the reader's true local "today" (from their
 * submitted IANA timezone), with one day of tolerance for clock skew --
 * catch-up on any past chapter is allowed, only a future chapter is
 * rejected.
 */
export function validateCheckIn(
  input: { chapter: number; timezone: string },
  now: Date = new Date(),
): CheckInValidationResult {
  const entry = planEntryForChapter(input.chapter);
  if (!entry) {
    return { ok: false, error: "That date is outside the reading plan window." };
  }

  const localToday = localTodayFor(input.timezone, now);
  const toleratedMax = addDays(localToday, CLOCK_SKEW_DAYS);
  if (entry.date > toleratedMax) {
    return { ok: false, error: "That date is outside the reading plan window." };
  }

  return { ok: true, readingDate: entry.date };
}
