import { Suspense } from "react";
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
  AppShellMarker: vi.fn(() => null),
  // WelcomeLanding's own markup (anchor target, sample-content labelling,
  // image dimensions) is covered separately in welcome-landing.test.ts; this
  // file only asserts Page() selects it for the logged-out branch.
  WelcomeLandingMarker: () => null,
  getAuthorizedTestGroupOptions: vi.fn().mockResolvedValue([]),
  isTestModeAuthorized: vi.fn((session: { isAdminScope: boolean }) => session.isAdminScope),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/db/schema", () => ({ profiles: { rockPersonId: "rockPersonId" } }));
vi.mock("@/lib/dev-clock", () => ({ devMockToday: () => null }));
vi.mock("@/lib/test-mode-config", () => ({ testWritableGroupId: () => null }));
vi.mock("@/lib/test-mode-auth", () => ({
  getAuthorizedTestGroupOptions: mocks.getAuthorizedTestGroupOptions,
  isTestModeAuthorized: mocks.isTestModeAuthorized,
}));
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
import { AppBrandSplash } from "@/components/app-splash";
import { HomeData } from "@/components/home-data";

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

  it("renders Suspense with HomeData, not WelcomeLanding, for an authenticated session", async () => {
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
    expect((result as { type: unknown }).type).toBe(Suspense);
    expect((result as { props: { fallback: { type: unknown } } }).props.fallback.type).toBe(AppBrandSplash);

    const child = (result as { props: { children: { type: unknown } } }).props.children;
    expect(child.type).toBe(HomeData);
    expect(child.type).not.toBe(mocks.WelcomeLandingMarker);
  });

  it("passes all connect groups across all campuses to AppShell even in production, when test mode is requested", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
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
        isAdminScope: true,
        defaultTranslation: "NIV",
      });

      mocks.getAuthorizedTestGroupOptions.mockResolvedValueOnce([
        { groupId: 202, groupName: "Group Brisbane — Brisbane" },
        { groupId: 101, groupName: "Group Manila — Manila" },
      ]);

      // Page() now returns a Suspense boundary, so the campus list is built one
      // level down, in HomeData. Render that child to reach the AppShell props.
      // The guarantee under test is unchanged: when the list IS built, it is still
      // every Connect Group across every campus, in production too. What changed is
      // that building it now requires the URL to ask for test mode -- see the
      // companion test below for the ordinary-load half of that contract.
      const result = await Page({ searchParams: Promise.resolve({ test: "1" }) });
      const child = (result as { props: { children: { props: unknown } } }).props.children;
      const rendered = await HomeData(child.props as Parameters<typeof HomeData>[0]);

      // The list is no longer awaited in HomeData -- it is handed down unresolved
      // so the shell can paint while the org-wide Rock call is in flight, and the
      // panel reads it behind a Suspense boundary. The content guarantee under
      // test is unchanged: every Connect Group across every campus, in production.
      const props = (rendered as { props: { campusGroupsPromise: Promise<unknown> } }).props;
      await expect(props.campusGroupsPromise).resolves.toEqual([
        { groupId: 202, groupName: "Group Brisbane — Brisbane" },
        { groupId: 101, groupName: "Group Manila — Manila" },
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not fetch the org-wide connect group list on an ordinary page load", async () => {
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

    const { getAllConnectGroups, getAllCampusNames } = await import("@/lib/rock/client");
    vi.mocked(getAllConnectGroups).mockClear();
    vi.mocked(getAllCampusNames).mockClear();

    // No test-mode param. The group list feeds the test panel and nothing else,
    // so a several-hundred-group Rock call must not block the shell render for
    // an ordinary member.
    const result = await Page();
    const child = (result as { props: { children: { props: unknown } } }).props.children;
    const rendered = await HomeData(child.props as Parameters<typeof HomeData>[0]);

    expect(getAllConnectGroups).not.toHaveBeenCalled();
    const props = (rendered as { props: { campusGroupsPromise: Promise<unknown> } }).props;
    await expect(props.campusGroupsPromise).resolves.toEqual([]);
  });

  it("does not fetch real group options for an unauthorized test-mode URL", async () => {
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

    const result = await Page({ searchParams: Promise.resolve({ test: "1" }) });
    const child = (result as { props: { children: { props: unknown } } }).props.children;
    const rendered = await HomeData(child.props as Parameters<typeof HomeData>[0]);
    const props = (rendered as { props: { campusGroupsPromise: Promise<unknown> } }).props;

    expect(mocks.getAuthorizedTestGroupOptions).not.toHaveBeenCalled();
    await expect(props.campusGroupsPromise).resolves.toEqual([]);
  });
});
