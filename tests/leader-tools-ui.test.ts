// @vitest-environment jsdom

import React from "react";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
  useSearchParams: () => new URLSearchParams("?test=1"),
}));
vi.mock("server-only", () => ({}));

import { AppShell } from "@/components/app-shell";
import { defaultAvatarConfig, type UserProfile } from "@/components/avatar";
import { LeaderScreen } from "@/components/screens/leader-screen";
import { BottomNav } from "@/components/screens/bottom-nav";
import type { RosterMemberView } from "@/components/app-shell";
import type { TodayState } from "@/components/use-today";
import type { GroupStanding } from "@/lib/game";

const profile: UserProfile = { displayName: "Alex", translation: "NIV", ...defaultAvatarConfig };

const roster: RosterMemberView[] = [
  {
    personId: 101,
    avatar: { ...defaultAvatarConfig },
    isSelf: true,
    name: "Alex",
    isLeader: true,
    readToday: true,
    chapters: [1, 2],
    readingDates: ["2026-10-01", "2026-10-02"],
  },
  {
    personId: 102,
    avatar: { ...defaultAvatarConfig },
    isSelf: false,
    name: "Jordan",
    isLeader: false,
    readToday: false,
    chapters: [1],
    readingDates: ["2026-10-01"],
  },
];

const activeToday: TodayState = {
  todayLocal: "2026-10-05",
  timezone: "Asia/Manila",
  phase: "active",
  displayPhase: "active",
  dayLabel: 5,
  entry: {
    day: 5,
    chapter: 5,
    date: "2026-10-05",
    keyPassage: "Matthew 5:3-12",
    title: "Beatitudes",
  },
};

const preLaunchToday: TodayState = {
  ...activeToday,
  todayLocal: "2026-09-20",
  phase: "pre-launch",
  displayPhase: "pre-launch",
  dayLabel: 0,
  entry: null,
};

const campusBoard: GroupStanding[] = [
  { groupId: 1, name: "Ortigas Alpha", ratio: 0.85, readersToday: 4, locality: "Ortigas Center" },
  { groupId: 2, name: "Ortigas Beta", ratio: 0.45, readersToday: 3, locality: "Ortigas Center" },
  { groupId: 3, name: "Pasig One", ratio: 0.25, readersToday: 2, locality: "Pasig" },
  { groupId: 4, name: "Unknown One", ratio: 0, readersToday: 0, locality: null },
];

function renderLeader(today = activeToday) {
  return render(
    React.createElement(LeaderScreen, {
      groupName: "Alex's Connect",
      campusBoard,
      roster,
      today,
      profile,
      appBaseUrl: "http://localhost:3000",
      readerGroupId: 1,
      onGetOrCreateJoinCode: async () => ({ ok: true as const, code: "TEST12" }),
      onEditProfile: () => {},
    }),
  );
}

