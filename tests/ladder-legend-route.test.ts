import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  getGroupBasic: vi.fn(),
  getRoster: vi.fn(),
  getGroupMembersReadingHistory: vi.fn(),
  resolveAdminScope: vi.fn(),
  isGroupInScope: vi.fn(),
  timezoneForCampus: vi.fn(),
  todayInTimezone: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/lib/rock/client", () => ({
  getGroupBasic: mocks.getGroupBasic,
  getRoster: mocks.getRoster,
  isGroupInScope: mocks.isGroupInScope,
}));
vi.mock("@/lib/data/stats", () => ({
  getGroupMembersReadingHistory: mocks.getGroupMembersReadingHistory,
  todayInTimezone: mocks.todayInTimezone,
}));
vi.mock("@/lib/admin/access", () => ({ resolveAdminScope: mocks.resolveAdminScope }));
vi.mock("@/lib/campus-timezones", () => ({ timezoneForCampus: mocks.timezoneForCampus }));
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

function activeConnect(id = 23857) {
  return {
    Id: id,
    Name: "Some Connect",
    GroupTypeId: 25,
    CampusId: 1,
    ParentGroupId: 23856,
    IsActive: true,
    IsArchived: false,
    locality: null,
  };
}

// Known-bad behavior 3 (issue #151): a leader must not be able to reach a
// Connect outside their actual jurisdiction. This route is the enforcement
// point once the town view is promoted -- the client-side jurisdiction tree
// (LadderTownView's `roots`) is a presentation convenience, not the
// boundary.
describe("ladder legend jurisdiction authorization", () => {
  afterEach(() => vi.clearAllMocks());

  it("denies a section-scoped leader a Connect outside their resolved jurisdiction", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "ok", memberships: [] });
    mocks.getGroupBasic.mockResolvedValue(activeConnect());
    mocks.resolveAdminScope.mockReturnValue({ kind: "sections", rootIds: [23870] });
    mocks.isGroupInScope.mockResolvedValue(false);

    const response = await GET(request());

    expect(mocks.isGroupInScope).toHaveBeenCalledWith(23857, [23870]);
    expect(response.status).toBe(403);
    expect(mocks.getRoster).not.toHaveBeenCalled();
  });

  it("authorizes a section-scoped leader for a Connect resolved inside their jurisdiction", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "ok", memberships: [] });
    mocks.getGroupBasic.mockResolvedValue(activeConnect());
    mocks.resolveAdminScope.mockReturnValue({ kind: "sections", rootIds: [23870] });
    mocks.isGroupInScope.mockResolvedValue(true);
    mocks.getRoster.mockResolvedValue([]);
    mocks.getGroupMembersReadingHistory.mockResolvedValue(new Map());
    mocks.todayInTimezone.mockReturnValue("2026-10-05");

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.getRoster).toHaveBeenCalledOnce();
  });

  it("authorizes any Connect for a global-scope admin without walking ancestry", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "ok", memberships: [] });
    mocks.getGroupBasic.mockResolvedValue(activeConnect());
    mocks.resolveAdminScope.mockReturnValue({ kind: "global", rootIds: [1] });
    mocks.getRoster.mockResolvedValue([]);
    mocks.getGroupMembersReadingHistory.mockResolvedValue(new Map());
    mocks.todayInTimezone.mockReturnValue("2026-10-05");

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.isGroupInScope).not.toHaveBeenCalled();
  });

  it("denies an ordinary member no admin scope and no membership in the requested Connect", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "ok", memberships: [{ groupId: 1 }] });
    mocks.getGroupBasic.mockResolvedValue(activeConnect(23857));
    mocks.resolveAdminScope.mockReturnValue(null);

    const response = await GET(request("23857"));

    expect(response.status).toBe(403);
    expect(mocks.isGroupInScope).not.toHaveBeenCalled();
  });
});
