/**
 * Pure game-rule functions for Read My Bible. See intent/GAME.md.
 *
 * Nothing here touches Rock, Postgres, or Redis -- these are plain functions
 * over plain data so they can be unit tested directly.
 */

export const COINS_PER_CHAPTER = 10;
export const TOTAL_CHAPTERS = 28;
export const MEDAL_THRESHOLDS = [3, 7, 14, 21, 28] as const;

export type Stage = "Tent" | "Trailer" | "Cabin" | "Apartment" | "House" | "Mansion";

const STAGE_THRESHOLDS: Array<{ stage: Stage; ratio: number }> = [
  { stage: "Mansion", ratio: 0.85 },
  { stage: "House", ratio: 0.65 },
  { stage: "Apartment", ratio: 0.45 },
  { stage: "Cabin", ratio: 0.25 },
  { stage: "Trailer", ratio: 0.1 },
  { stage: "Tent", ratio: 0 },
];

/** Coins earned for a count of chapters read. Coins never decrease -- callers pass a monotonic chapter count. */
export function coinsFor(chapters: number): number {
  return Math.max(0, chapters) * COINS_PER_CHAPTER;
}

/** Which medal thresholds (subset of MEDAL_THRESHOLDS) have been reached. */
export function medals(chapters: number): number[] {
  return MEDAL_THRESHOLDS.filter((threshold) => chapters >= threshold);
}

/** The next medal threshold not yet reached, or null if all are earned. */
export function nextMedal(chapters: number): number | null {
  return MEDAL_THRESHOLDS.find((threshold) => chapters < threshold) ?? null;
}

/**
 * Consecutive-day streak ending today or yesterday, in the reader's
 * timezone. `dates` are YYYY-MM-DD strings (already localized by the
 * caller); `todayLocal` is the reader's current local YYYY-MM-DD date.
 *
 * A streak breaks unless the most recent reading date is today or
 * yesterday -- a gap of two or more days resets it to 0.
 */
export function streak(dates: string[], todayLocal: string): number {
  const unique = Array.from(new Set(dates)).sort();
  if (unique.length === 0) return 0;

  const dateSet = new Set(unique);
  const mostRecent = unique[unique.length - 1];

  const today = parseLocalDate(todayLocal);
  const yesterday = addDays(today, -1);
  const mostRecentDate = parseLocalDate(mostRecent);

  const isCurrent =
    sameDay(mostRecentDate, today) || sameDay(mostRecentDate, yesterday);
  if (!isCurrent) return 0;

  let count = 1;
  let cursor = mostRecentDate;
  for (;;) {
    const prev = addDays(cursor, -1);
    const prevKey = toKey(prev);
    if (dateSet.has(prevKey)) {
      count += 1;
      cursor = prev;
    } else {
      break;
    }
  }
  return count;
}

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}
function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Group ratio: checkins / (members * total chapters), clamped to [0, 1].
 * `members` at 0 returns 0 rather than dividing by zero.
 */
export function groupRatio(checkins: number, members: number): number {
  if (members <= 0) return 0;
  const ratio = checkins / (members * TOTAL_CHAPTERS);
  return Math.min(1, Math.max(0, ratio));
}

/** Home stage for a given ratio (highest threshold met, at or below 1). */
export function stageFor(ratio: number): Stage {
  const clamped = Math.min(1, Math.max(0, ratio));
  for (const { stage, ratio: threshold } of STAGE_THRESHOLDS) {
    if (clamped >= threshold) return stage;
  }
  return "Tent";
}

/** Ratio still needed to reach the next stage above the given ratio, or null if already at Mansion. */
export function nextStageProgress(ratio: number): { stage: Stage; pct: number } | null {
  const clamped = Math.min(1, Math.max(0, ratio));
  const ascending = [...STAGE_THRESHOLDS].reverse();
  const currentIndex = ascending.findIndex((s) => s.stage === stageFor(clamped));
  const next = ascending[currentIndex + 1];
  if (!next) return null;
  const prev = ascending[currentIndex];
  const span = next.ratio - prev.ratio;
  const progressed = clamped - prev.ratio;
  const pct = span > 0 ? Math.round((progressed / span) * 100) : 100;
  return { stage: next.stage, pct: Math.min(100, Math.max(0, pct)) };
}

export type GroupStanding = {
  groupId: number;
  name: string;
  ratio: number;
  readersToday: number;
};

/**
 * Ranks groups by ratio (desc), tie-break by readers today (desc), then by
 * name (asc). Individuals are never ranked -- only groups.
 */
export function rankGroups(groups: GroupStanding[]): GroupStanding[] {
  return [...groups].sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (b.readersToday !== a.readersToday) return b.readersToday - a.readersToday;
    return a.name.localeCompare(b.name);
  });
}
