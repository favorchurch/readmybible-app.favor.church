import { describe, expect, it } from "vitest";

import { rosterContribution, scoreRoster, withDisplayPoints } from "@/components/connect-score";
import type { RosterMemberView } from "@/components/app-shell";
import { BASE_POINTS_MAX, TOTAL_ASSIGNMENTS } from "@/lib/scoring";
import { defaultAvatarConfig } from "@/components/avatar";

function member(overrides: Partial<RosterMemberView> = {}): RosterMemberView {
  return {
    personId: 1,
    avatar: defaultAvatarConfig,
    isSelf: false,
    name: "Reader",
    isLeader: false,
    readToday: false,
    chapters: [],
    readingDates: [],
    ...overrides,
  };
}

describe("rosterContribution", () => {
  it("maps a regular roster member to a Connect member with no upstream role", () => {
    const contribution = rosterContribution(member({ personId: 42, isLeader: false, chapters: [5] }));
    expect(contribution).toEqual({
      rockPersonId: 42,
      completedAssignments: 1,
      isConnectMember: true,
      isConnectLeader: false,
      isRegionalLeader: false,
      isClusterHead: false,
      isDepartmentHead: false,
    });
  });

  it("maps a roster leader to isConnectLeader, never isConnectMember", () => {
    const contribution = rosterContribution(member({ personId: 7, isLeader: true }));
    expect(contribution.isConnectLeader).toBe(true);
    expect(contribution.isConnectMember).toBe(false);
  });
});

describe("scoreRoster", () => {
  it("does not unlock the 3D Campfire when no current Connect member or leader has completed a chapter", () => {
    // This is the exact failure the ticket bars: a group can carry a stale or
    // upstream-attributed check-in count elsewhere in the app, but nobody
    // presently on its own roster has read anything yet.
    const score = scoreRoster(101, [
      member({ personId: 1, isLeader: true, chapters: [] }),
      member({ personId: 2, isLeader: false, chapters: [] }),
    ]);
    expect(score.unlocked3dCampfire).toBe(false);
  });

  it("unlocks the 3D Campfire once a genuine Connect member has a completed assignment", () => {
    const score = scoreRoster(101, [
      member({ personId: 1, isLeader: false, chapters: [5] }),
    ]);
    expect(score.unlocked3dCampfire).toBe(true);
  });

  it("unlocks the 3D Campfire from a Connect Leader's own completed assignment too", () => {
    const score = scoreRoster(101, [
      member({ personId: 1, isLeader: true, chapters: [5] }),
    ]);
    expect(score.unlocked3dCampfire).toBe(true);
  });

  it("derives displayPoints from the same base-pool math scoreConnect uses, never from a locally invented formula", () => {
    const score = scoreRoster(101, [member({ personId: 1, isLeader: false, chapters: [5] })]);
    const expectedBasePoints = (1 / TOTAL_ASSIGNMENTS) * BASE_POINTS_MAX;
    expect(score.displayPoints).toBe(Math.round(expectedBasePoints));
  });

  it("passes empty regional/cluster pools, since this app has no upstream role data source yet", () => {
    const score = scoreRoster(101, [member({ personId: 1, isLeader: false, chapters: [5] })]);
    expect(score.regionalBonus).toBe(0);
    expect(score.clusterBonus).toBe(0);
  });
});

describe("withDisplayPoints", () => {
  it("stamps every roster member with the Connect's own already-rounded score.displayPoints, never a per-member recomputation", () => {
    const roster = [
      member({ personId: 1, isLeader: false, chapters: [5] }),
      member({ personId: 2, isLeader: true, chapters: [] }),
    ];
    const score = scoreRoster(101, roster);

    const stamped = withDisplayPoints(roster, score);

    expect(stamped.map((m) => m.displayPoints)).toEqual([score.displayPoints, score.displayPoints]);
    // Original roster objects are untouched.
    expect(roster[0].displayPoints).toBeUndefined();
  });
});
