/**
 * Issue #150: `resolveConnectScore` turns current Rock roster/role state and
 * stored check-in facts into the `PersonContribution[]` inputs the pinned
 * `scoreConnect` contract (lib/scoring.ts) needs. `lib/scoring.ts` already has
 * its own math-only regression suite (tests/scoring.test.ts); this file
 * covers the resolver's own job: walking the ancestor chain, splitting
 * section leaders into the right pool, and reading a person's completed
 * assignments from every stored check-in rather than just this group's.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rock/client", () => ({
  getGroupBasic: vi.fn(),
  getRoster: vi.fn(),
  getSectionLeaders: vi.fn(),
  resolveUpwardScope: vi.fn(),
}));

let checkinRows: Array<{ rockPersonId: number; chapter: number }> = [];
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(checkinRows)),
      })),
    })),
  },
}));

import {
  combineStageUpward,
  resolveConnectBasePoints,
  resolveConnectScore,
} from "@/lib/connect-scoring";
import { completedAssignmentsCount, TOTAL_ASSIGNMENTS } from "@/lib/plan";
import { countsInBase } from "@/lib/scoring";
import { getGroupBasic, getRoster, getSectionLeaders, resolveUpwardScope } from "@/lib/rock/client";

const CONNECT_GROUP_ID = 24100;
const REGION_ID = 23870;
const CLUSTER_ID = 23869;
const DEPARTMENT_ID = 78;
const CAMPUS_ROOT_ID = 39;
const GLOBAL_ROOT_ID = 22464;

function group(id: number, groupTypeId: number, overrides: Partial<{ IsActive: boolean; IsArchived: boolean }> = {}) {
  return {
    Id: id,
    Name: `Group ${id}`,
    GroupTypeId: groupTypeId,
    CampusId: 1,
    ParentGroupId: null,
    IsActive: true,
    IsArchived: false,
    locality: null,
    ...overrides,
  };
}

function member(personId: number, groupRoleId: number, name = `Person ${personId}`) {
  return {
    Id: 900000 + personId,
    PersonId: personId,
    GroupId: CONNECT_GROUP_ID,
    GroupRoleId: groupRoleId,
    GroupMemberStatus: 1,
    Person: { Id: personId, NickName: name, FirstName: name, LastName: "", PrimaryCampusId: 1 },
  };
}

const FULL_CHAIN = [
  group(CONNECT_GROUP_ID, 25),
  group(REGION_ID, 24),
  group(CLUSTER_ID, 24),
  group(DEPARTMENT_ID, 24),
  group(CAMPUS_ROOT_ID, 24),
  group(GLOBAL_ROOT_ID, 24),
];

const ROLE_MEMBER = 23;
const ROLE_LEADER = 24;
const ROLE_ASSISTANT_LEADER = 81;

/** Chapter 5 is a genuine single-chapter plan day (day 3) -- exactly one completed assignment. */
const ONE_ASSIGNMENT_CHAPTERS = [5];
/** Every chapter, so completedAssignmentsCount(...) === TOTAL_ASSIGNMENTS. */
const ALL_CHAPTERS = Array.from({ length: 28 }, (_, i) => i + 1);

beforeEach(() => {
  vi.resetAllMocks();
  checkinRows = [];
  vi.mocked(getGroupBasic).mockResolvedValue(group(CONNECT_GROUP_ID, 25));
  vi.mocked(getRoster).mockResolvedValue([]);
  vi.mocked(getSectionLeaders).mockResolvedValue([]);
  vi.mocked(resolveUpwardScope).mockResolvedValue(FULL_CHAIN);
});

describe("resolveConnectScore group validity", () => {
  it("returns null when the group is not a Connect Group", async () => {
    vi.mocked(getGroupBasic).mockResolvedValue(group(REGION_ID, 24));
    expect(await resolveConnectScore(REGION_ID)).toBeNull();
  });

  it("returns null when the group does not exist", async () => {
    vi.mocked(getGroupBasic).mockResolvedValue(null);
    expect(await resolveConnectScore(CONNECT_GROUP_ID)).toBeNull();
  });

  it("returns null when the group is inactive or archived", async () => {
    vi.mocked(getGroupBasic).mockResolvedValue(group(CONNECT_GROUP_ID, 25, { IsActive: false }));
    expect(await resolveConnectScore(CONNECT_GROUP_ID)).toBeNull();

    vi.mocked(getGroupBasic).mockResolvedValue(group(CONNECT_GROUP_ID, 25, { IsArchived: true }));
    expect(await resolveConnectScore(CONNECT_GROUP_ID)).toBeNull();
  });
});

