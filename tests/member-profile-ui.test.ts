import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({
  getOrCreateJoinCode: vi.fn(async () => ({ ok: true, code: "TEST12" })),
}));

import { MemberProfileSheet } from "@/components/member-profile-sheet";
import { ConnectScreen } from "@/components/screens/connect-screen";
import { TodayScreen } from "@/components/screens/today-screen";
import { ProgressScreen } from "@/components/screens/progress-screen";
import { defaultAvatarConfig, type UserProfile } from "@/components/avatar";
import type { RosterMemberView } from "@/components/app-shell";
import type { TodayState } from "@/components/use-today";
import type { GroupStats } from "@/lib/data/stats";
import type { GroupStanding } from "@/lib/game";

const testProfile: UserProfile = {
  displayName: "Alex",
  translation: "NIV",
  ...defaultAvatarConfig,
};

const sampleRoster: RosterMemberView[] = [
  {
    personId: 101,
    name: "Jordan",
    isLeader: true,
    readToday: true,
    chapters: [1, 2, 3, 4, 5],
    readingDates: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"],
  },
  {
    personId: 102,
    name: "Taylor",
    isLeader: false,
    readToday: false,
    chapters: [1, 2],
    readingDates: ["2026-10-01", "2026-10-02"],
  },
  {
    personId: 103,
    name: "Sam",
    isLeader: false,
    readToday: false,
    chapters: [],
    readingDates: [],
  },
];

const sampleStats: GroupStats = {
  checkinCount: 7,
  memberCount: 3,
  ratio: 7 / (3 * 28),
  readersTodayIds: [101],
};

const mockTodayState: TodayState = {
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

describe("MemberProfileSheet", () => {
  it("renders an accessible modal dialog with first name, avatar, 5-day streak, and 28-day calendar", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemberProfileSheet, {
        open: true,
        onClose: () => {},
        member: sampleRoster[0],
        todayLocal: "2026-10-05",
      }),
    );

    // Modal accessibility semantics
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="member-profile-title"');
    expect(html).toContain('id="member-profile-title"');
    expect(html).toContain("Jordan</h2>");
    expect(html).toContain('aria-label="Close"');

    // 5-day streak strip
    expect(html).toContain('aria-label="Recent 5-day streak status"');
    expect(html).toContain("Oct 1");
    expect(html).toContain("Oct 5");
    expect(html).toContain("5 of 28 chapters read");

    // 28-day October progress calendar
    expect(html).toContain('aria-label="Jordan&#x27;s October reading calendar"');
    expect(html).toContain("Matthew · October 2026");
    expect(html).toContain("5/28 complete");

    // Privacy note
    expect(html).toContain("Reading check-ins only. Private notes, verse bookmarks, and personal metadata are never shared.");
  });

  it("handles reduced-value case for members with zero check-ins", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemberProfileSheet, {
        open: true,
        onClose: () => {},
        member: sampleRoster[2],
        todayLocal: "2026-10-05",
      }),
    );

    expect(html).toContain("Sam</h2>");
    expect(html).toContain("0 of 28 chapters read");
    expect(html).toContain("0/28 complete");
    expect(html).not.toContain("mini-grid-cell read");
  });

  it("handles changed-value case when a member updates check-ins", () => {
    const updatedMember: RosterMemberView = {
      ...sampleRoster[1],
      chapters: [1, 2, 3, 4, 5, 6, 7, 8],
      readingDates: [
        "2026-10-01",
        "2026-10-02",
        "2026-10-03",
        "2026-10-04",
        "2026-10-05",
        "2026-10-06",
        "2026-10-07",
        "2026-10-08",
      ],
      readToday: true,
    };

    const html = renderToStaticMarkup(
      React.createElement(MemberProfileSheet, {
        open: true,
        onClose: () => {},
        member: updatedMember,
        todayLocal: "2026-10-08",
      }),
    );

    expect(html).toContain("Taylor</h2>");
    expect(html).toContain("8 of 28 chapters read");
    expect(html).toContain("8/28 complete");
  });

  it("never exposes verse content, prayers, or private fields", () => {
    const html = renderToStaticMarkup(
      React.createElement(MemberProfileSheet, {
        open: true,
        onClose: () => {},
        member: sampleRoster[0],
        todayLocal: "2026-10-05",
      }),
    );

    expect(html).not.toContain("Blessed are the poor in spirit");
    expect(html).not.toContain("prayer");
    expect(html).not.toContain("password");
    expect(html).not.toContain("email");
  });
});

