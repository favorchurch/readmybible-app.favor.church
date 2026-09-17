/**
 * The 20-assignment Matthew reading plan (October 5–30, 2026) with review days
 * and perpetual Review & Catch Up.
 *
 * Each scheduled date is one equal-weight assignment (20 assignments total),
 * covering all 28 chapters of Matthew.
 */

export type PlanEntry = {
  day: number;
  chapter: number;
  chapters?: number[];
  date: string; // YYYY-MM-DD, October 2026
  keyPassage: string;
  title: string;
};

export const TOTAL_ASSIGNMENTS = 20;
export const TOTAL_CHAPTERS = 28;

export const PLAN_START = "2026-10-05";
export const PLAN_END = "2026-10-30";

/**
 * Weekend review dates during the campaign:
 * Oct 10–11, 17–18, 24–25.
 * Dates after Oct 30 remain Review & Catch Up forever.
 */
export const REVIEW_DATES: readonly string[] = [
  "2026-10-10",
  "2026-10-11",
  "2026-10-17",
  "2026-10-18",
  "2026-10-24",
  "2026-10-25",
];

/** Preserved for backwards compatibility with any remaining imports. */
export const GRACE_DATES: readonly string[] = ["2026-10-31"];
export const GRACE_DAY_START = 31;

export const PLAN: PlanEntry[] = [
  { day: 1, chapter: 1, chapters: [1, 2], date: "2026-10-05", keyPassage: "Matthew 1:20-21", title: "Jesus is born · The wise men arrive" },
  { day: 2, chapter: 3, chapters: [3, 4], date: "2026-10-06", keyPassage: "Matthew 3:16-17", title: "Jesus is baptized · The first disciples" },
  { day: 3, chapter: 5, chapters: [5], date: "2026-10-07", keyPassage: "Matthew 5:3-12", title: "The Beatitudes" },
  { day: 4, chapter: 6, chapters: [6], date: "2026-10-08", keyPassage: "Matthew 6:9-13", title: "The Lord's Prayer" },
  { day: 5, chapter: 7, chapters: [7], date: "2026-10-09", keyPassage: "Matthew 7:24-27", title: "Build on the rock" },
  // Oct 10–11: Review
  { day: 6, chapter: 8, chapters: [8, 9], date: "2026-10-12", keyPassage: "Matthew 8:26-27", title: "Jesus calms the storm · Jesus heals and forgives" },
  { day: 7, chapter: 10, chapters: [10], date: "2026-10-13", keyPassage: "Matthew 10:7-8", title: "Jesus sends out the Twelve" },
  { day: 8, chapter: 11, chapters: [11, 12], date: "2026-10-14", keyPassage: "Matthew 11:28-30", title: "Come to me and rest · Lord of the Sabbath" },
  { day: 9, chapter: 13, chapters: [13], date: "2026-10-15", keyPassage: "Matthew 13:44-46", title: "Parables of the Kingdom" },
  { day: 10, chapter: 14, chapters: [14, 15], date: "2026-10-16", keyPassage: "Matthew 14:28-31", title: "Jesus feeds five thousand · Jesus walks on water" },
  // Oct 17–18: Review
  { day: 11, chapter: 16, chapters: [16, 17], date: "2026-10-19", keyPassage: "Matthew 16:15-16", title: "Peter's confession · The transfiguration" },
  { day: 12, chapter: 18, chapters: [18], date: "2026-10-20", keyPassage: "Matthew 18:21-22", title: "Forgive seventy-seven times" },
  { day: 13, chapter: 19, chapters: [19, 20], date: "2026-10-21", keyPassage: "Matthew 20:26-28", title: "The rich young ruler · The workers in the vineyard" },
  { day: 14, chapter: 21, chapters: [21], date: "2026-10-22", keyPassage: "Matthew 21:8-9", title: "The triumphal entry" },
  { day: 15, chapter: 22, chapters: [22, 23], date: "2026-10-23", keyPassage: "Matthew 22:37-39", title: "The greatest commandment · Seven woes" },
  // Oct 24–25: Review
  { day: 16, chapter: 24, chapters: [24], date: "2026-10-26", keyPassage: "Matthew 24:35-36", title: "Signs of the end of the age" },
  { day: 17, chapter: 25, chapters: [25], date: "2026-10-27", keyPassage: "Matthew 25:35-36", title: "Parable of the ten virgins · The sheep and the goats" },
  { day: 18, chapter: 26, chapters: [26], date: "2026-10-28", keyPassage: "Matthew 26:26-28", title: "The Last Supper · Gethsemane" },
  { day: 19, chapter: 27, chapters: [27], date: "2026-10-29", keyPassage: "Matthew 27:45-50", title: "The crucifixion" },
  { day: 20, chapter: 28, chapters: [28], date: "2026-10-30", keyPassage: "Matthew 28:18-20", title: "The Great Commission" },
];

