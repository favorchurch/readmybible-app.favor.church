"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { initialTestModeState, isTestModeRequested, type TestModeState } from "./logic";

export type TestMode = {
  active: boolean;
  state: TestModeState;
  setState: (next: TestModeState) => void;
};

/**
 * Reads `?test=1` / `?day=N` client-side only -- app/page.tsx (the server
 * component) never sees these params, so there is no server-trusted query
 * parameter for #47's simulated day/completion/role/phase to leak through.
 */
export function useTestMode(): TestMode {
  const searchParams = useSearchParams();
  const active = useMemo(() => isTestModeRequested(searchParams), [searchParams]);
  const [state, setState] = useState<TestModeState>(() => initialTestModeState(searchParams));
  return { active, state, setState };
}
