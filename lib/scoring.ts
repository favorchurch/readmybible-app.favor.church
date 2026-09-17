/**
 * Derived Connect scoring. See intent/GAME.md and issue #150.
 *
 * Points are math over current membership, current roles, and stored reading
 * facts. Nothing here is a running total: there is no score to increment, and a
 * cache may accelerate `scoreConnect` but is never authoritative.
 *
 * Like `lib/game.ts`, these are plain functions over plain data -- no Rock, no
 * Postgres, no Redis -- so they unit test directly.
 *
 * Every threshold test runs against the exact unrounded total. `displayPoints`
 * is for rendering only and must never decide a stage.
 */

import { TOTAL_ASSIGNMENTS } from "@/lib/plan";
import type { Stage } from "@/lib/game";

export type { Stage };
export { TOTAL_ASSIGNMENTS };

/** Full base pool for a Connect at 100% completion: 666.666... */
export const BASE_POINTS_MAX = 2000 / 3;

/** Each upstream leader pool is independently capped here. */
export const BONUS_POOL_MAX = 75;

const POINT_STAGE_THRESHOLDS: Array<{ stage: Stage; points: number }> = [
  { stage: "Mansion", points: 500 },
  { stage: "House", points: 400 },
  { stage: "Condo", points: 300 },
  { stage: "Cabin", points: 200 },
  { stage: "Trailer", points: 100 },
  { stage: "Tent", points: 0 },
];

/**
 * Home stage for an exact point total. Pass the unrounded value: rounding first
 * lets 299.6 read as Condo when it is still Cabin. Totals above 500 stay Mansion.
 */
export function stageForPoints(points: number): Stage {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
  for (const { stage, points: threshold } of POINT_STAGE_THRESHOLDS) {
    if (safe >= threshold) return stage;
  }
  return "Tent";
}

/**
 * One person's standing in one Connect, as the scorer needs it.
 *
 * These are facts about the person, never conclusions about them. Base
 * eligibility is derived here by `countsInBase`, not supplied by the caller: a
 * caller that builds one row per role would otherwise have to get the exclusion
 * right in every construction site, and getting it wrong fails open -- the
 * excluded upstream leader quietly re-enters the base pool.
 */
export type PersonContribution = {
  rockPersonId: number;
  /** 0..TOTAL_ASSIGNMENTS. A two-chapter day is one assignment, not two. */
  completedAssignments: number;
  /** Genuine current member of *this* Connect. Distinct from base eligibility. */
  isConnectMember: boolean;
  isConnectLeader: boolean;
  isRegionalLeader: boolean;
  isClusterHead: boolean;
  isDepartmentHead: boolean;
};

/** True when this person holds an oversight role above the Connect. */
function hasUpstreamRole(person: PersonContribution): boolean {
  return person.isRegionalLeader || person.isClusterHead || person.isDepartmentHead;
}

/**
 * Whether a person counts in this Connect's base numerator *and* denominator.
 *
 * An upstream leader who is merely an ordinary member here leaves both. The same
 * person counts normally once they also lead this Connect.
 */
export function countsInBase(person: PersonContribution): boolean {
  if (!person.isConnectMember && !person.isConnectLeader) return false;
  if (person.isConnectLeader) return true;
  return !hasUpstreamRole(person);
}

export type ConnectScore = {
  groupId: number;
  /** Exact. */
  basePoints: number;
  /** Exact, 0..BONUS_POOL_MAX. */
  regionalBonus: number;
  /** Exact, 0..BONUS_POOL_MAX. */
  clusterBonus: number;
  /** Exact sum. May exceed 500; Mansion is not a ceiling. */
  totalPoints: number;
  /** Always stageForPoints(totalPoints). */
  stage: Stage;
  /** Rounded whole number, for display only. Never feed this to stageForPoints. */
  displayPoints: number;
  /** True only once a Connect member or Connect Leader has a completed assignment. */
  unlocked3dCampfire: boolean;
  /** Deduplicated by rockPersonId, so a dual-role person appears once. */
  contributions: PersonContribution[];
};

