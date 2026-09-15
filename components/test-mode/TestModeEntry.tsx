"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { TEST_MODE_PARAM } from "./logic";

/**
 * Visible in-app entry point into test mode for admin-scope viewers
 * (regional/cluster/section heads), who have no Connect Group of their own
 * and so cannot hand-edit `?test=1` into the URL the way a leader could.
 * Works in production -- it just navigates to the same `?test=1` URL that
 * `isTestModeRequested`/`useTestMode` already read, so no new activation
 * path or dev-only gate is introduced. Renders nothing when `visible` is
 * false so ordinary members never see a test-mode affordance.
 */
export function TestModeEntry({ visible }: { visible: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!visible) return null;
  if (searchParams.get(TEST_MODE_PARAM) === "1") return null;

  function activate() {
    const next = new URLSearchParams(searchParams.toString());
    next.set(TEST_MODE_PARAM, "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <button type="button" className="test-mode-entry" onClick={activate} data-testid="test-mode-entry">
      Enter test mode
    </button>
  );
}
