import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  resolveAdminScope: vi.fn(),
  loadSectionSubtree: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/lib/admin/access", () => ({ resolveAdminScope: mocks.resolveAdminScope }));
vi.mock("@/lib/rock/hierarchy", () => ({ loadSectionSubtree: mocks.loadSectionSubtree }));
vi.mock("@/db/schema", () => ({ joinCodes: { groupId: "groupId", code: "code" } }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

import { getJoinCodeForGroup } from "@/app/actions/getJoinCodeForGroup";

const leaderSession = {
  status: "ok" as const,
  rockPersonId: 13358,
  memberships: [{ groupId: 101, groupName: "Alpha", campusId: 1, roleId: 23, isLeader: true }],
};

const nonLeaderSession = {
  status: "ok" as const,
  rockPersonId: 55555,
  memberships: [{ groupId: 202, groupName: "Beta", campusId: 2, roleId: 24, isLeader: false }],
};

describe("getJoinCodeForGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.limit.mockResolvedValue([]);
    mocks.where.mockReturnValue({ limit: mocks.limit });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });
  });

  it("rejects a caller with no session", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "logged-out" });
    await expect(getJoinCodeForGroup(101)).resolves.toEqual({
      ok: false,
      error: "You need to be logged in.",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("rejects a caller with no admin scope who does not lead the group", async () => {
    mocks.getSessionContext.mockResolvedValue(nonLeaderSession);
    mocks.resolveAdminScope.mockReturnValue(null);
    await expect(getJoinCodeForGroup(101)).resolves.toEqual({
      ok: false,
      error: "You don't have access to this group's join code.",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("allows an admin-scope viewer even without leading the group", async () => {
    mocks.getSessionContext.mockResolvedValue(nonLeaderSession);
    mocks.resolveAdminScope.mockReturnValue({ kind: "global", rootIds: [1] });
    mocks.limit.mockResolvedValue([{ groupId: 101, code: "ABCD" }]);
    await expect(getJoinCodeForGroup(101)).resolves.toEqual({ ok: true, code: "ABCD" });
  });

  it("refuses a section-scoped viewer a groupId outside their subtree", async () => {
    mocks.getSessionContext.mockResolvedValue(nonLeaderSession);
    mocks.resolveAdminScope.mockReturnValue({ kind: "sections", rootIds: [23869] });
    mocks.loadSectionSubtree.mockResolvedValue([
      {
        id: 23869,
        name: "Cluster // Cielo Pabalan & Peejay Pabalan",
        campusId: null,
        children: [],
        groups: [{ id: 9001, name: "In-scope group", campusId: 1, memberCount: 0, leaders: [] }],
      },
    ]);
    await expect(getJoinCodeForGroup(24077)).resolves.toEqual({
      ok: false,
      error: "You don't have access to this group's join code.",
    });
    expect(mocks.loadSectionSubtree).toHaveBeenCalledWith([23869]);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("allows a section-scoped viewer a groupId inside their subtree", async () => {
    mocks.getSessionContext.mockResolvedValue(nonLeaderSession);
    mocks.resolveAdminScope.mockReturnValue({ kind: "sections", rootIds: [23869] });
    mocks.loadSectionSubtree.mockResolvedValue([
      {
        id: 23869,
        name: "Cluster // Cielo Pabalan & Peejay Pabalan",
        campusId: null,
        children: [],
        groups: [{ id: 9001, name: "In-scope group", campusId: 1, memberCount: 0, leaders: [] }],
      },
    ]);
    mocks.limit.mockResolvedValue([{ groupId: 9001, code: "OKAY" }]);
    await expect(getJoinCodeForGroup(9001)).resolves.toEqual({ ok: true, code: "OKAY" });
  });

  it("allows a leader of the group with no admin scope", async () => {
    mocks.getSessionContext.mockResolvedValue(leaderSession);
    mocks.resolveAdminScope.mockReturnValue(null);
    mocks.limit.mockResolvedValue([{ groupId: 101, code: "WXYZ" }]);
    await expect(getJoinCodeForGroup(101)).resolves.toEqual({ ok: true, code: "WXYZ" });
  });

  it("returns null code when the group has no join code yet, without inserting one", async () => {
    mocks.getSessionContext.mockResolvedValue(leaderSession);
    mocks.resolveAdminScope.mockReturnValue(null);
    mocks.limit.mockResolvedValue([]);
    await expect(getJoinCodeForGroup(101)).resolves.toEqual({ ok: true, code: null });
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid group id", async () => {
    mocks.getSessionContext.mockResolvedValue(leaderSession);
    mocks.resolveAdminScope.mockReturnValue(null);
    await expect(getJoinCodeForGroup(-1)).resolves.toEqual({ ok: false, error: "Invalid group ID." });
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
