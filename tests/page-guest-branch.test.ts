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

import Page from "@/app/page";
import { AppBrandSplash } from "@/components/app-splash";
import { FontReadyGate } from "@/components/font-ready-gate";
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
  it("redirects a logged-out visitor to the branded login entry", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "logged-out" });

    await expect(Page()).rejects.toThrow("REDIRECT:/login");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("preserves an internal return destination while sending guests to login", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "logged-out" });

    await expect(Page({ searchParams: Promise.resolve({ returnTo: "/join/ABC123" }) })).rejects.toThrow(
      "REDIRECT:/login?returnTo=%2Fjoin%2FABC123",
    );

    expect(mocks.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fjoin%2FABC123");
  });

  it("still redirects to /not-found-in-rock when the person has no Rock record", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "not-found-in-rock" });

    await expect(Page()).rejects.toThrow("REDIRECT:/not-found-in-rock");
    expect(mocks.redirect).toHaveBeenCalledWith("/not-found-in-rock");
  });

  it("renders Suspense with HomeData for an authenticated session", async () => {
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
    const gate = result as { type: unknown; props: { children: { type: unknown; props: { fallback: { type: unknown }; children: { type: unknown } } } } };
    expect(gate.type).toBe(FontReadyGate);
    expect(gate.props.children.type).toBe(Suspense);
    expect(gate.props.children.props.fallback.type).toBe(AppBrandSplash);

    expect(gate.props.children.props.children.type).toBe(HomeData);
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
        isAdminScope: false,
        defaultTranslation: "NIV",
      });

      const { getAllConnectGroups, getAllCampusNames } = await import("@/lib/rock/client");
      vi.mocked(getAllConnectGroups).mockResolvedValueOnce([
        {
          Id: 101,
          Name: "Group Manila",
          GroupTypeId: 25,
          CampusId: 1,
          ParentGroupId: null,
          IsActive: true,
          IsArchived: false,
          locality: null,
        },
        {
          Id: 202,
          Name: "Group Brisbane",
          GroupTypeId: 25,
          CampusId: 2,
          ParentGroupId: null,
          IsActive: true,
          IsArchived: false,
          locality: null,
        },
      ]);
      vi.mocked(getAllCampusNames).mockResolvedValueOnce(
        new Map([
          [1, "Manila"],
          [2, "Brisbane"],
        ]),
      );

      // Page() now returns a font gate around the Suspense boundary, so the
      // campus list is built two levels down, in HomeData. Render that child to
      // reach the AppShell props.
      // The guarantee under test is unchanged: when the list IS built, it is still
      // every Connect Group across every campus, in production too. What changed is
      // that building it now requires the URL to ask for test mode -- see the
      // companion test below for the ordinary-load half of that contract.
      const result = await Page({ searchParams: Promise.resolve({ test: "1" }) });
      const gate = (result as { props: { children: { props: { children: { props: unknown } } } } }).props.children;
      const suspense = gate.props.children;
      const rendered = await HomeData(suspense.props as Parameters<typeof HomeData>[0]);

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
    const gate = (result as { props: { children: { props: { children: { props: unknown } } } } }).props.children;
    const suspense = gate.props.children;
    const rendered = await HomeData(suspense.props as Parameters<typeof HomeData>[0]);

    expect(getAllConnectGroups).not.toHaveBeenCalled();
    const props = (rendered as { props: { campusGroupsPromise: Promise<unknown> } }).props;
    await expect(props.campusGroupsPromise).resolves.toEqual([]);
  });
});
