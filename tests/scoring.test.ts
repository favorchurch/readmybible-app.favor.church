import { describe, expect, it } from "vitest";

import {
  BASE_POINTS_MAX,
  BONUS_POOL_MAX,
  TOTAL_ASSIGNMENTS,
  countsInBase,
  type PersonContribution,
  scoreConnect,
  stageForPoints,
} from "@/lib/scoring";

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

describe("stageForPoints", () => {
  it("maps each band to its stage", () => {
    expect(stageForPoints(0)).toBe("Tent");
    expect(stageForPoints(99.9)).toBe("Tent");
    expect(stageForPoints(100)).toBe("Trailer");
    expect(stageForPoints(200)).toBe("Cabin");
    expect(stageForPoints(300)).toBe("Condo");
    expect(stageForPoints(400)).toBe("House");
    expect(stageForPoints(500)).toBe("Mansion");
  });

  it("does not let a rounded value cross a threshold", () => {
    // 299.6 displays as 300 but is still Cabin. Rounding first is the bug this guards.
    expect(stageForPoints(299.6)).toBe("Cabin");
    expect(stageForPoints(Math.round(299.6))).toBe("Condo");
    expect(stageForPoints(99.5)).toBe("Tent");
  });

  it("keeps Mansion above 500 rather than capping", () => {
    expect(stageForPoints(816.66)).toBe("Mansion");
  });

  it("treats a non-finite or negative total as Tent", () => {
    expect(stageForPoints(Number.NaN)).toBe("Tent");
    expect(stageForPoints(-50)).toBe("Tent");
  });
});

describe("scoreConnect base pool", () => {
  it("awards the full base pool when every eligible member finishes", () => {
    const score = connect({
      members: [person(1, TOTAL_ASSIGNMENTS), person(2, TOTAL_ASSIGNMENTS)],
    });
    expect(score.basePoints).toBeCloseTo(BASE_POINTS_MAX, 10);
    expect(score.stage).toBe("Mansion");
    expect(score.displayPoints).toBe(667);
  });

  it("returns zero rather than dividing by zero on an empty denominator", () => {
    const score = connect({ members: [] });
    expect(score.basePoints).toBe(0);
    expect(score.totalPoints).toBe(0);
    expect(Number.isNaN(score.totalPoints)).toBe(false);
    expect(score.stage).toBe("Tent");
  });

  it("recalculates from the current denominator when a member joins", () => {
    const before = connect({ members: [person(1, 10)] });
    const after = connect({ members: [person(1, 10), person(2, 0)] });
    expect(after.basePoints).toBeLessThan(before.basePoints);
    expect(after.basePoints).toBeCloseTo(before.basePoints / 2, 10);
  });

  it("excludes an upstream leader who is only an ordinary member from both numerator and denominator", () => {
    const withVisitor = connect({
      members: [
        person(1, TOTAL_ASSIGNMENTS),
        person(2, 0, { isRegionalLeader: true }),
      ],
    });
    const withoutVisitor = connect({ members: [person(1, TOTAL_ASSIGNMENTS)] });
    expect(withVisitor.basePoints).toBeCloseTo(withoutVisitor.basePoints, 10);
  });

  it("counts an upstream leader normally when they also lead this Connect", () => {
    const score = connect({
      members: [
        person(1, 0),
        person(2, TOTAL_ASSIGNMENTS, { isConnectLeader: true, isRegionalLeader: true }),
      ],
    });
    expect(score.basePoints).toBeCloseTo(BASE_POINTS_MAX / 2, 10);
  });
});

describe("scoreConnect bonus pools", () => {
  it("caps each pool independently at 75", () => {
    const score = connect({
      members: [person(1, 0)],
      regionalLeaders: [person(9, TOTAL_ASSIGNMENTS, { isRegionalLeader: true })],
      clusterHeads: [person(8, TOTAL_ASSIGNMENTS, { isClusterHead: true })],
    });
    expect(score.regionalBonus).toBeCloseTo(BONUS_POOL_MAX, 10);
    expect(score.clusterBonus).toBeCloseTo(BONUS_POOL_MAX, 10);
    expect(score.totalPoints).toBeCloseTo(BONUS_POOL_MAX * 2, 10);
  });

  it("averages across the leaders currently holding the role", () => {
    const score = connect({
      regionalLeaders: [
        person(9, TOTAL_ASSIGNMENTS, { isRegionalLeader: true }),
        person(10, 0, { isRegionalLeader: true }),
      ],
    });
    expect(score.regionalBonus).toBeCloseTo(BONUS_POOL_MAX / 2, 10);
  });

  it("lets one person participate in both pools when they genuinely hold both roles", () => {
    const dual = person(9, TOTAL_ASSIGNMENTS, { isRegionalLeader: true, isClusterHead: true });
    const score = connect({ regionalLeaders: [dual], clusterHeads: [dual] });
    expect(score.regionalBonus).toBeCloseTo(BONUS_POOL_MAX, 10);
    expect(score.clusterBonus).toBeCloseTo(BONUS_POOL_MAX, 10);
  });

  it("contributes nothing when a pool has no current holders", () => {
    const score = connect({ members: [person(1, 0)], regionalLeaders: [] });
    expect(score.regionalBonus).toBe(0);
  });
});

