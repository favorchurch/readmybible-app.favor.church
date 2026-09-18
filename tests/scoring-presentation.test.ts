/**
 * Issue #150 presentation contract: each person shows "Contributed N points,"
 * and a person who already appears in the Connect roster is never duplicated
 * in a separate Leaders section. These are pure-math tests over
 * `lib/scoring-presentation.ts`; lib/scoring.ts's own arithmetic is covered
 * by tests/scoring.test.ts.
 */
import { describe, expect, it } from "vitest";

import { BONUS_POOL_MAX, scoreConnect, TOTAL_ASSIGNMENTS, type PersonContribution } from "@/lib/scoring";
import { personContributedPoints, presentConnectRoster } from "@/lib/scoring-presentation";

function person(
  rockPersonId: number,
  completedAssignments: number,
  overrides: Partial<PersonContribution> = {},
): PersonContribution {
  return {
    rockPersonId,
    completedAssignments,
    isConnectMember: true,
    isConnectLeader: false,
    isRegionalLeader: false,
    isClusterHead: false,
    isDepartmentHead: false,
    ...overrides,
  };
}

function connect(input: {
  members?: PersonContribution[];
  regionalLeaders?: PersonContribution[];
  clusterHeads?: PersonContribution[];
}) {
  return scoreConnect({
    groupId: 1,
    members: input.members ?? [],
    regionalLeaders: input.regionalLeaders ?? [],
    clusterHeads: input.clusterHeads ?? [],
  });
}

describe("presentConnectRoster sums to the exact total", () => {
  it("across base members alone", () => {
    const score = connect({
      members: [person(1, TOTAL_ASSIGNMENTS), person(2, 5), person(3, 0)],
    });
    const rows = presentConnectRoster(score);
    const sum = rows.reduce((total, row) => total + row.contributedPoints, 0);
    expect(sum).toBeCloseTo(score.totalPoints, 8);
  });

  it("across base members plus both bonus pools, including a dual-role person", () => {
    const dual = person(9, 10, { isRegionalLeader: true, isClusterHead: true });
    const score = connect({
      members: [person(1, TOTAL_ASSIGNMENTS), person(2, 3, { isConnectLeader: true })],
      regionalLeaders: [dual, person(10, TOTAL_ASSIGNMENTS, { isRegionalLeader: true })],
      clusterHeads: [dual],
    });
    const rows = presentConnectRoster(score);
    const sum = rows.reduce((total, row) => total + row.contributedPoints, 0);
    expect(sum).toBeCloseTo(score.totalPoints, 8);
  });

  it("is zero across the board for an empty Connect", () => {
    const score = connect({});
    expect(presentConnectRoster(score)).toEqual([]);
  });
});

describe("presentConnectRoster roster vs Leaders section classification", () => {
  it("marks an ordinary base member as roster-only, no Leader marker", () => {
    const score = connect({ members: [person(1, 5)] });
    const [row] = presentConnectRoster(score);
    expect(row.isConnectRosterMember).toBe(true);
    expect(row.isUpstreamLeader).toBe(false);
  });

  it("marks an upstream-only Regional Leader for the Leaders section, not the roster", () => {
    const score = connect({
      members: [person(1, 0)],
      regionalLeaders: [person(9, TOTAL_ASSIGNMENTS, { isConnectMember: false, isRegionalLeader: true })],
    });
    const upstream = presentConnectRoster(score).find((row) => row.rockPersonId === 9)!;
    expect(upstream.isConnectRosterMember).toBe(false);
    expect(upstream.isUpstreamLeader).toBe(true);
  });

  it("shows a dual-role person once, inline in the roster with a Leader marker -- never duplicated", () => {
    const score = connect({
      members: [person(9, 12, { isConnectLeader: true })],
      regionalLeaders: [person(9, 12, { isRegionalLeader: true })],
    });
    const rows = presentConnectRoster(score).filter((row) => row.rockPersonId === 9);
    expect(rows).toHaveLength(1);
    expect(rows[0].isConnectRosterMember).toBe(true);
    expect(rows[0].isUpstreamLeader).toBe(true);
  });

  it("marks a Department Head who is a genuine member as roster + Leader, even though they earn no base share", () => {
    const score = connect({
      members: [person(1, TOTAL_ASSIGNMENTS), person(2, TOTAL_ASSIGNMENTS, { isDepartmentHead: true })],
    });
    const departmentHead = presentConnectRoster(score).find((row) => row.rockPersonId === 2)!;
    expect(departmentHead.isConnectRosterMember).toBe(true);
    expect(departmentHead.isUpstreamLeader).toBe(true);
    // Excluded from the base numerator/denominator, and Department Heads have
    // no pool of their own, so their contributed points are exactly zero.
    expect(departmentHead.contributedPoints).toBe(0);
  });
});

