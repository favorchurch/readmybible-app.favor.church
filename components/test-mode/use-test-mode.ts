"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  initialTestModeState,
  isTestModeRequested,
  type TestModeCampus,
  type TestModeState,
} from "./logic";

export type TestMode = {
  active: boolean;
  state: TestModeState;
  setState: (next: TestModeState) => void;
};

/**
 * Reads `?test=1` / `?day=N` client-side only -- app/page.tsx (the server
 * component) never sees these params, so there is no server-trusted query
 * parameter for #47's simulated day/completion/role/phase to leak through.
 *
 * `sessionCampus` seeds the campus control from the viewer's real campus, so
 * the panel opens scoped to where the tester actually is. It only seeds the
 * initial state -- once the panel is open the campus pills own the value.
 */
export function useTestMode(authorized: boolean, sessionCampus: TestModeCampus = 1): TestMode {
  const searchParams = useSearchParams();
  const active = useMemo(
    () => authorized && isTestModeRequested(searchParams),
    [authorized, searchParams],
  );
  const [state, setState] = useState<TestModeState>(() =>
    initialTestModeState(searchParams, sessionCampus),
  );
  return { active, state, setState };
}
