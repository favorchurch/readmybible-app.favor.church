// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
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
      campusGroups: [],
      testWritableGroupId: null,
    };

    render(React.createElement(AppShell, props));

    const logoutLink = screen.getByRole("link", { name: /log out/i });
    expect(logoutLink).toBeTruthy();
    expect(logoutLink.getAttribute("href")).toBe("/auth/logout");
  });
});