describe("ConnectScreen roster cards", () => {
  it("renders interactive roster cards with accessible name, title, and first-name copy", () => {
    const html = renderToStaticMarkup(
      React.createElement(ConnectScreen, {
        groupName: "Manila Central",
        campusName: "Favor Manila",
        isLeader: false,
        roster: sampleRoster,
        groupStats: sampleStats,
        appBaseUrl: "http://localhost:3000",
        profile: testProfile,
        onEditProfile: () => {},
        today: mockTodayState,
      }),
    );

    // Interactive button cards with dialog trigger
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('title="Jordan"');
    expect(html).toContain('title="Taylor"');
    expect(html).toContain('title="Sam"');
    expect(html).toContain('aria-label="View Jordan&#x27;s profile: Read"');
    expect(html).toContain('aria-label="View Taylor&#x27;s profile: Waiting"');
    expect(html).toContain("<strong>Jordan</strong>");
    expect(html).toContain("<strong>Taylor</strong>");
    expect(html).toContain("<strong>Sam</strong>");
  });
});

describe("TodayScreen tent people toggle", () => {
  it("renders the tent toggle button with aria-pressed attribute", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayScreen, {
        today: mockTodayState,
        chapters: [1, 2, 3, 4, 5],
        chaptersRead: 5,
        catchUpChapter: null,
        streakDays: 5,
        groupName: "Manila Central",
        groupStats: sampleStats,
        roster: sampleRoster,
        profile: testProfile,
        onStart: () => {},
        onEditProfile: () => {},
        onViewConnect: () => {},
        onViewProgress: () => {},
        onTranslationChange: () => {},
      }),
    );

    expect(html).toContain('class="tent-toggle-button"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Gather group");
  });
});

describe("ProgressScreen campus groups", () => {
  const sampleCampusBoard: GroupStanding[] = [
    {
      groupId: 1,
      name: "Makati Adults",
      ratio: 0.45,
      readersToday: 10,
    },
    {
      groupId: 2,
      name: "BGC Youth",
      ratio: 0.15,
      readersToday: 5,
    },
  ];

  it("renders campus groups full-width with StageMini, ProgressBar, and status copy", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProgressScreen, {
        today: mockTodayState,
        chapters: [1, 2, 3, 4, 5],
        chaptersRead: 5,
        coins: 50,
        streakDays: 5,
        groupName: "Makati Adults",
        campusName: "Favor Manila",
        campusBoard: sampleCampusBoard,
        profile: testProfile,
        onCatchUp: () => {},
        onEditProfile: () => {},
        onTranslationChange: () => {},
      }),
    );

    // Full-width section with frame__span
    expect(html).toContain('class="leaderboard-card frame__span"');
    expect(html).toContain('data-section="campus-groups"');
    expect(html).toContain("FAVOR MANILA CONNECT GROUPS");

    // Group cards with StageMini, ProgressBar, and readable status
    expect(html).toContain("Makati Adults");
    expect(html).toContain("BGC Youth");
    expect(html).toContain("45% complete · Apartment");
    expect(html).toContain("15% complete · Trailer");
    expect(html).toContain("stage-mini");
    expect(html).toContain("progress-track");
  });

  it("handles reduced-value case when campusBoard is empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProgressScreen, {
        today: mockTodayState,
        chapters: [],
        chaptersRead: 0,
        coins: 0,
        streakDays: 0,
        groupName: null,
        campusName: "Favor Manila",
        campusBoard: [],
        profile: testProfile,
        onCatchUp: () => {},
        onEditProfile: () => {},
        onTranslationChange: () => {},
      }),
    );

    expect(html).toContain("No groups on the board yet. October&#x27;s coming.");
    expect(html).not.toContain("campus-group-card");
  });
});
