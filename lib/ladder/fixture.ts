/**
 * Frozen hierarchy + stats fixture for the home-ladder prototypes.
 *
 * Resolves the wayfinder ticket "Freeze a hierarchy + stats fixture spanning
 * Tent to Mansion" on the map "the home ladder" (issue #111 / map #110).
 *
 * `fixture-tree.json` is a REAL read of Rock production on 2026-09-16 --
 * ids, names, member counts and leader nicknames are untouched. Only the
 * check-in numbers are synthetic, and they are derived here by a pure
 * function rather than baked into the JSON, so the tuning stays visible and
 * the frozen shape stays honest.
 *
 * October's real data will be near-uniform and will not show the stage
 * ladder working; this fixture forces Tent..Mansion into a single region.
 *
 * Prototypes only. Nothing here reads Rock or Postgres at runtime -- it is a
 * drop-in replacement for `loadSectionSubtree` + `loadAdminStats`, which is
 * why the ladder prototypes are unaffected by the lazy-load finding in #113.
 */
import type { SectionWithStats } from "@/lib/admin/stats";
import { groupRatio, stageFor, TOTAL_CHAPTERS } from "@/lib/game";
import type { HierarchySectionNode } from "@/lib/rock/hierarchy";

import frozenTree from "./fixture-tree.json";

/** Frozen 2026-09-16 Rock read: 6 roots, 109 Connect Groups, 1144 active members. */
export const FIXTURE_FROZEN_AT = "2026-09-16";

/** Midpoint ratio of each stage band, lowest to highest (see STAGE_THRESHOLDS in lib/game.ts). */
const STAGE_MIDPOINTS = [0.04, 0.18, 0.35, 0.55, 0.75, 0.92] as const;

/**
 * Connect Groups whose stats are deliberately absent, for the "data
 * unavailable" occupant state. They carry NO entry in the tuned maps, so a
 * consumer reading `checkins` alone sees 0 -- check this list to render
 * `--/--` instead of a zero. Both state groups sit in Region // Arlene
 * Gavile, leaving Region // Eula Cheng a clean Tent..Mansion spread.
 */
export const FIXTURE_UNAVAILABLE_GROUP_IDS: readonly number[] = [23956];

/** Connect Groups pinned to a genuine zero, distinct from unavailable. */
export const FIXTURE_ZERO_GROUP_IDS: readonly number[] = [23950];

/**
 * Named scopes to view the fixture as. These stand in for
 * `resolveAdminScope`'s `rootIds` -- a prototype picks one instead of
 * resolving a real Rock session, so no login or Rock read is involved.
 */
export const FIXTURE_VIEWERS = {
  /** Cluster head, 4 regions, the everyday case. Lands on Cluster // Jz Olivar. */
  clusterHead: { label: "Cluster // Jz Olivar", rootIds: [23864] },
  /** Regional leader with 4 connects spanning Tent..Mansion. Lands on Region // Eula Cheng. */
  regionalLeader: { label: "Region // Eula Cheng", rootIds: [23865] },
  /** Regional leader whose region holds exactly one connect. */
  singleConnectRegion: { label: "Region // Mila Nava", rootIds: [23856] },
  /** The 12-region stress case (#117's breaking case). */
  bigClusterHead: { label: "Cluster // Pranav Sadhwani", rootIds: [31557] },
  /** No cluster layer -- regions sit directly under the department (BNE). */
  departmentAsCluster: { label: "BNE Adults", rootIds: [24173] },
  /** Department-as-cluster holding a single region. */
  singleRegionDepartment: { label: "BNE Seasoned", rootIds: [24174] },
  /**
   * Two real roots under different departments -- the multi-scope chooser
   * case (#116). Both are named "Cluster // Chap De Guzman & Lyn De Guzman".
   */
  multiScope: {
    label: "Chap De Guzman & Lyn De Guzman (MNL Adults + MNL Seasoned)",
    rootIds: [23835, 23913],
  },
} as const;