/**
 * Contain a bad number at the person rather than the Connect. `Math.max(0, NaN)`
 * is NaN, so a single missing check-in count would otherwise turn the whole
 * total into NaN -- and NaN reads as Tent, dropping a Mansion to a Tent with no
 * error anywhere.
 */
function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Completed assignments for one person, clamped to [0, TOTAL_ASSIGNMENTS]. */
function assignmentsOf(person: PersonContribution): number {
  return Math.min(TOTAL_ASSIGNMENTS, Math.max(0, finiteOrZero(person.completedAssignments)));
}

/** Completion ratio for one person, clamped to [0, 1]. */
function ratioOf(person: PersonContribution): number {
  if (TOTAL_ASSIGNMENTS <= 0) return 0;
  return assignmentsOf(person) / TOTAL_ASSIGNMENTS;
}

/** Pool average across a leader set. An empty set contributes nothing, never NaN. */
function poolBonus(leaders: PersonContribution[]): number {
  if (leaders.length === 0) return 0;
  const mean = leaders.reduce((sum, leader) => sum + ratioOf(leader), 0) / leaders.length;
  return Math.min(BONUS_POOL_MAX, Math.max(0, BONUS_POOL_MAX * mean));
}

/**
 * Merge duplicate appearances of one person into a single contribution, OR-ing
 * their role flags. A person who is both a member and an upstream leader is one
 * row, so the roster never shows them twice.
 */
function dedupe(people: PersonContribution[]): PersonContribution[] {
  const merged = new Map<number, PersonContribution>();
  for (const person of people) {
    const existing = merged.get(person.rockPersonId);
    if (!existing) {
      merged.set(person.rockPersonId, { ...person });
      continue;
    }
    // Role flags are facts about the person, so OR-ing them is right: a row
    // built while walking regional leaders knows nothing about this Connect's
    // roster. Completion is per-person-per-campaign, so two rows for the same
    // person should already agree; max reconciles a stale one upward.
    merged.set(person.rockPersonId, {
      ...existing,
      completedAssignments: Math.max(assignmentsOf(existing), assignmentsOf(person)),
      isConnectMember: existing.isConnectMember || person.isConnectMember,
      isConnectLeader: existing.isConnectLeader || person.isConnectLeader,
      isRegionalLeader: existing.isRegionalLeader || person.isRegionalLeader,
      isClusterHead: existing.isClusterHead || person.isClusterHead,
      isDepartmentHead: existing.isDepartmentHead || person.isDepartmentHead,
    });
  }
  return [...merged.values()];
}

/**
 * Score one Connect from its current membership and the current holders of the
 * upstream roles above it. Callers resolve who those people are; this function
 * only does the arithmetic, which is why membership and role changes simply
 * produce a different answer next call rather than needing a ledger.
 */
export function scoreConnect(input: {
  groupId: number;
  members: PersonContribution[];
  regionalLeaders: PersonContribution[];
  clusterHeads: PersonContribution[];
}): ConnectScore {
  const members = dedupe(input.members);
  const eligible = members.filter(countsInBase);

  const denominator = eligible.length * TOTAL_ASSIGNMENTS;
  const completed = eligible.reduce((sum, member) => sum + assignmentsOf(member), 0);
  const basePoints = denominator > 0 ? (completed / denominator) * BASE_POINTS_MAX : 0;

  const regionalBonus = poolBonus(dedupe(input.regionalLeaders));
  const clusterBonus = poolBonus(dedupe(input.clusterHeads));

  const totalPoints = basePoints + regionalBonus + clusterBonus;

  return {
    groupId: input.groupId,
    basePoints,
    regionalBonus,
    clusterBonus,
    totalPoints,
    stage: stageForPoints(totalPoints),
    displayPoints: Math.round(totalPoints),
    // Membership, not base eligibility. A Regional Leader who genuinely belongs
    // to this Connect is a member reading real assignments; the rule bars
    // upstream-only bonus activity, which is a different thing.
    unlocked3dCampfire: members.some(
      (member) =>
        (member.isConnectMember || member.isConnectLeader) && assignmentsOf(member) > 0,
    ),
    contributions: dedupe([...members, ...input.regionalLeaders, ...input.clusterHeads]),
  };
}