describe("resolveConnectScore membership and reading facts", () => {
  it("reads a person's total completed assignments from every stored check-in, not scoped to this group", async () => {
    vi.mocked(getRoster).mockResolvedValue([member(1, ROLE_MEMBER)]);
    checkinRows = ALL_CHAPTERS.map((chapter) => ({ rockPersonId: 1, chapter }));

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);

    expect(resolved).not.toBeNull();
    expect(resolved!.score.contributions[0].completedAssignments).toBe(
      completedAssignmentsCount(ALL_CHAPTERS),
    );
    expect(resolved!.score.contributions[0].completedAssignments).toBe(TOTAL_ASSIGNMENTS);
  });

  it("marks Leader and Assistant Leader roles as isConnectLeader, Member as not", async () => {
    vi.mocked(getRoster).mockResolvedValue([
      member(1, ROLE_MEMBER),
      member(2, ROLE_LEADER),
      member(3, ROLE_ASSISTANT_LEADER),
    ]);

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);
    const byId = new Map(resolved!.score.contributions.map((row) => [row.rockPersonId, row]));

    expect(byId.get(1)!.isConnectLeader).toBe(false);
    expect(byId.get(2)!.isConnectLeader).toBe(true);
    expect(byId.get(3)!.isConnectLeader).toBe(true);
    expect(byId.get(1)!.isConnectMember).toBe(true);
  });

  it("gives someone with no check-in rows zero completed assignments rather than throwing", async () => {
    vi.mocked(getRoster).mockResolvedValue([member(1, ROLE_MEMBER)]);
    checkinRows = [];

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);
    expect(resolved!.score.contributions[0].completedAssignments).toBe(0);
  });
});

