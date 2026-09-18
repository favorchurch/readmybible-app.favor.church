/**
 * Per-person presentation figures derived from a `ConnectScore` (lib/scoring.ts,
 * the pinned contract). Pure functions over plain data, same as scoring.ts and
 * game.ts -- no Rock, no Postgres, no Redis -- so a rendering surface can call
 * these directly without re-deriving eligibility or pool membership itself.
 *
 * Issue #150 presentation contract: each person shows "Contributed N points,"
 * not chapters read, and a person who already appears in the Connect roster
 * is never duplicated in a separate Leaders section -- `isConnectRosterMember`
 * is exactly the signal a caller needs to choose between the two.
 */
import {
  BASE_POINTS_MAX,
  BONUS_POOL_MAX,
  countsInBase,
  TOTAL_ASSIGNMENTS,
  type ConnectScore,
  type PersonContribution,
} from "@/lib/scoring";

function ratioOf(person: PersonContribution): number {
  if (TOTAL_ASSIGNMENTS <= 0) return 0;
  const clamped = Math.min(TOTAL_ASSIGNMENTS, Math.max(0, person.completedAssignments));
  return Number.isFinite(clamped) ? clamped / TOTAL_ASSIGNMENTS : 0;
}

export type ContributionPoolSizes = {
  /** Count of people `countsInBase` admits to this Connect's base pool. */
  eligibleBaseCount: number;
  regionalLeaderCount: number;
  clusterHeadCount: number;
  /**
   * rockPersonIds the scorer's own regional/cluster pools actually counted.
   * A person's `isRegionalLeader`/`isClusterHead` flag alone is not enough
   * to admit them to a bonus share: `contributions` OR-s that flag in from
   * ANY of members/regionalLeaders/clusterHeads, so a person could carry the
   * flag while never having been in the array `poolBonus` divided by. Absent
   * from these sets, no share -- regardless of the flag.
   */
  regionalLeaderIds: ReadonlySet<number>;
  clusterHeadIds: ReadonlySet<number>;
};

/**
 * One person's fair share of the pools they participate in. Each pool
 * divides its total evenly by ratio, so summing this across every person in
 * `score.contributions` reproduces `score.totalPoints` exactly (mean(ratio) *
 * MAX == sum(ratio_i / n) * MAX) -- verified in tests/scoring-presentation.test.ts.
 */
export function personContributedPoints(person: PersonContribution, pools: ContributionPoolSizes): number {
  const ratio = ratioOf(person);
  let points = 0;
  if (countsInBase(person) && pools.eligibleBaseCount > 0) {
    points += (ratio * BASE_POINTS_MAX) / pools.eligibleBaseCount;
  }
  if (pools.regionalLeaderIds.has(person.rockPersonId) && pools.regionalLeaderCount > 0) {
    points += (ratio * BONUS_POOL_MAX) / pools.regionalLeaderCount;
  }
  if (pools.clusterHeadIds.has(person.rockPersonId) && pools.clusterHeadCount > 0) {
    points += (ratio * BONUS_POOL_MAX) / pools.clusterHeadCount;
  }
  return points;
}

export type RosterPersonPresentation = {
  rockPersonId: number;
  /** Exact. Sums to `score.totalPoints` across every row. */
  contributedPoints: number;
  /** Rounded whole number, for display only. */
  displayContributedPoints: number;
  /** True for a Regional Leader, Cluster Head, or Department Head -- the
   *  member-facing "Leader" marker, collapsed from the three oversight roles. */
  isUpstreamLeader: boolean;
  /** Genuine current member or Connect Leader of this Connect. False means
   *  this row belongs in the Leaders section, never the roster. */
  isConnectRosterMember: boolean;
};

/**
 * Presentation rows for every deduplicated person a `ConnectScore` knows
 * about. A caller renders `isConnectRosterMember` rows inline in the roster
 * (with a Leader marker when also `isUpstreamLeader`), and the remaining
 * `isUpstreamLeader` rows in a separate, member-facing Leaders section --
 * never both, so a dual-role person is never shown twice.
 */
export function presentConnectRoster(score: ConnectScore): RosterPersonPresentation[] {
  // Read the pool sizes the scorer actually divided by, rather than
  // re-deriving them by filtering `score.contributions` on role flags:
  // `contributions` is the union of members, regionalLeaders, and
  // clusterHeads, which only agrees with the scorer's own pool sizes when a
  // caller keeps every role flag perfectly in sync with pool membership.
  const pools: ContributionPoolSizes = {
    eligibleBaseCount: score.eligibleBaseCount,
    regionalLeaderCount: score.regionalLeaderCount,
    clusterHeadCount: score.clusterHeadCount,
    regionalLeaderIds: score.regionalLeaderIds,
    clusterHeadIds: score.clusterHeadIds,
  };

  return score.contributions.map((person) => {
    const contributedPoints = personContributedPoints(person, pools);
    return {
      rockPersonId: person.rockPersonId,
      contributedPoints,
      displayContributedPoints: Math.round(contributedPoints),
      isUpstreamLeader: person.isRegionalLeader || person.isClusterHead || person.isDepartmentHead,
      isConnectRosterMember: person.isConnectMember || person.isConnectLeader,
    };
  });
}
