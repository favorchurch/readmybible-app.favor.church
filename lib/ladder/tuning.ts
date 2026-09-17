/**
 * Pure ratio tuning for the home-ladder prototype. No "server-only" import
 * and no I/O, on purpose, so it is directly unit-testable -- the same split
 * `lib/admin/stats.ts` uses for its own maths.
 *
 * The ladder's structure comes from Rock at request time (see
 * `lib/ladder/tree.ts`); only these ratios are synthetic. October's real
 * check-in data will be near-uniform and would render every home at the same
 * stage, which is the one thing the prototype must not do.
 */
import type { SectionWithStats } from "@/lib/admin/stats";
import { groupRatio, stageFor } from "@/lib/game";
import { TOTAL_ASSIGNMENTS } from "@/lib/plan";
import type { HierarchySectionNode } from "@/lib/rock/hierarchy";

/** Midpoint ratio of each stage band, lowest to highest (STAGE_THRESHOLDS in lib/game.ts). */
const STAGE_MIDPOINTS = [0.04, 0.18, 0.35, 0.55, 0.75, 0.92] as const;

/**
 * Named scopes to view the ladder as, by Rock section id. Ids, not names: an
 * id is a pointer into a private system, a name is a person. Each label says
 * what the branch is *for* rather than who leads it.
 */
export const LADDER_VIEWERS = {
  /** Prototype viewer for the Connect-owned home legend default. */
  connectLeader: { label: "Connect leader · own home", rootIds: [23856], ownGroupId: 23857 },
  /** Prototype viewer for the Connect-owned home legend default. */
  connectMember: { label: "Connect member · own home", rootIds: [23856], ownGroupId: 23857 },
  /** 4 regions -- the everyday cluster-head case. */
  clusterHead: { label: "Cluster head · 4 regions", rootIds: [23864] },
  /** 4 connects spanning Tent..Mansion once tuned. */
  regionalLeader: { label: "Regional leader · 4 connects", rootIds: [23865] },
  /** A region holding exactly one connect. */
  singleConnectRegion: { label: "Regional leader · 1 connect", rootIds: [23856] },
  /** The 12-region stress case. */
  bigClusterHead: { label: "Cluster head · 12 regions", rootIds: [31557] },
  /** No cluster layer -- regions sit directly under the department. */
  departmentAsCluster: { label: "Department as cluster · no cluster layer", rootIds: [24173] },
  /** Department-as-cluster holding a single region. */
  singleRegionDepartment: { label: "Department as cluster · 1 region", rootIds: [24174] },
  /** Two roots under different departments, identically named in Rock. */
  multiScope: { label: "Multi-scope · two roots, same name", rootIds: [23835, 23913] },
} as const;

export type LadderViewerKey = keyof typeof LADDER_VIEWERS;

/**
 * Spreads a section's connects evenly across the six stage bands, so a region
 * with 3+ connects always shows Tent and Mansion together. Sections with one
 * or two connects rotate by section id instead, so single-connect regions are
 * not uniformly Tent.
 *
 * Pure and exported so it can be tested without touching Rock.
 */
export function tunedRatio(sectionId: number, index: number, groupCount: number): number {
  if (groupCount >= 3) {
    const step = Math.round((index * (STAGE_MIDPOINTS.length - 1)) / (groupCount - 1));
    return STAGE_MIDPOINTS[step];
  }
  const rotation = (sectionId + index * 2) % STAGE_MIDPOINTS.length;
  return STAGE_MIDPOINTS[rotation];
}

/**
 * Which groups get the two special data states, chosen positionally rather
 * than by hardcoded id so this survives Rock changing underneath it.
 *
 * The **second** qualifying section donates them, not the first: the first
 * 4-connect section a viewer lands on is the showcase region, and spending
 * two of its four slots on a zero and a blank destroys the Tent..Mansion
 * spread that is the whole point of looking at it. When a tree has only one
 * qualifying section -- a single-region viewer -- there are no state groups
 * at all, and the cluster viewers are where those states are inspected.
 */
export function pickStateGroups(sections: HierarchySectionNode[]): {
  zeroId: number | null;
  unavailableId: number | null;
} {
  const qualifying: HierarchySectionNode[] = [];
  function walk(node: HierarchySectionNode) {
    if (node.groups.length >= 4) qualifying.push(node);
    node.children.forEach(walk);
  }
  sections.forEach(walk);

  const section = qualifying[1];
  if (!section) return { zeroId: null, unavailableId: null };
  return { zeroId: section.groups[1]?.id ?? null, unavailableId: section.groups[2]?.id ?? null };
}

/** Attaches synthetic, derived stats to a real Rock tree. Pure; no I/O. */
export function attachTunedStats(
  sections: HierarchySectionNode[],
  states: { zeroId: number | null; unavailableId: number | null },
): SectionWithStats[] {
  function attach(node: HierarchySectionNode): SectionWithStats {
    return {
      id: node.id,
      name: node.name,
      campusId: node.campusId,
      children: node.children.map(attach),
      groups: node.groups.map((group, index) => {
        const unavailable = group.id === states.unavailableId;
        const target = unavailable
          ? 0
          : group.id === states.zeroId
            ? 0
            : tunedRatio(node.id, index, node.groups.length);
        // `checkins` is cumulative assignments and groupRatio divides by
        // members x TOTAL_ASSIGNMENTS, so the target scales back up through both.
        const checkins = unavailable ? 0 : Math.round(target * group.memberCount * TOTAL_ASSIGNMENTS);
        const ratio = groupRatio(checkins, group.memberCount);
        return {
          ...group,
          checkins,
          readersToday: Math.round(target * group.memberCount),
          ratio,
          stage: stageFor(ratio),
        };
      }),
    };
  }
  return sections.map(attach);
}
