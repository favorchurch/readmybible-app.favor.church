// @vitest-environment jsdom

/**
 * ConnectScore is a pinned, read-only contract (lib/scoring.ts) that #153
 * consumes but never recomputes. Its own tests (tests/scoring.test.ts) prove
 * the arithmetic; this file proves the wiring -- that ConnectScreen and
 * TodayScreen, the real call sites that render FullHome, actually receive
 * and forward a score computed from the live roster, instead of falling
 * through to the raw group check-in count.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ConnectScreen } from "@/components/screens/connect-screen";
import { TodayScreen } from "@/components/screens/today-screen";
import { scoreRoster, withDisplayPoints } from "@/components/connect-score";
import { defaultAvatarConfig, type UserProfile } from "@/components/avatar";
import type { RosterMemberView } from "@/components/app-shell";
import type { TodayState } from "@/components/use-today";
import type { GroupStats } from "@/lib/data/stats";

const profile: UserProfile = { displayName: "Reader One", translation: "NIV", ...defaultAvatarConfig };

const today: TodayState = {
  todayLocal: "2026-10-05",
  timezone: "Asia/Manila",
  phase: "active",
  displayPhase: "active",
  dayLabel: 5,
  entry: { day: 5, chapter: 5, date: "2026-10-05", keyPassage: "Matthew 5:3-12", title: "Beatitudes" },
};

const soleMember: RosterMemberView = {
  personId: 1,
  avatar: defaultAvatarConfig,
  isSelf: true,
  name: "Reader One",
  isLeader: false,
  readToday: false,
  chapters: [],
  readingDates: [],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConnectScreen wires the real ConnectScore into FullHome", () => {
  it("keeps the 3D Campfire locked when groupStats carries a check-in count but nobody on the current roster has completed a chapter", () => {
    const roster = [soleMember];
    const score = scoreRoster(101, roster);
    const groupStats: GroupStats = { checkinCount: 5, memberCount: 1, ratio: 0, readersTodayIds: [] };

    render(
      <ConnectScreen
        groupName="Test Connect"
        campusName={null}
        roster={roster}
        groupStats={groupStats}
        score={score}
        profile={profile}
        onEditProfile={vi.fn()}
        today={today}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Home" }));
    expect(screen.getByRole("button", { name: "3D Campfire (locked)" })).toBeTruthy();
  });

  it("unlocks the 3D Campfire from a real completed assignment and shows the scored points badge", () => {
    const roster: RosterMemberView[] = [{ ...soleMember, readToday: true, chapters: [5], readingDates: ["2026-10-05"] }];
    const score = scoreRoster(101, roster);
    const groupStats: GroupStats = { checkinCount: 1, memberCount: 1, ratio: 1 / 20, readersTodayIds: [1] };

    render(
      <ConnectScreen
        groupName="Test Connect"
        campusName={null}
        roster={withDisplayPoints(roster, score)}
        groupStats={groupStats}
        score={score}
        profile={profile}
        onEditProfile={vi.fn()}
        today={today}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Home" }));
    expect(screen.getByRole("button", { name: "3D Campfire" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "3D Campfire (locked)" })).toBeNull();

    // Scoped to the Home gathering, not ConnectScreen's own member-grid card,
    // which renders an aria-label of the same shape for the same person.
    const pointsBadge = document.querySelector(".home-gathering .home-person-points");
    expect(pointsBadge?.textContent).toBe(String(score.displayPoints));
  });
});

describe("TodayScreen wires the same ConnectScore into its own Home", () => {
  it("keeps the 3D Campfire locked there too, from the same score the roster produces", () => {
    const roster = [soleMember];
    const score = scoreRoster(101, roster);
    const groupStats: GroupStats = { checkinCount: 5, memberCount: 1, ratio: 0, readersTodayIds: [] };

    render(
      <TodayScreen
        today={today}
        chapters={[]}
        chaptersRead={0}
        catchUpChapter={null}
        streakDays={0}
        groupName="Test Connect"
        groupStats={groupStats}
        roster={roster}
        score={score}
        profile={profile}
        avatarCustomized
        onStart={vi.fn()}
        onEditProfile={vi.fn()}
        onViewConnect={vi.fn()}
        onViewProgress={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Home" }));
    expect(screen.getByRole("button", { name: "3D Campfire (locked)" })).toBeTruthy();
  });
});
