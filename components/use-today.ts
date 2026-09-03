"use client";

import { useEffect, useState } from "react";

import { dayLabelNumber, planPhase, todaysEntry, type PlanPhase } from "@/lib/plan";
import type { PlanEntry } from "@/lib/plan";

export type TodayState = {
  /** YYYY-MM-DD in the device's local timezone. */
  todayLocal: string;
  timezone: string;
  phase: PlanPhase;
  dayLabel: number;
  entry: PlanEntry | null;
};

function computeToday(): TodayState {
  const now = new Date();
  const todayLocal = new Intl.DateTimeFormat("en-CA").format(now);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return {
    todayLocal,
    timezone,
    phase: planPhase(todayLocal),
    dayLabel: dayLabelNumber(todayLocal),
    entry: todaysEntry(todayLocal),
  };
}

/**
 * The device's local date and reading-plan phase, computed client-side so
 * the pre-launch / active / closed state and "Day n of 28" label always
 * reflect the reader's own clock, not the server's. Recomputed on mount and
 * whenever the tab regains focus (covers a session left open across
 * midnight).
 */
export function useToday(): TodayState {
  const [state, setState] = useState<TodayState>(() => computeToday());

  useEffect(() => {
    function refresh() {
      setState(computeToday());
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return state;
}
