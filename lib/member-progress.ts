export type MemberReadingHistory = {
  chapters: number[];
  dates: string[];
};

export type StreakMark = {
  date: string;
  day: number;
  read: boolean;
};

/**
 * Pure function to derive compact, privacy-safe reading history per member.
 * Only extracts chapter numbers and reading dates; never includes private metadata or verse text.
 */
export function deriveMemberReadingHistory(
  rows: Array<{ rockPersonId: number; chapter: number; readingDate: string }>,
  personIds: number[],
): Map<number, MemberReadingHistory> {
  const map = new Map<number, MemberReadingHistory>();
  for (const id of personIds) {
    map.set(id, { chapters: [], dates: [] });
  }

  for (const row of rows) {
    const entry = map.get(row.rockPersonId);
    if (entry) {
      if (!entry.chapters.includes(row.chapter)) {
        entry.chapters.push(row.chapter);
      }
      if (!entry.dates.includes(row.readingDate)) {
        entry.dates.push(row.readingDate);
      }
    }
  }

  for (const entry of map.values()) {
    entry.chapters.sort((a, b) => a - b);
    entry.dates.sort();
  }

  return map;
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

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Returns 5 recent streak marks ending at todayLocal (or Oct 1..5 if before launch).
 */
export function recentFiveDayStreak(dates: string[], todayLocal: string): StreakMark[] {
  const dateSet = new Set(dates);

  // If pre-launch (before 2026-10-01), display Oct 1 to Oct 5
  if (todayLocal < "2026-10-01") {
    return [1, 2, 3, 4, 5].map((d) => {
      const date = `2026-10-${String(d).padStart(2, "0")}`;
      return {
        date,
        day: d,
        read: dateSet.has(date),
      };
    });
  }

  const today = parseLocalDate(todayLocal);
  const marks: StreakMark[] = [];

  for (let i = 4; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = toKey(d);
    const day = Number(key.slice(8, 10));
    marks.push({
      date: key,
      day,
      read: dateSet.has(key),
    });
  }

  return marks;
}
