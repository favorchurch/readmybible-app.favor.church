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
    const pools = { eligibleBaseCount: 0, regionalLeaderCount: 2, clusterHeadCount: 0 };
    expect(personContributedPoints(a, pools)).toBeCloseTo(BONUS_POOL_MAX / 2, 8);
    expect(personContributedPoints(b, pools)).toBeCloseTo(BONUS_POOL_MAX / 2, 8);
  });

  it("is zero for someone who counts in no pool", () => {
    const bystander = person(1, TOTAL_ASSIGNMENTS, { isConnectMember: false });
    const pools = { eligibleBaseCount: 0, regionalLeaderCount: 0, clusterHeadCount: 0 };
    expect(personContributedPoints(bystander, pools)).toBe(0);
  });
});