describe("LeaderScreen", () => {
  afterEach(() => cleanup());

  it("shows stage icons by default, grouped by locality, without group names", () => {
    const { container } = renderLeader();

    expect(container.querySelector(".leader-screen")).not.toBeNull();
    expect(container.querySelector('[data-section="other-connects"]')).not.toBeNull();
    expect(screen.getByRole("heading", { name: /Ortigas Center/i }).textContent).toContain("2 groups");
    expect(screen.getByRole("heading", { name: /Pasig/i }).textContent).toContain("1 group");
    expect(screen.getByRole("heading", { name: /Unknown/i }).textContent).toContain("1 group");
    expect(container.querySelectorAll(".locality-stage-mini")).toHaveLength(4);
    expect(container.querySelector(".locality-icon-own")).not.toBeNull();
    expect(container.textContent).not.toContain("Ortigas Alpha");
    expect(container.textContent).not.toContain("Pasig One");
    expect(screen.getByLabelText("Ortigas Alpha — Mansion (your group)")).toBeTruthy();
  });

  it("uses the paper token for the leader surface light mode", () => {
    const css = readFileSync("app/styles/leader.css", "utf8");
    const leaderBlock = css.slice(css.indexOf(".leader-screen {"), css.indexOf("}", css.indexOf(".leader-screen {")));
    expect(leaderBlock).toContain("background: var(--paper)");
  });

  it("reveals names, stage, and percent after the toggle", () => {
    const { container } = renderLeader();
    fireEvent.click(screen.getByRole("button", { name: "Show names" }));

    expect(screen.getByRole("button", { name: "Show icons" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll(".campus-group-card")).toHaveLength(4);
    expect(container.textContent).toContain("Ortigas Alpha");
    expect(container.textContent).toContain("85% complete · Mansion");
    expect(container.textContent).toContain("Unknown One");
  });

  it("only shows the still-reading nudge during the active phase", () => {
    const { container } = renderLeader(preLaunchToday);
    expect(container.querySelector('[data-section="still-reading"]')).toBeNull();

    cleanup();
    renderLeader(activeToday);
    expect(screen.getByText(/haven't checked in today/)).toBeTruthy();
  });

  it("shows the daily group pulse card with read/still-reading breakdown and cheer action", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    renderLeader();

    expect(screen.getByText("1 of 2 read today")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("Read Today").parentElement?.textContent).toContain("(1)");
    expect(screen.getByText("Still Reading").parentElement?.textContent).toContain("(1)");

    fireEvent.click(screen.getByRole("button", { name: "Cheer on" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "✓ Copied" })).toBeTruthy());

    vi.unstubAllGlobals();
  });

  it("includes leader links for the portal and add-member flow", () => {
    renderLeader();
    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "https://connect.favor.church" && link.textContent?.includes("Manage"))).toBe(true);
    const addMember = screen.getByRole("link", { name: /Add a member/ });
    expect(addMember.getAttribute("href")).toBe("https://connect.favor.church");
    expect(addMember.getAttribute("target")).toBe("_blank");
    expect(addMember.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

describe("BottomNav leader visibility", () => {
  it("shows five items for a leader and four for a member", () => {
    const { container, rerender } = render(React.createElement(BottomNav, { tab: "today", onSelect: () => {}, isLeader: true }));
    expect(container.querySelectorAll("button")).toHaveLength(5);
    expect(container.querySelector('[data-tab="leader"]')).not.toBeNull();

    rerender(React.createElement(BottomNav, { tab: "today", onSelect: () => {}, isLeader: false }));
    expect(container.querySelectorAll("button")).toHaveLength(4);
    expect(container.querySelector('[data-tab="leader"]')).toBeNull();
  });
});

describe("AppShell leader role guard and paper noise", () => {
  beforeEach(() => {
    navigation.refresh.mockClear();
    vi.stubGlobal("scrollTo", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("removes paper noise on the leader tab and returns to Today when role flips to member", async () => {
    const { container } = render(
      React.createElement(AppShell, {
        displayName: "Alex",
        avatar: { ...defaultAvatarConfig },
        avatarCustomized: true,
        translation: "NIV",
        memberships: [{ groupId: 1, groupName: "Alex's Connect", campusId: 1, roleId: 24, isLeader: true }],
        activeGroup: { groupId: 1, groupName: "Alex's Connect", campusId: 1, roleId: 24, isLeader: true },
        needsGroupChoice: false,
        campusGroups: [],
        testWritableGroupId: null,
        isLeader: true,
        campusName: "Manila",
        roster,
        chapters: [1, 2],
        readingDates: ["2026-10-01", "2026-10-02"],
        groupStats: { checkinCount: 2, memberCount: 2, ratio: 0.03, readersTodayIds: [101] },
        campusBoard,
        appBaseUrl: "http://localhost:3000",
        devMockToday: "2026-10-05",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    const testMode = screen.getByRole("region", { name: "Test mode" });
    fireEvent.click(within(testMode).getByRole("button", { name: /^Leader$/ }));
    fireEvent.click(container.querySelector('.bottom-nav [data-tab="leader"]') as HTMLElement);

    await waitFor(() => expect(container.querySelector(".leader-screen")).not.toBeNull());
    expect(container.querySelector(".paper-noise")).toBeNull();

    fireEvent.click(within(testMode).getByRole("button", { name: /^Member$/ }));
    await waitFor(() => expect(container.querySelector('.bottom-nav [data-tab="today"]')?.classList.contains("active")).toBe(true));
    expect(container.querySelector(".leader-screen")).toBeNull();
    expect(container.querySelector(".paper-noise")).not.toBeNull();
  });
});