describe("personContributedPoints", () => {
  it("splits a fully-capped bonus pool evenly across its current holders", () => {
    const a = person(9, TOTAL_ASSIGNMENTS, { isRegionalLeader: true, isConnectMember: false });
    const b = person(10, TOTAL_ASSIGNMENTS, { isRegionalLeader: true, isConnectMember: false });
    const pools = {
      eligibleBaseCount: 0,
      regionalLeaderCount: 2,
      clusterHeadCount: 0,
      regionalLeaderIds: new Set([9, 10]),
      clusterHeadIds: new Set<number>(),
    };
    expect(personContributedPoints(a, pools)).toBeCloseTo(BONUS_POOL_MAX / 2, 8);
    expect(personContributedPoints(b, pools)).toBeCloseTo(BONUS_POOL_MAX / 2, 8);
  });

  it("is zero for someone who counts in no pool", () => {
    const bystander = person(1, TOTAL_ASSIGNMENTS, { isConnectMember: false });
    const pools = {
      eligibleBaseCount: 0,
      regionalLeaderCount: 0,
      clusterHeadCount: 0,
      regionalLeaderIds: new Set<number>(),
      clusterHeadIds: new Set<number>(),
    };
    expect(personContributedPoints(bystander, pools)).toBe(0);
  });

  it("is zero for someone who carries the isRegionalLeader flag but was never in the real pool the count was divided by", () => {
    // The exact shape F3's eligibility residue named: a flag with no
    // corresponding membership in the pool the scorer actually built.
    const strayFlagged = person(5, TOTAL_ASSIGNMENTS, { isRegionalLeader: true, isConnectMember: false });
    const pools = {
      eligibleBaseCount: 0,
      regionalLeaderCount: 1,
      clusterHeadCount: 0,
      regionalLeaderIds: new Set([9]), // 5 is NOT in here, even though the flag is set.
      clusterHeadIds: new Set<number>(),
    };
    expect(personContributedPoints(strayFlagged, pools)).toBe(0);
  });
});

describe("presentConnectRoster pool sizes (F3, issue #150 PR #185)", () => {
  it("derives pool sizes from what the scorer actually divided by, not by filtering contributions on role flags", () => {
    // A roster member who carries the isRegionalLeader flag but was never
    // included in the `regionalLeaders` array scoreConnect divides by -- the
    // shape of ConnectScore a future, differently-built caller (issue #153)
    // could produce even though today's only caller (resolveConnectScore)
    // never constructs one like it.
    const strayFlaggedMember = person(5, TOTAL_ASSIGNMENTS, { isRegionalLeader: true });
    const soleRealRegionalLeader = person(9, 10, { isConnectMember: false, isRegionalLeader: true });
    const score = connect({
      members: [person(1, TOTAL_ASSIGNMENTS), strayFlaggedMember],
      regionalLeaders: [soleRealRegionalLeader],
    });

    // scoreConnect's own regional pool has exactly one person (9). Filtering
    // `score.contributions` on `isRegionalLeader` would instead count two
    // (5 and 9), because 5's flag survives the dedupe/merge into
    // `contributions` despite never being part of the array the scorer used.
    expect(score.regionalLeaderCount).toBe(1);

    const rows = presentConnectRoster(score);
    const nineShare = rows.find((row) => row.rockPersonId === 9)!.contributedPoints;
    const ratio9 = 10 / TOTAL_ASSIGNMENTS;

    // 9 is the ENTIRE real pool, so their exact share of the 75-point pool
    // is their own full ratio -- not halved by a phantom second pool member
    // that filtering `score.contributions` on the flag would have counted.
    expect(nineShare).toBeCloseTo(ratio9 * BONUS_POOL_MAX, 8);
    expect(score.regionalBonus).toBeCloseTo(ratio9 * BONUS_POOL_MAX, 8);
    expect(nineShare).toBeCloseTo(score.regionalBonus, 8);
  });

  it("gates a bonus share on actual pool membership, not the role flag alone, so the sum-to-total invariant holds even for a stray-flagged member", () => {
    // Same adversarial shape as above -- a member (5) carries isRegionalLeader
    // without ever being in the `regionalLeaders` array the scorer divided
    // by. Round-2's fix (matching pool SIZE) alone does not save this case:
    // personContributedPoints still granted 5 a share purely from the flag,
    // which both inflated their own row AND broke the sum === totalPoints
    // invariant every other test in this file relies on. Gating on
    // `regionalLeaderIds` (real pool membership) instead closes it.
    const strayFlaggedMember = person(5, TOTAL_ASSIGNMENTS, { isRegionalLeader: true });
    const soleRealRegionalLeader = person(9, 10, { isConnectMember: false, isRegionalLeader: true });
    const score = connect({
      members: [person(1, TOTAL_ASSIGNMENTS), strayFlaggedMember],
      regionalLeaders: [soleRealRegionalLeader],
    });

    const rows = presentConnectRoster(score);
    const fiveShare = rows.find((row) => row.rockPersonId === 5)!.contributedPoints;
    const sum = rows.reduce((total, row) => total + row.contributedPoints, 0);

    // 5 carries the flag but was never in the real pool -- no share, even
    // though `pools.regionalLeaderCount > 0`.
    expect(fiveShare).toBe(0);
    expect(sum).toBeCloseTo(score.totalPoints, 8);
  });
});
