"use client";

/**
 * Client shell for the ladder prototype. The tree arrives as props from the
 * server page -- switching viewer means a different Rock subtree, so it is a
 * navigation, not local state.
 */
import { useRouter } from "next/navigation";

import { LadderTownView } from "@/components/ladder/town-view";
import type { SectionWithStats } from "@/lib/admin/stats";

import "./ladder.css";

export function LadderPrototype({
  roots,
  unavailableGroupIds,
  viewer,
  viewers,
}: {
  roots: SectionWithStats[];
  unavailableGroupIds: number[];
  viewer: string;
  viewers: Array<{ key: string; label: string }>;
}) {
  const router = useRouter();

  return (
    <main className="ladder-page">
      <header className="ladder-header">
        <p className="ladder-eyebrow">Prototype · home ladder</p>
        <h1>Region town view</h1>
        <p className="ladder-lede">
          Live Rock structure, synthetic check-in ratios. Nothing here is committed to the repo.
        </p>
      </header>
      <LadderTownView
        roots={roots}
        unavailableGroupIds={unavailableGroupIds}
        viewer={viewer}
        viewers={viewers}
        onChangeViewer={(next) => router.push(`/ladder?viewer=${next}`)}
      />
    </main>
  );
}