export type FixtureViewerKey = keyof typeof FIXTURE_VIEWERS;

/**
 * Spreads a section's connects evenly across the six stage bands, so a
 * region with 4+ connects always shows Tent and Mansion side by side.
 * Sections with one or two connects rotate by section id instead, so the
 * single-connect regions are not all Tent.
 */
function tunedRatio(sectionId: number, index: number, groupCount: number): number {
  if (groupCount >= 3) {
    const step = Math.round((index * (STAGE_MIDPOINTS.length - 1)) / (groupCount - 1));
    return STAGE_MIDPOINTS[step];
  }
  const rotation = (sectionId + index * 2) % STAGE_MIDPOINTS.length;
  return STAGE_MIDPOINTS[rotation];
}

function buildTunedStats(): {
  totals: Map<number, number>;
  readersToday: Map<number, number>;
} {
  const totals = new Map<number, number>();
  const readersToday = new Map<number, number>();

  function walk(node: HierarchySectionNode) {
    node.groups.forEach((group, index) => {
      if (FIXTURE_UNAVAILABLE_GROUP_IDS.includes(group.id)) return;
      const ratio = FIXTURE_ZERO_GROUP_IDS.includes(group.id)
        ? 0
        : tunedRatio(node.id, index, node.groups.length);
      // `checkins` is cumulative chapters read, and groupRatio divides it by
      // members x TOTAL_CHAPTERS -- so the target ratio has to be scaled back
      // up through both to land on the intended stage.
      totals.set(group.id, Math.round(ratio * group.memberCount * TOTAL_CHAPTERS));
      // readersToday is a head count of people, capped by the roster.
      readersToday.set(group.id, Math.round(ratio * group.memberCount));
    });
    node.children.forEach(walk);
  }

  (frozenTree as HierarchySectionNode[]).forEach(walk);
  return { totals, readersToday };
}

/** The frozen tree exactly as read from Rock, with no stats attached. */
export function ladderFixtureTree(): HierarchySectionNode[] {
  return structuredClone(frozenTree) as HierarchySectionNode[];
}

/**
 * The fixture with tuned stats attached, in the same shape `loadAdminStats`
 * returns its `sections`. Synchronous and side-effect free.
 *
 * Deliberately does NOT import `attachGroupStats` from lib/admin/stats --
 * that module pulls in drizzle and node:crypto, which would keep this
 * fixture out of a client prototype. The attach loop below is the same three
 * lines over `groupRatio` + `stageFor`, the single source of stage truth.
 */
export function loadLadderFixture(rootIds?: number[]): SectionWithStats[] {
  const tree = ladderFixtureTree();
  const roots = rootIds ? selectRoots(tree, rootIds) : tree;
  const { totals, readersToday } = buildTunedStats();

  function attach(node: HierarchySectionNode): SectionWithStats {
    return {
      id: node.id,
      name: node.name,
      campusId: node.campusId,
      children: node.children.map(attach),
      groups: node.groups.map((group) => {
        const checkins = totals.get(group.id) ?? 0;
        const ratio = groupRatio(checkins, group.memberCount);
        return {
          ...group,
          checkins,
          readersToday: readersToday.get(group.id) ?? 0,
          ratio,
          stage: stageFor(ratio),
        };
      }),
    };
  }

  return roots.map(attach);
}

/** Finds each requested id anywhere in the frozen tree, so any rung can be a root. */
function selectRoots(tree: HierarchySectionNode[], rootIds: number[]): HierarchySectionNode[] {
  const found: HierarchySectionNode[] = [];
  function walk(node: HierarchySectionNode) {
    if (rootIds.includes(node.id)) found.push(node);
    node.children.forEach(walk);
  }
  tree.forEach(walk);
  return found;
}

/** The fixture as a named viewer sees it. */
export function loadLadderFixtureAs(viewer: FixtureViewerKey): SectionWithStats[] {
  return loadLadderFixture([...FIXTURE_VIEWERS[viewer].rootIds]);
}
