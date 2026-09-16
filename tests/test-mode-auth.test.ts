import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/admin/access", () => ({
  resolveAdminScope: vi.fn(),
}));
vi.mock("@/lib/admin/stats", () => ({
  flattenGroupNodes: vi.fn(),
}));
vi.mock("@/lib/rock/client", () => ({
  getAllCampusNames: vi.fn(),
  getAllConnectGroups: vi.fn(),
}));
vi.mock("@/lib/rock/hierarchy", () => ({
  loadSectionSubtree: vi.fn(),
}));

import { flattenGroupNodes } from "@/lib/admin/stats";
import { resolveAdminScope } from "@/lib/admin/access";
import { getAllCampusNames, getAllConnectGroups } from "@/lib/rock/client";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import { canAccessRealTestGroup, getAuthorizedTestGroupOptions, isTestModeAuthorized } from "@/lib/test-mode-auth";

const session = {
  status: "ok" as const,
  rockPersonId: 7,
  rockGender: null,
  displayName: "Synthetic tester",
  memberships: [],
  sectionMemberships: [],
  activeGroup: null,
  needsGroupChoice: false,
  campusId: 1,
  isLeader: false,
  isAdminScope: true,
  defaultTranslation: "NET" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAllCampusNames).mockResolvedValue(new Map([[1, "Manila"]]));
  vi.mocked(getAllConnectGroups).mockResolvedValue([]);
  vi.mocked(loadSectionSubtree).mockResolvedValue([]);
  vi.mocked(flattenGroupNodes).mockReturnValue([]);
});

describe("Test Mode real-data authorization", () => {
  it("uses the server-resolved admin flag for Test Mode availability", () => {
    expect(isTestModeAuthorized({ ...session, isAdminScope: true })).toBe(true);
    expect(isTestModeAuthorized({ ...session, isAdminScope: false })).toBe(false);
  });

  it("loads only the caller's section subtree for a section-scoped tester", async () => {
    vi.mocked(resolveAdminScope).mockReturnValue({ kind: "sections", rootIds: [41] });
    vi.mocked(flattenGroupNodes).mockReturnValue([
      { id: 101, name: "Authorized group", campusId: 1, memberCount: 0, leaders: [] },
    ]);

    const options = await getAuthorizedTestGroupOptions(session);

    expect(options).toEqual([{ groupId: 101, groupName: "Authorized group — Manila" }]);
    expect(loadSectionSubtree).toHaveBeenCalledWith([41]);
    expect(getAllConnectGroups).not.toHaveBeenCalled();
  });

  it("rejects a forged group ID without authorizing it as a section child", async () => {
    vi.mocked(resolveAdminScope).mockReturnValue({ kind: "sections", rootIds: [41] });
    vi.mocked(flattenGroupNodes).mockReturnValue([
      { id: 101, name: "Authorized group", campusId: 1, memberCount: 0, leaders: [] },
    ]);

    await expect(canAccessRealTestGroup(session, 999)).resolves.toBe(false);
    expect(loadSectionSubtree).toHaveBeenCalledWith([41]);
  });

  it("lets a global admin read the global Connect list", async () => {
    vi.mocked(resolveAdminScope).mockReturnValue({ kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] });
    vi.mocked(getAllConnectGroups).mockResolvedValue([
      { Id: 202, Name: "Global group", GroupTypeId: 25, CampusId: 1, ParentGroupId: null, IsActive: true, IsArchived: false, locality: null },
    ]);

    await expect(getAuthorizedTestGroupOptions(session)).resolves.toEqual([
      { groupId: 202, groupName: "Global group — Manila" },
    ]);
    expect(loadSectionSubtree).not.toHaveBeenCalled();
  });
});
