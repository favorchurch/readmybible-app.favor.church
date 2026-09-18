// @vitest-environment jsdom

/**
 * The 3D Campfire unlock is a pinned, read-only contract (lib/scoring.ts)
 * that this app consumes but never recomputes. Its own tests
 * (tests/scoring.test.ts) prove the arithmetic; components/connect-score.ts
 * adapts this app's roster into it (tests/connect-score.test.ts); this file
 * proves the wiring -- that ConnectScreen and TodayScreen, the real call
 * sites that render FullHome, actually receive and forward the unlock
 * computed from the live roster, instead of falling through to the raw
 * group check-in count.
 *
 * It also proves the adapter stays narrowed to the unlock alone: no points
 * badge should ever come from it (that needs PR #185's per-person figure).
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ConnectScreen } from "@/components/screens/connect-screen";
import { TodayScreen } from "@/components/screens/today-screen";
import { rosterUnlocks3dCampfire } from "@/components/connect-score";
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

describe("ConnectScreen wires the real unlock into FullHome", () => {
  it("keeps the 3D Campfire locked when groupStats carries a check-in count but nobody on the current roster has completed a chapter", () => {
    const roster = [soleMember];
    const unlocked3dCampfire = rosterUnlocks3dCampfire(101, roster);
    const groupStats: GroupStats = { checkinCount: 5, memberCount: 1, ratio: 0, readersTodayIds: [] };

    render(
      <ConnectScreen
        groupName="Test Connect"
        campusName={null}
        roster={roster}
        groupStats={groupStats}
        unlocked3dCampfire={unlocked3dCampfire}
        profile={profile}
        onEditProfile={vi.fn()}
        today={today}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Home" }));
    expect(screen.getByRole("button", { name: "3D Campfire (locked)" })).toBeTruthy();
  });

  it("unlocks the 3D Campfire from a real completed assignment, and shows no points badge from this adapter", () => {
    const roster: RosterMemberView[] = [{ ...soleMember, readToday: true, chapters: [5], readingDates: ["2026-10-05"] }];
    const unlocked3dCampfire = rosterUnlocks3dCampfire(101, roster);
    const groupStats: GroupStats = { checkinCount: 1, memberCount: 1, ratio: 1 / 20, readersTodayIds: [1] };

    render(
      <ConnectScreen
        groupName="Test Connect"
        campusName={null}
        roster={roster}
        groupStats={groupStats}
        unlocked3dCampfire={unlocked3dCampfire}
        profile={profile}
        onEditProfile={vi.fn()}
        today={today}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Home" }));
    expect(screen.getByRole("button", { name: "3D Campfire" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "3D Campfire (locked)" })).toBeNull();

    // A2 regression guard: this adapter must never stamp the Connect-wide
    // total onto each person as a fake "personal" figure. Until PR #185
    // ships a real per-person number, no badge should render at all.
    expect(document.querySelector(".home-gathering .home-person-points")).toBeNull();
  });
});

describe("TodayScreen wires the same unlock into its own Home", () => {
  it("keeps the 3D Campfire locked there too, from the same roster-derived unlock", () => {
    const roster = [soleMember];
    const unlocked3dCampfire = rosterUnlocks3dCampfire(101, roster);
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
        unlocked3dCampfire={unlocked3dCampfire}
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

  it("unlocks there too from a real completed assignment", () => {
    const roster: RosterMemberView[] = [{ ...soleMember, readToday: true, chapters: [5], readingDates: ["2026-10-05"] }];
    const unlocked3dCampfire = rosterUnlocks3dCampfire(101, roster);
    const groupStats: GroupStats = { checkinCount: 1, memberCount: 1, ratio: 1 / 20, readersTodayIds: [1] };

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
        unlocked3dCampfire={unlocked3dCampfire}
        profile={profile}
        avatarCustomized
        onStart={vi.fn()}
        onEditProfile={vi.fn()}
        onViewConnect={vi.fn()}
        onViewProgress={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Home" }));
    expect(screen.getByRole("button", { name: "3D Campfire" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "3D Campfire (locked)" })).toBeNull();
  });
});
