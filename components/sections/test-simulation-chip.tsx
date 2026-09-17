"use client";

/**
 * Issue #162's "Testing as: <role>" chip, for the admin-scope test
 * simulation `SectionDashboard` already receives via `simulatedScope`
 * (home-data.tsx's `?scope=`/`?test=1` path). Test Mode and Visiting are
 * independent axes with independent exit actions -- this chip's exit
 * clears only the simulation params, leaving any `?home=` visit untouched.
 * Reuses the `.status-chip` styling `components/ladder/ladder.css` already
 * ships (loaded by `LadderTownView`, which every caller of this chip
 * renders alongside).
 */
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

const SIMULATED_SCOPE_LABELS = {
  global: "Global Admin",
  cluster: "Cluster Head",
  region: "Regional Leader",
  department: "Department Head",
} as const;

const SIMULATION_PARAM_KEYS = ["test", "scope", "role", "viewer", "campus", "admin", "tab"];

export function TestSimulationChip({
  simulatedScope,
}: {
  simulatedScope: "global" | "cluster" | "region" | "department";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const exitParams = new URLSearchParams(searchParams.toString());
  for (const key of SIMULATION_PARAM_KEYS) exitParams.delete(key);
  const exitHref = exitParams.toString() ? `${pathname}?${exitParams.toString()}` : pathname;

  return (
    <div className="status-chips-container">
      <span className="status-chip test-mode-chip" role="status">
        Testing as: {SIMULATED_SCOPE_LABELS[simulatedScope]}
        <Link href={exitHref} aria-label="Exit test mode, returning to your real context">
          ×
        </Link>
      </span>
    </div>
  );
}