describe("scoreConnect presentation data", () => {
  it("unlocks the 3D Campfire only from a Connect member or leader contribution", () => {
    const upstreamOnly = connect({
      members: [person(1, 0)],
      regionalLeaders: [person(9, TOTAL_ASSIGNMENTS, { isRegionalLeader: true })],
    });
    expect(upstreamOnly.unlocked3dCampfire).toBe(false);

    const memberRead = connect({ members: [person(1, 1)] });
    expect(memberRead.unlocked3dCampfire).toBe(true);
  });

  it("unlocks from a genuine member who also holds an upstream role", () => {
    // They are excluded from the base pool, but they are still a member who read.
    const score = connect({
      members: [person(2, 5, { isClusterHead: true })],
    });
    expect(countsInBase(score.contributions[0])).toBe(false);
    expect(score.unlocked3dCampfire).toBe(true);
  });

  it("does not unlock from someone who is not a member of this Connect at all", () => {
    const score = connect({
      members: [person(1, 0)],
      clusterHeads: [person(9, TOTAL_ASSIGNMENTS, { isConnectMember: false, isClusterHead: true })],
    });
    expect(score.unlocked3dCampfire).toBe(false);
  });

  it("lists a dual-role person once, with their roles merged", () => {
    const score = connect({
      members: [person(9, 12, { isConnectLeader: true })],
      regionalLeaders: [person(9, 12, { isRegionalLeader: true })],
    });
    const rows = score.contributions.filter((row) => row.rockPersonId === 9);
    expect(rows).toHaveLength(1);
    expect(rows[0].isConnectLeader).toBe(true);
    expect(rows[0].isRegionalLeader).toBe(true);
  });

  it("derives stage from the exact total, not the displayed one", () => {
    const score = connect({ members: [person(1, TOTAL_ASSIGNMENTS)] });
    expect(score.displayPoints).toBe(Math.round(score.totalPoints));
    expect(score.stage).toBe(stageForPoints(score.totalPoints));
  });
});

describe("countsInBase", () => {
  it("includes an ordinary Connect member", () => {
    expect(countsInBase(person(1, 0))).toBe(true);
  });

  it("excludes each upstream role held by a mere member", () => {
    expect(countsInBase(person(1, 0, { isRegionalLeader: true }))).toBe(false);
    expect(countsInBase(person(1, 0, { isClusterHead: true }))).toBe(false);
    expect(countsInBase(person(1, 0, { isDepartmentHead: true }))).toBe(false);
  });

  it("includes an upstream leader who also leads this Connect", () => {
    expect(countsInBase(person(1, 0, { isConnectLeader: true, isClusterHead: true }))).toBe(true);
  });

  it("excludes someone who belongs to this Connect in no capacity", () => {
    expect(countsInBase(person(1, 0, { isConnectMember: false }))).toBe(false);
  });

  it("is derived, so a merged duplicate row cannot smuggle someone back in", () => {
    // One row per role is the natural shape when walking Rock memberships. If
    // eligibility were a caller-supplied boolean, OR-ing the rows would let the
    // excluded upstream leader back into the base pool.
    const score = connect({
      members: [
        person(1, TOTAL_ASSIGNMENTS),
        person(2, TOTAL_ASSIGNMENTS, { isRegionalLeader: true }),
        person(2, TOTAL_ASSIGNMENTS),
      ],
    });
    expect(score.basePoints).toBeCloseTo(BASE_POINTS_MAX, 10);
    expect(score.contributions.filter((row) => row.rockPersonId === 2)).toHaveLength(1);
    expect(countsInBase(score.contributions.find((row) => row.rockPersonId === 2)!)).toBe(false);
  });
});

describe("scoreConnect bad input containment", () => {
  it("contains a NaN assignment count at the person rather than the Connect", () => {
    const score = connect({
      members: [person(1, TOTAL_ASSIGNMENTS), person(2, Number.NaN)],
    });
    expect(Number.isNaN(score.totalPoints)).toBe(false);
    expect(score.basePoints).toBeCloseTo(BASE_POINTS_MAX / 2, 10);
    expect(score.stage).toBe("Condo");
  });

  it("contains a NaN in a bonus pool", () => {
    const score = connect({
      regionalLeaders: [person(9, Number.NaN, { isRegionalLeader: true })],
    });
    expect(score.regionalBonus).toBe(0);
    expect(Number.isNaN(score.totalPoints)).toBe(false);
  });

  it("clamps an over-count and a negative count", () => {
    const over = connect({ members: [person(1, 999)] });
    expect(over.basePoints).toBeCloseTo(BASE_POINTS_MAX, 10);
    const under = connect({ members: [person(1, -5)] });
    expect(under.basePoints).toBe(0);
  });
});

describe("scoreConnect pool membership", () => {
  it("ignores someone placed in a pool they do not hold the role for", () => {
    // A resolver that drops a Cluster Head into regionalLeaders would otherwise
    // move up to 75 points with nothing downstream able to tell.
    const score = connect({
      regionalLeaders: [person(9, TOTAL_ASSIGNMENTS, { isClusterHead: true })],
    });
    expect(score.regionalBonus).toBe(0);
  });
});
