import { GRACE_DATES, PLAN, dayLabelNumber, displayPhase, planPhase, todaysEntry } from "@/lib/plan";
import type { TodayState } from "@/components/use-today";

/** `?test=1` opens the panel directly; `?day=N` is an alias that also seeds the day. */
export const TEST_MODE_PARAM = "test";
export const DAY_PARAM = "day";

export const TEST_MODE_BLOCKED_MESSAGE = "Test mode: writes are disabled.";

export type SimulatedPhase = "pre-launch" | "active" | "grace" | "closed";

export type TestModeState = {
  day: number;
  phase: SimulatedPhase;
  completionPct: number;
  groupPct: number;
  role: "leader" | "member";
};

/** True when the URL asks for test mode -- `?test=1` or the `?day=N` alias. */
export function isTestModeRequested(searchParams: URLSearchParams): boolean {
  return searchParams.has(TEST_MODE_PARAM) || searchParams.has(DAY_PARAM);
}

function dayFromParams(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get(DAY_PARAM));
  if (Number.isInteger(raw) && raw >= 1 && raw <= PLAN.length) return raw;
  return 1;
}

/** The panel's starting values: `?day=N` seeds the day, everything else defaults to "nothing simulated yet." */
export function initialTestModeState(searchParams: URLSearchParams): TestModeState {
  return {
    day: dayFromParams(searchParams),
    phase: "active",
    completionPct: 0,
    groupPct: 0,
    role: "member",
  };
}

/**
 * The plan date a simulated day/phase maps to, reusing the real plan
 * calendar (`lib/plan.ts`) so a simulated "Day 5" is the exact date the real
 * app would use for day 5 -- the two can never drift apart.
 */
export function dateForSimulatedDay(day: number, phase: SimulatedPhase): string {
  if (phase === "pre-launch") return "2026-09-15";
  if (phase === "grace") return GRACE_DATES[0];
  if (phase === "closed") return "2026-11-02"; // day after PLAN_END (2026-10-31)
  const clamped = Math.min(Math.max(Math.trunc(day), 1), PLAN.length);
  return PLAN[clamped - 1].date;
}

/**
 * The `TodayState` a simulated date produces -- mirrors `useToday`'s own
 * `computeToday` shape exactly, but as a plain function (not a hook) so it
 * can be recomputed on every render as the panel's day/phase change, which
 * `useToday`'s override (captured once at mount) intentionally cannot do.
 */
export function simulatedTodayState(date: string, timezone: string): TodayState {
  return {
    todayLocal: date,
    timezone,
    phase: planPhase(date),
    displayPhase: displayPhase(date),
    dayLabel: dayLabelNumber(date),
    entry: todaysEntry(date),
  };
}

/** A synthetic "chapters read" set for a completion percentage, 0-100. */
export function simulatedChapters(completionPct: number): number[] {
  const clamped = Math.min(Math.max(completionPct, 0), 100);
  const count = Math.round((clamped / 100) * PLAN.length);
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** A synthetic group ratio (0-1, the unit `groupStats.ratio` and `stageFor` use) for a group percentage, 0-100. */
export function simulatedGroupRatio(groupPct: number): number {
  return Math.min(Math.max(groupPct, 0), 100) / 100;
}

/** Synthetic reading history for a roster member in test mode. */
export function simulatedMemberHistory(
  _memberId: number,
  completionPct: number,
  todayLocal: string,
): { chapters: number[]; readingDates: string[] } {
  const chapters = simulatedChapters(completionPct);
  const readingDates = chapters
    .filter((ch) => ch <= PLAN.length)
    .map((ch) => PLAN[ch - 1].date)
    .filter((d) => d <= todayLocal);
  return { chapters, readingDates };
}

type WriteResult = { ok: true } | { ok: false; error: string };

/**
 * Wraps a Supabase/Rock write action (checkIn, saveProfile, chooseGroup,
 * joinByCode all share this `{ok:true,...}|{ok:false,error}` result shape).
 * When test mode is active, the wrapped action is never called -- this is
 * the actual no-write guarantee for #47, verified directly in
 * tests/test-mode.test.ts rather than by inspecting call sites.
 */
export function guardWrite<Args extends unknown[], R extends WriteResult>(
  active: boolean,
  action: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
  if (!active) return action;
  return async () => ({ ok: false, error: TEST_MODE_BLOCKED_MESSAGE }) as R;
}
