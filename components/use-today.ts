"use client";

import { useEffect, useState } from "react";

import { dayLabelNumber, displayPhase as computeDisplayPhase, planPhase, todaysEntry, type DisplayPhase, type PlanPhase } from "@/lib/plan";
import type { PlanEntry } from "@/lib/plan";

export type TodayState = {
  /** YYYY-MM-DD in the device's local timezone, or the dev-clock override. */
  todayLocal: string;
  timezone: string;
  phase: PlanPhase;
  displayPhase: DisplayPhase;
  dayLabel: number;
  entry: PlanEntry | null;
};

function computeToday(override?: string | null): TodayState {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const todayLocal = override ?? new Intl.DateTimeFormat("en-CA").format(new Date());
  return {
    todayLocal,
    timezone,
    phase: planPhase(todayLocal),
    displayPhase: computeDisplayPhase(todayLocal),
    dayLabel: dayLabelNumber(todayLocal),
    entry: todaysEntry(todayLocal),
  };
}

/**
 * The device's local date and reading-plan phase, computed client-side so
 * the pre-launch / active / closed state and "Day n of 28" label always
 * reflect the reader's own clock, not the server's -- unless `override` (the
 * dev-only clock override value, passed down as a prop from the server) is
 * set, in which case it is the single source for every derived field.
 * Recomputed on mount and whenever the tab regains focus (covers a session
 * left open across midnight); the override never changes at runtime, so it
 * doesn't need to be an effect dependency.
 */
export function useToday(override?: string | null): TodayState {
  const [state, setState] = useState<TodayState>(() => computeToday(override));

  useEffect(() => {
    if (override) return;
    function refresh() {
      setState(computeToday(override));
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [override]);

  return state;
}