export function planEntryForChapter(chapter: number): PlanEntry | undefined {
  return PLAN.find((entry) => (entry.chapters && entry.chapters.length > 0 ? entry.chapters : [entry.chapter]).includes(chapter));
}

export function planEntryForDate(date: string): PlanEntry | undefined {
  return PLAN.find((entry) => entry.date === date);
}

/**
 * Returns true if the given date is a weekend review day (Oct 10-11, 17-18, 24-25)
 * or any date after the campaign ends (Oct 30).
 */
export function isReviewDate(date: string): boolean {
  return REVIEW_DATES.includes(date) || date > PLAN_END;
}

/**
 * Resolves the chapters for a plan entry (defaults to [entry.chapter] if not explicitly set).
 */
export function entryChapters(entry: PlanEntry): number[] {
  return entry.chapters && entry.chapters.length > 0 ? entry.chapters : [entry.chapter];
}

/**
 * Reference string for an assignment, e.g. "Matthew 5" or "Matthew 1–2".
 */
export function assignmentReference(entry: PlanEntry): string {
  const chs = entryChapters(entry);
  if (chs.length <= 1) {
    return `Matthew ${chs[0] ?? entry.chapter}`;
  }
  return `Matthew ${chs[0]}–${chs[chs.length - 1]}`;
}

/**
 * Whether all chapters of an assignment have been read.
 */
export function isAssignmentCompleted(entry: PlanEntry, chapters: readonly number[]): boolean {
  const chs = entryChapters(entry);
  return chs.every((ch) => chapters.includes(ch));
}

/**
 * How many total assignments have been completed.
 * A two-chapter assignment counts as exactly one assignment, not two.
 */
export function completedAssignmentsCount(chapters: readonly number[]): number {
  return PLAN.filter((entry) => isAssignmentCompleted(entry, chapters)).length;
}

/**
 * Returns all completed assignments.
 */
export function completedAssignments(chapters: readonly number[]): PlanEntry[] {
  return PLAN.filter((entry) => isAssignmentCompleted(entry, chapters));
}

/**
 * Returns all unfinished assignments scheduled up to todayLocal.
 */
export function unfinishedAssignmentsUpTo(todayLocal: string, chapters: readonly number[]): PlanEntry[] {
  return PLAN.filter((entry) => entry.date <= todayLocal && !isAssignmentCompleted(entry, chapters));
}

/**
 * Last verse number for each Matthew chapter, 1-28 in order.
 */
export const MATTHEW_VERSE_COUNTS: readonly number[] = [
  25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20,
];

/**
 * "Matthew {chapter}:1-{last verse}", e.g. "Matthew 20:1-34".
 */
export function chapterReference(chapter: number): string {
  const safeChapter = Math.min(Math.max(Math.trunc(chapter), 1), MATTHEW_VERSE_COUNTS.length);
  const last = MATTHEW_VERSE_COUNTS[safeChapter - 1];
  return `Matthew ${safeChapter}:1-${last}`;
}

export function clampReadingChapter(chapter: number, todayChapter: number): number {
  return Math.min(Math.max(chapter, 1), todayChapter + 1);
}

export function isChapterRead(chapter: number, chapters: readonly number[]): boolean {
  return chapters.includes(chapter);
}

export function syncViewedChapter(
  entryChapter: number | null,
  syncedChapter: number,
  viewedChapter: number,
): { syncedChapter: number; viewedChapter: number } {
  if (entryChapter !== null && entryChapter !== syncedChapter) {
    return { syncedChapter: entryChapter, viewedChapter: entryChapter };
  }
  return { syncedChapter, viewedChapter };
}

export type PlanPhase = "pre-launch" | "active" | "review" | "closed";

/**
 * Which phase the plan is in for a given local YYYY-MM-DD date.
 * Pre-launch before Oct 5; active Oct 5–30; review forever after Oct 30.
 * No closed/frozen state.
 */
export function planPhase(todayLocal: string): PlanPhase {
  if (todayLocal < PLAN_START) return "pre-launch";
  if (todayLocal > PLAN_END) return "review";
  return "active";
}

/** Day-of-October number (1-31) for a local YYYY-MM-DD date inside October 2026. */
export function dayOfOctober(todayLocal: string): number {
  return Number(todayLocal.slice(8, 10));
}

/**
 * Today's plan entry, if any -- null before Oct 5, on weekend review days,
 * and after Oct 30 (which surfaces through Review & Catch Up forever).
 */
