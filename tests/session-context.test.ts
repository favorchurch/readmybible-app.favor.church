import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  getMemberships: vi.fn(),
  getSectionMemberships: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/rock/client", () => ({
  getPerson: mocks.getPerson,
  getMemberships: mocks.getMemberships,
  getSectionMemberships: mocks.getSectionMemberships,
}));
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: vi.fn() }, AUTH0_CLAIM_NAMESPACE: "https://favor.church" }));
vi.mock("@/db/schema", () => ({ profiles: { rockPersonId: "rockPersonId" } }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

import { getSessionContext } from "@/lib/session";

describe("getSessionContext active-role state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_MOCK_PERSON_ID", "13358");
    mocks.getPerson.mockResolvedValue({ Id: 13358, NickName: "Alex", FirstName: "Alex", Gender: 1, PrimaryCampusId: 1 });
    mocks.getMemberships.mockResolvedValue([
      { GroupId: 101, GroupRoleId: 24, Group: { Name: "Leader group", CampusId: 1 } },
      { GroupId: 202, GroupRoleId: 23, Group: { Name: "Member group", CampusId: 2 } },
    ]);
    mocks.getSectionMemberships.mockResolvedValue([]);
    mocks.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [{ rockPersonId: 13358, activeGroupId: 202, displayName: "Alex" }],
        }),
      }),
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("derives leader navigation from the active membership only", async () => {
    const result = await getSessionContext();

    expect(result).toMatchObject({
      status: "ok",
      activeGroup: { groupId: 202, isLeader: false },
      isLeader: false,
      needsGroupChoice: false,
    });
  });

  it("keeps leader navigation for an active leader membership", async () => {
    mocks.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [{ rockPersonId: 13358, activeGroupId: 101, displayName: "Alex" }],
        }),
      }),
    });

    const result = await getSessionContext();

    expect(result).toMatchObject({ activeGroup: { groupId: 101, isLeader: true }, isLeader: true });
  });
});
