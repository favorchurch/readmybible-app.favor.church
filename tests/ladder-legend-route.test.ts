import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  getGroupBasic: vi.fn(),
  getRoster: vi.fn(),
  getGroupMembersReadingHistory: vi.fn(),
  resolveAdminScope: vi.fn(),
  loadSectionSubtree: vi.fn(),
  flattenGroupNodes: vi.fn(),
  timezoneForCampus: vi.fn(),
  todayInTimezone: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/lib/rock/client", () => ({ getGroupBasic: mocks.getGroupBasic, getRoster: mocks.getRoster }));
vi.mock("@/lib/data/stats", () => ({
  getGroupMembersReadingHistory: mocks.getGroupMembersReadingHistory,
  todayInTimezone: mocks.todayInTimezone,
}));
vi.mock("@/lib/admin/access", () => ({ resolveAdminScope: mocks.resolveAdminScope }));
vi.mock("@/lib/admin/stats", () => ({ flattenGroupNodes: mocks.flattenGroupNodes }));
vi.mock("@/lib/campus-timezones", () => ({ timezoneForCampus: mocks.timezoneForCampus }));
vi.mock("@/lib/rock/hierarchy", () => ({ loadSectionSubtree: mocks.loadSectionSubtree }));
vi.mock("@/lib/rock/constants", () => ({ GROUP_TYPE_CONNECT_GROUP: 25 }));
vi.mock("server-only", () => ({}));

import { GET } from "@/app/ladder/legend/route";
import { NextRequest } from "next/server";

function request(groupId = "23857") {
  return new NextRequest(`http://localhost/ladder/legend?groupId=${groupId}`);
}

describe("ladder legend reachability", () => {
  // Issue 151 promotes the town view (and this legend it depends on) to
  // production for authorized leaders. Gating moved to proxy.ts (see
  // tests/ladder-gate.test.ts), which runs before this route -- so the
  // route itself must proceed to session/Rock regardless of NODE_ENV. An
  // earlier version of this test asserted the opposite (blanket 404 in
  // production before touching session), which was correct only while the
  // route was still dev-only.
  it("reaches session and Rock in production -- gating is proxy.ts's job, not the route's", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.getSessionContext.mockResolvedValue({ status: "ok", memberships: [] });
    mocks.getGroupBasic.mockResolvedValue({
      Id: 23857,
      Name: "Active Connect",
      GroupTypeId: 25,
      CampusId: 1,
      ParentGroupId: 23856,
      IsActive: true,
      IsArchived: false,
      locality: null,
    });
    mocks.resolveAdminScope.mockReturnValue(null);
    try {
      await GET(request());
      expect(mocks.getSessionContext).toHaveBeenCalledOnce();
      expect(mocks.getGroupBasic).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    }
  });

  it("returns HTTP 404 for inactive Connect groups", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mocks.getSessionContext.mockResolvedValue({ status: "ok" });
    mocks.getGroupBasic.mockResolvedValue({
      Id: 23857,
      Name: "Inactive Connect",
      GroupTypeId: 25,
      CampusId: 1,
      ParentGroupId: 23856,
      IsActive: false,
      IsArchived: false,
      locality: null,
    });
    try {
      const response = await GET(request());
      expect(response.status).toBe(404);
      expect(mocks.getGroupBasic).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    }
  });

  it("returns HTTP 404 for archived Connect groups", async () => {
    vi.stubEnv("NODE_ENV", "test");
    mocks.getSessionContext.mockResolvedValue({ status: "ok" });
    mocks.getGroupBasic.mockResolvedValue({
      Id: 23857,
      Name: "Archived Connect",
      GroupTypeId: 25,
      CampusId: 1,
      ParentGroupId: 23856,
      IsActive: true,
      IsArchived: true,
      locality: null,
    });
    try {
      const response = await GET(request());
      expect(response.status).toBe(404);
      expect(mocks.getGroupBasic).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    }
  });
});