export function todaysEntry(todayLocal: string): PlanEntry | null {
  if (planPhase(todayLocal) === "pre-launch") return null;
  return planEntryForDate(todayLocal) ?? null;
}

/**
 * The current assignment number (1-20), clamped to the 20-assignment total.
 */
export function dayLabelNumber(todayLocal: string): number {
  if (todayLocal < PLAN_START) return 0;
  const entry = todaysEntry(todayLocal);
  if (entry) return entry.day;
  const past = PLAN.filter((e) => e.date <= todayLocal);
  return Math.min(Math.max(past.length, 1), TOTAL_ASSIGNMENTS);
}

export type DisplayPhase = "pre-launch" | "active" | "review" | "grace" | "closed";

/**
 * The phase shown in the UI.
 * Pre-launch before Oct 5; review on weekends (Oct 10-11, 17-18, 24-25) and after Oct 30 forever;
 * active on assignment days.
 */
export function displayPhase(todayLocal: string): DisplayPhase {
  if (todayLocal < PLAN_START) return "pre-launch";
  if (isReviewDate(todayLocal)) return "review";
  return "active";
}

export type DayState = "read" | "today" | "catch-up" | "upcoming";

/**
 * The calendar-cell state for a plan entry.
 */
export function dayState(entry: PlanEntry, todayLocal: string, isRead: boolean): DayState {
  if (isRead) return "read";
  if (planPhase(todayLocal) === "pre-launch") return "upcoming";
  if (entry.date === todayLocal) return "today";
  if (entry.date < todayLocal) return "catch-up";
  return "upcoming";
}

/** Copy for an upcoming day's check-in date, e.g. "Check-in opens October 20." */
export function checkInOpensLabel(entry: PlanEntry): string {
  const [, , day] = entry.date.split("-").map(Number);
  return `Check-in opens October ${day}.`;
}

/**
 * A long-form date like "Thursday, October 1" for a YYYY-MM-DD string.
 */
export function longDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export type WeekReview = {
  week: number;
  title: string;
  chaptersSummary: string;
  revelationPrompt: string;
  keyPassages: Array<{ ref: string; text: string }>;
};

export const WEEK_REVIEWS: Record<number, WeekReview> = {
  1: {
    week: 1,
    title: "Week 1 Review",
    chaptersSummary: "Matthew 1–7",
    revelationPrompt: "Reflect on Jesus' arrival, baptism, and the kingdom teachings in the Sermon on the Mount.",
    keyPassages: [
      { ref: "Matthew 5:3-12", text: "The Beatitudes" },
      { ref: "Matthew 6:9-13", text: "The Lord's Prayer" },
      { ref: "Matthew 7:24-27", text: "The wise and foolish builders" },
    ],
  },
  2: {
    week: 2,
    title: "Week 2 Review",
    chaptersSummary: "Matthew 8–15",
    revelationPrompt: "Reflect on Jesus' authority, parables of the kingdom, and walking on water.",
    keyPassages: [
      { ref: "Matthew 9:35-38", text: "The harvest is plentiful" },
      { ref: "Matthew 11:28-30", text: "Come to me and rest" },
      { ref: "Matthew 14:29-31", text: "Peter walks on water" },
    ],
  },
  3: {
    week: 3,
    title: "Week 3 Review",
    chaptersSummary: "Matthew 16–23",
    revelationPrompt: "Reflect on Peter's confession, the transfiguration, and the greatest commandment.",
    keyPassages: [
      { ref: "Matthew 16:15-16", text: "Who do you say I am?" },
      { ref: "Matthew 20:26-28", text: "The greatest is a servant" },
      { ref: "Matthew 22:37-39", text: "The greatest commandment" },
    ],
  },
  4: {
    week: 4,
    title: "Review & Catch Up",
    chaptersSummary: "Matthew 24–28",
    revelationPrompt: "Reflect on the completion of Matthew, the cross, and the resurrection of our Lord.",
    keyPassages: [
      { ref: "Matthew 25:35-36", text: "Whatever you did for the least of these" },
      { ref: "Matthew 26:26-28", text: "The Last Supper" },
      { ref: "Matthew 28:5-6", text: "He has risen" },
    ],
  },
};

export function reviewForDate(todayLocal: string): WeekReview {
  if (todayLocal <= "2026-10-11") return WEEK_REVIEWS[1];
  if (todayLocal <= "2026-10-18") return WEEK_REVIEWS[2];
  if (todayLocal <= "2026-10-25") return WEEK_REVIEWS[3];
  return WEEK_REVIEWS[4];
}