describe("resolveConnectScore upstream pools", () => {
  it("resolves Region, Cluster, and Department by fixed position in the ancestor chain", async () => {
    vi.mocked(getSectionLeaders).mockImplementation(async (groupId: number) => {
      if (groupId === REGION_ID) return [member(9, ROLE_LEADER, "Regional Leader")];
      if (groupId === CLUSTER_ID) return [member(8, ROLE_LEADER, "Cluster Head")];
      if (groupId === DEPARTMENT_ID) return [member(7, ROLE_LEADER, "Department Head")];
      throw new Error(`unexpected section id ${groupId}`);
    });
    vi.mocked(getRoster).mockResolvedValue([member(1, ROLE_MEMBER)]);
    checkinRows = [
      ...ONE_ASSIGNMENT_CHAPTERS.map((chapter) => ({ rockPersonId: 9, chapter })),
      { rockPersonId: 8, chapter: 5 },
    ];

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);

    expect(getSectionLeaders).toHaveBeenCalledWith(REGION_ID);
    expect(getSectionLeaders).toHaveBeenCalledWith(CLUSTER_ID);
    expect(getSectionLeaders).toHaveBeenCalledWith(DEPARTMENT_ID);

    const byId = new Map(resolved!.score.contributions.map((row) => [row.rockPersonId, row]));
    expect(byId.get(9)!.isRegionalLeader).toBe(true);
    expect(byId.get(8)!.isClusterHead).toBe(true);
    // Department Heads have no pool: they never appear as a standalone
    // contribution unless they are also a member or another pool's leader.
    expect(byId.has(7)).toBe(false);
    expect(resolved!.score.regionalBonus).toBeGreaterThan(0);
    expect(resolved!.score.clusterBonus).toBeGreaterThan(0);
  });

  it("names regional and cluster leaders for the upstream-only Leaders section", async () => {
    vi.mocked(getSectionLeaders).mockImplementation(async (groupId: number) => {
      if (groupId === REGION_ID) return [member(9, ROLE_LEADER, "Regional Leader")];
      return [];
    });

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);
    expect(resolved!.leaderNames.get(9)).toBe("Regional Leader");
  });

  it("excludes a Regional Leader who is merely an ordinary member from the base pool, but keeps their bonus pool contribution", async () => {
    vi.mocked(getSectionLeaders).mockImplementation(async (groupId: number) =>
      groupId === REGION_ID ? [member(9, ROLE_LEADER)] : [],
    );
    vi.mocked(getRoster).mockResolvedValue([member(1, ROLE_MEMBER), member(9, ROLE_MEMBER)]);
    checkinRows = ALL_CHAPTERS.map((chapter) => ({ rockPersonId: 9, chapter }));

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);
    const visitor = resolved!.score.contributions.find((row) => row.rockPersonId === 9)!;

    expect(countsInBase(visitor)).toBe(false);
    expect(visitor.isRegionalLeader).toBe(true);
    expect(resolved!.score.regionalBonus).toBeGreaterThan(0);
  });

  it("lets a person hold both Regional and Cluster roles, participating in both pools", async () => {
    vi.mocked(getSectionLeaders).mockImplementation(async (groupId: number) => {
      if (groupId === REGION_ID) return [member(9, ROLE_LEADER)];
      if (groupId === CLUSTER_ID) return [member(9, ROLE_LEADER)];
      return [];
    });
    checkinRows = ALL_CHAPTERS.map((chapter) => ({ rockPersonId: 9, chapter }));

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);
    const dual = resolved!.score.contributions.find((row) => row.rockPersonId === 9)!;

    expect(dual.isRegionalLeader).toBe(true);
    expect(dual.isClusterHead).toBe(true);
    expect(resolved!.score.regionalBonus).toBeCloseTo(75, 5);
    expect(resolved!.score.clusterBonus).toBeCloseTo(75, 5);
  });

  it("does not duplicate a Connect Leader who also holds an upstream role", async () => {
    vi.mocked(getRoster).mockResolvedValue([member(9, ROLE_LEADER)]);
    vi.mocked(getSectionLeaders).mockImplementation(async (groupId: number) =>
      groupId === REGION_ID ? [member(9, ROLE_LEADER)] : [],
    );
    checkinRows = ALL_CHAPTERS.map((chapter) => ({ rockPersonId: 9, chapter }));

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);
    const rows = resolved!.score.contributions.filter((row) => row.rockPersonId === 9);

    expect(rows).toHaveLength(1);
    expect(rows[0].isConnectLeader).toBe(true);
    expect(rows[0].isRegionalLeader).toBe(true);
    expect(countsInBase(rows[0])).toBe(true);
  });

  it("skips section-leader lookups entirely when the ancestor chain is shorter than expected", async () => {
    vi.mocked(resolveUpwardScope).mockResolvedValue([group(CONNECT_GROUP_ID, 25)]);
    vi.mocked(getRoster).mockResolvedValue([member(1, ROLE_MEMBER)]);

    const resolved = await resolveConnectScore(CONNECT_GROUP_ID);

    expect(getSectionLeaders).not.toHaveBeenCalled();
    expect(resolved!.score.regionalBonus).toBe(0);
    expect(resolved!.score.clusterBonus).toBe(0);
  });
});

describe("resolveConnectBasePoints", () => {
  it("computes base points from the roster alone, without walking ancestors or section leaders", async () => {
    vi.mocked(getRoster).mockResolvedValue([member(1, ROLE_MEMBER)]);
    checkinRows = ALL_CHAPTERS.map((chapter) => ({ rockPersonId: 1, chapter }));

    const result = await resolveConnectBasePoints(CONNECT_GROUP_ID);

    expect(result).not.toBeNull();
    expect(result!.stage).toBe("Mansion");
    expect(resolveUpwardScope).not.toHaveBeenCalled();
    expect(getSectionLeaders).not.toHaveBeenCalled();
  });

  it("returns null for the same invalid-group cases as the full resolver", async () => {
    vi.mocked(getGroupBasic).mockResolvedValue(null);
    expect(await resolveConnectBasePoints(CONNECT_GROUP_ID)).toBeNull();
  });
});

describe("combineStageUpward", () => {
  it("keeps the higher of the two stages, regardless of argument order", () => {
    expect(combineStageUpward("Cabin", "Trailer")).toBe("Cabin");
    expect(combineStageUpward("Trailer", "Cabin")).toBe("Cabin");
  });

  it("never drops below what is already displayed", () => {
    expect(combineStageUpward("Mansion", "Tent")).toBe("Mansion");
  });

  it("is a no-op when both sides agree", () => {
    expect(combineStageUpward("Condo", "Condo")).toBe("Condo");
  });
});
