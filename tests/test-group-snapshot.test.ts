import { describe, expect, it, vi, beforeEach } from "vitest";

import { getTestGroupSnapshot } from "@/app/actions/getTestGroupSnapshot";

vi.mock("@/lib/session", () => ({
  getSessionContext: vi.fn(),
}));

vi.mock("@/lib/test-mode-config", () => ({
  testWritableGroupId: vi.fn(() => null),
}));

vi.mock("@/lib/rock/client", () => ({
  getGroupBasic: vi.fn(),
  getRoster: vi.fn(),
  getCampusName: vi.fn(),
}));

vi.mock("@/lib/data/stats", () => ({
  getGroupStats: vi.fn(),
  getGroupMembersReadingHistory: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
}));

describe("getTestGroupSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const result = await getTestGroupSnapshot({ groupId: 87177 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/production/i);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("refuses when caller is not admin scope", async () => {
    const { getSessionContext } = await import("@/lib/session");
    vi.mocked(getSessionContext).mockResolvedValueOnce({
      status: "ok",
      rockPersonId: 123,
      rockGender: null,
      displayName: "Non-Admin",
      memberships: [],
      sectionMemberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      campusId: 1,
      isLeader: false,
      isAdminScope: false,
      defaultTranslation: "NET",
    });

    const result = await getTestGroupSnapshot({ groupId: 87177 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/admin/i);
    }
  });

  it("returns an explicit error when group is unknown", async () => {
    const { getSessionContext } = await import("@/lib/session");
    const { getGroupBasic } = await import("@/lib/rock/client");

    vi.mocked(getSessionContext).mockResolvedValueOnce({
      status: "ok",
      rockPersonId: 123,
      rockGender: null,
      displayName: "Admin",
      memberships: [],
      sectionMemberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      campusId: 1,
      isLeader: false,
      isAdminScope: true,
      defaultTranslation: "NET",
    });
    vi.mocked(getGroupBasic).mockResolvedValueOnce(null);

    const result = await getTestGroupSnapshot({ groupId: 99999 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
  });

  /**
   * The picker only offers campus Connect Groups plus the sandbox, but a
   * server action is a directly callable HTTP endpoint, so the action must
   * enforce that scope itself rather than trusting its caller.
   */
  const okSession = {
    status: "ok" as const,
    rockPersonId: 123,
    rockGender: null,
    displayName: "Admin",
    memberships: [],
    sectionMemberships: [],
    activeGroup: null,
    needsGroupChoice: false,
    campusId: 1,
    isLeader: false,
    isAdminScope: true,
    defaultTranslation: "NET" as const,
  };

  it("refuses a group that is not a Connect Group (GT25)", async () => {
    const { getSessionContext } = await import("@/lib/session");
    const { getGroupBasic } = await import("@/lib/rock/client");

    vi.mocked(getSessionContext).mockResolvedValueOnce(okSession);
    vi.mocked(getGroupBasic).mockResolvedValueOnce({
      Id: 23870,
      Name: "A GT24 section, not a Connect Group",
      GroupTypeId: 24,
      CampusId: 1,
      ParentGroupId: null,
      IsActive: true,
      IsArchived: false,
      locality: null,
    });

    const result = await getTestGroupSnapshot({ groupId: 23870 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not a Connect Group/i);
  });

  it("refuses a Connect Group at another campus when it is not the sandbox", async () => {
    const { getSessionContext } = await import("@/lib/session");
    const { getGroupBasic } = await import("@/lib/rock/client");

    vi.mocked(getSessionContext).mockResolvedValueOnce(okSession);
    vi.mocked(getGroupBasic).mockResolvedValueOnce({
      Id: 24999,
      Name: "Another campus's group",
      GroupTypeId: 25,
      CampusId: 2,
      ParentGroupId: null,
      IsActive: true,
      IsArchived: false,
      locality: null,
    });

    const result = await getTestGroupSnapshot({ groupId: 24999 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not at your campus/i);
  });

  it("allows the sandbox group even though it sits on another campus", async () => {
    const { getSessionContext } = await import("@/lib/session");
    const { getGroupBasic, getRoster } = await import("@/lib/rock/client");
    const { testWritableGroupId } = await import("@/lib/test-mode-config");

    vi.mocked(getSessionContext).mockResolvedValueOnce(okSession);
    vi.mocked(testWritableGroupId).mockReturnValueOnce(87177);
    vi.mocked(getGroupBasic).mockResolvedValueOnce({
      Id: 87177,
      Name: "TEST // Connect Group",
      GroupTypeId: 25,
      // Campus 5 (OPEN ACCESS), deliberately not the caller's campus 1.
      CampusId: 5,
      ParentGroupId: null,
      IsActive: true,
      IsArchived: false,
      locality: null,
    });
    // Empty roster short-circuits before the data layer; the point of this test
    // is that it got PAST the campus check, not what it returns after.
    vi.mocked(getRoster).mockResolvedValueOnce([]);

    const result = await getTestGroupSnapshot({ groupId: 87177 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/empty roster/i);
  });

  it("returns an explicit error when group roster is empty (A1)", async () => {
    const { getSessionContext } = await import("@/lib/session");
    const { getGroupBasic, getRoster } = await import("@/lib/rock/client");

    vi.mocked(getSessionContext).mockResolvedValueOnce({
      status: "ok",
      rockPersonId: 123,
      rockGender: null,
      displayName: "Admin",
      memberships: [],
      sectionMemberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      campusId: 1,
      isLeader: false,
      isAdminScope: true,
      defaultTranslation: "NET",
    });
    vi.mocked(getGroupBasic).mockResolvedValueOnce({
      Id: 87177,
      Name: "Sandbox Group",
      GroupTypeId: 25,
      CampusId: 1,
      ParentGroupId: null,
      IsActive: true,
      IsArchived: false,
      locality: null,
    });
    vi.mocked(getRoster).mockResolvedValueOnce([]);

    const result = await getTestGroupSnapshot({ groupId: 87177 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/empty/i);
    }
  });

  it("returns group snapshot for a valid group with members", async () => {
    const { getSessionContext } = await import("@/lib/session");
    const { getGroupBasic, getRoster, getCampusName } = await import("@/lib/rock/client");
    const { getGroupStats, getGroupMembersReadingHistory } = await import("@/lib/data/stats");

    vi.mocked(getSessionContext).mockResolvedValueOnce({
      status: "ok",
      rockPersonId: 123,
      rockGender: null,
      displayName: "Admin",
      memberships: [],
      sectionMemberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      campusId: 1,
      isLeader: false,
      isAdminScope: true,
      defaultTranslation: "NET",
    });
    vi.mocked(getGroupBasic).mockResolvedValueOnce({
      Id: 87177,
      Name: "Sandbox GT25",
      GroupTypeId: 25,
      // Must match the session's campusId (1). A group at another campus is
      // refused now unless it is the configured sandbox -- see the scope tests
      // above.
      CampusId: 1,
      ParentGroupId: null,
      IsActive: true,
      IsArchived: false,
      locality: null,
    });
    vi.mocked(getCampusName).mockResolvedValueOnce("Downtown Campus");
    vi.mocked(getRoster).mockResolvedValueOnce([
      {
        Id: 1,
        GroupId: 87177,
        PersonId: 555,
        GroupRoleId: 24, // Leader
        GroupMemberStatus: 1,
        Person: {
          Id: 555,
          FirstName: "Test",
          NickName: "Tester",
          LastName: "Leader",
          Gender: 1,
          PrimaryCampusId: 2,
        },
      },
    ]);
    vi.mocked(getGroupMembersReadingHistory).mockResolvedValueOnce(
      new Map([
        [555, { chapters: [1, 2], dates: ["2026-10-01", "2026-10-02"] }],
      ]),
    );
    vi.mocked(getGroupStats).mockResolvedValueOnce({
      checkinCount: 2,
      memberCount: 1,
      ratio: 2,
      readersTodayIds: [555],
    });

    const result = await getTestGroupSnapshot({ groupId: 87177 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.groupName).toBe("Sandbox GT25");
      expect(result.campusName).toBe("Downtown Campus");
      expect(result.roster).toHaveLength(1);
      expect(result.roster[0].personId).toBe(555);
      expect(result.roster[0].isLeader).toBe(true);
      expect(result.roster[0].readToday).toBe(true);
      expect(result.roster[0].chapters).toEqual([1, 2]);
      expect(result.groupStats.checkinCount).toBe(2);
    }
  });
});
