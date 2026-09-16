/**
 * Data source for the home-ladder prototype.
 *
 * **Nothing here is committed.** An earlier version of this module froze a
 * real Rock read into `fixture-tree.json` -- 109 connect group names, 150
 * leader first names and per-group member counts -- and this repository is
 * public. That file is gone; the tree is now read from Rock at request time
 * using the key in `.env.local`, which is gitignored, so congregation data
 * never enters git.
 *
 * Structure comes from Rock. **Ratios do not**: October's real check-in data
 * will be near-uniform and would show every home at the same stage, which is
 * exactly what the prototype needs to disprove. `tunedRatio` spreads a
 * section's connects across all six stage bands so Tent and Mansion stand
 * side by side.
 *
 * Caching is the read-through Redis cache `loadSectionSubtree` already uses
 * (`rock:hierarchy:{rootId}`, 15 minutes), so a session costs one cold Rock
 * walk and every later navigation is served from cache.
 *
 * Dev-only. `lib/ladder/dev-gate.ts` keeps the route out of production.
 */
import "server-only";

import type { SectionWithStats } from "@/lib/admin/stats";
import {
  attachTunedStats,
  LADDER_VIEWERS,
  pickStateGroups,
  type LadderViewerKey,
} from "@/lib/ladder/tuning";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";

export type LadderTree = {
  sections: SectionWithStats[];
  unavailableGroupIds: number[];
};

/**
 * Reads the subtree for each root from Rock (Redis-cached read-through) and
 * attaches the synthetic ratios. One cold Rock walk per root per 15 minutes.
 */
export async function loadLadderTree(rootIds: readonly number[]): Promise<LadderTree> {
  const raw = await loadSectionSubtree([...rootIds]);
  const states = pickStateGroups(raw);
  return {
    sections: attachTunedStats(raw, states),
    unavailableGroupIds: states.unavailableId === null ? [] : [states.unavailableId],
  };
}

export async function loadLadderTreeAs(viewer: LadderViewerKey): Promise<LadderTree> {
  return loadLadderTree(LADDER_VIEWERS[viewer].rootIds);
}
