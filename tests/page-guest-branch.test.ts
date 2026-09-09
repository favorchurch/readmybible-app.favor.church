import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  select: vi.fn(),
  // AppShell is a "use client" component with a heavy tree of its own; the
  // branching test only needs to know Page() reached it, not how it renders.
  AppShellMarker: () => null,
  // WelcomeLanding's own markup (anchor target, sample-content labelling,
  // image dimensions) is covered separately in welcome-landing.test.ts; this
  // file only asserts Page() selects it for the logged-out branch.
  WelcomeLandingMarker: () => null,
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/db/schema", () => ({ profiles: { rockPersonId: "rockPersonId" } }));
vi.mock("@/lib/dev-clock", () => ({ devMockToday: () => null }));
vi.mock("@/lib/test-mode-config", () => ({ testWritableGroupId: () => null }));
vi.mock("@/lib/rock/client", () => ({
  getAllConnectGroups: vi.fn().mockResolvedValue([]),
  getAllCampusNames: vi.fn().mockResolvedValue(new Map()),
  getGroupBasic: vi.fn().mockResolvedValue(null),
  getRoster: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/rock/constants", () => ({ GROUP_TYPE_CONNECT_GROUP: 25 }));
vi.mock("@/lib/data/stats", () => ({
  getCampusBoard: vi.fn().mockResolvedValue([]),
  getGroupMembersReadingHistory: vi.fn().mockResolvedValue(new Map()),
  getGroupStats: vi.fn().mockResolvedValue(null),
  getPersonReadingState: vi.fn().mockResolvedValue({ chapters: [], dates: [] }),
}));
vi.mock("@/components/avatar", () => ({
  isAvatarConfig: () => false,
  resolveAvatar: () => ({}),
}));
vi.mock("@/components/app-shell", () => ({ AppShell: mocks.AppShellMarker }));
vi.mock("@/components/welcome", () => ({ WelcomeLanding: mocks.WelcomeLandingMarker }));

import Page from "@/app/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: async () => [],
      }),
    }),
  });
});

describe("Page() session branching", () => {
  it("renders WelcomeLanding for a logged-out visitor instead of redirecting", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "logged-out" });

    const result = await Page();

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect((result as { type: unknown }).type).toBe(mocks.WelcomeLandingMarker);
  });

  it("still redirects to /not-found-in-rock when the person has no Rock record", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "not-found-in-rock" });

    await expect(Page()).rejects.toThrow("REDIRECT:/not-found-in-rock");
    expect(mocks.redirect).toHaveBeenCalledWith("/not-found-in-rock");
  });

  it("renders AppShell, not WelcomeLanding, for an authenticated session", async () => {
    mocks.getSessionContext.mockResolvedValue({
      status: "ok",
      rockPersonId: 13358,
      rockGender: 1,
      displayName: "Alex",
      memberships: [],
      sectionMemberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      campusId: null,
      isLeader: false,
      isAdminScope: false,
      defaultTranslation: "NIV",
    });

    const result = await Page();

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect((result as { type: unknown }).type).toBe(mocks.AppShellMarker);
  });
});
