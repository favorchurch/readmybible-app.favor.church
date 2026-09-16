// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/app/actions/checkIn", () => ({ checkIn: vi.fn() }));
vi.mock("@/app/actions/joinByCode", () => ({ joinByCode: vi.fn() }));
vi.mock("@/app/actions/chooseGroup", () => ({ chooseGroup: vi.fn() }));
vi.mock("@/app/actions/saveProfile", () => ({ saveProfile: vi.fn() }));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({ getOrCreateJoinCode: vi.fn() }));
vi.mock("@/app/actions/getTestGroupSnapshot", () => ({ getTestGroupSnapshot: vi.fn() }));

import { AppShell, type AppShellProps } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";
import { SoloScreen } from "@/components/screens/solo-screen";

afterEach(() => cleanup());

describe("SoloScreen", () => {
  it("renders a logout link pointing to /auth/logout", () => {
    render(
      React.createElement(SoloScreen, {
        error: null,
        pending: false,
        onJoin: vi.fn(),
      }),
    );

    const logoutLink = screen.getByRole("link", { name: /log out/i });
    expect(logoutLink).toBeTruthy();
    expect(logoutLink.getAttribute("href")).toBe("/auth/logout");
    expect(logoutLink.className).toContain("secondary-link");
  });

  it("still provides the logout link when entering a group code", () => {
    render(
      React.createElement(SoloScreen, {
        error: null,
        pending: false,
        onJoin: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /enter a group code/i }));

    const logoutLink = screen.getByRole("link", { name: /log out/i });
    expect(logoutLink).toBeTruthy();
    expect(logoutLink.getAttribute("href")).toBe("/auth/logout");
  });

  it("renders the logout link inside AppShell when logged in without a connect group", () => {
    const props: AppShellProps = {
      displayName: "Solo Reader",
      avatar: { ...defaultAvatarConfig },
      avatarCustomized: false,
      translation: "NIV",
      memberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      isLeader: false,
      campusName: null,
      roster: [],
      chapters: [],
      readingDates: [],
      groupStats: null,
      campusBoard: [],
      appBaseUrl: "https://example.test",
      devMockToday: null,
      sectionSlot: null,
      campusGroups: [],
      testModeAuthorized: false,
      testWritableGroupId: null,
    };

    render(React.createElement(AppShell, props));

    const logoutLink = screen.getByRole("link", { name: /log out/i });
    expect(logoutLink).toBeTruthy();
    expect(logoutLink.getAttribute("href")).toBe("/auth/logout");
  });

  // Guardrail for the admin-scope gating change: a groupless, non-admin
  // viewer must still land on SoloScreen. isAdminScope must never be
  // defaulted to true or inferred from anything other than props.isAdminScope
  // -- if that regresses, this is the test that goes red.
  it("still renders SoloScreen for a groupless viewer with no admin scope (isAdminScope omitted)", () => {
    const props: AppShellProps = {
      displayName: "No Scope Reader",
      avatar: { ...defaultAvatarConfig },
      avatarCustomized: false,
      translation: "NIV",
      memberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      isLeader: false,
      campusName: null,
      roster: [],
      chapters: [],
      readingDates: [],
      groupStats: null,
      campusBoard: [],
      appBaseUrl: "https://example.test",
      devMockToday: null,
      sectionSlot: null,
      campusGroups: [],
      testModeAuthorized: false,
      testWritableGroupId: null,
      // isAdminScope intentionally omitted -- this must NOT widen access.
    };

    const { container } = render(React.createElement(AppShell, props));

    expect(container.querySelector(".solo-screen")).not.toBeNull();
    expect(container.querySelector(".leader-screen")).toBeNull();
    expect(container.querySelector('.bottom-nav [data-tab="leader"]')).toBeNull();
  });

  it("lets a groupless admin-scope viewer reach the full shell instead of SoloScreen", () => {
    const props: AppShellProps = {
      displayName: "Section Head",
      avatar: { ...defaultAvatarConfig },
      avatarCustomized: false,
      translation: "NIV",
      memberships: [],
      activeGroup: null,
      needsGroupChoice: false,
      isLeader: false,
      campusName: null,
      roster: [],
      chapters: [],
      readingDates: [],
      groupStats: null,
      campusBoard: [],
      appBaseUrl: "https://example.test",
      devMockToday: null,
      sectionSlot: null,
      campusGroups: [],
      testModeAuthorized: true,
      testWritableGroupId: null,
      isAdminScope: true,
    };

    const { container } = render(React.createElement(AppShell, props));

    expect(container.querySelector(".solo-screen")).toBeNull();
    expect(container.querySelector('.bottom-nav [data-tab="leader"]')).not.toBeNull();
  });
});
