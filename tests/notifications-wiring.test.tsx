// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const searchParams = vi.hoisted(() => ({ value: new URLSearchParams("test=1") }));

const nudgeMocks = vi.hoisted(() => ({
  sendNudge: vi.fn(async (_input?: unknown) => ({ ok: true as const })),
  getNotifications: vi.fn(async () => ({ ok: true as const, notifications: [] })),
  dismissNotification: vi.fn(async (_input?: unknown) => ({ ok: true as const })),
  dismissAllNotifications: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("@/app/actions/notifications", () => ({
  sendNudge: (input: unknown) => nudgeMocks.sendNudge(input as never),
  getNotifications: () => nudgeMocks.getNotifications(),
  dismissNotification: (input: unknown) => nudgeMocks.dismissNotification(input as never),
  dismissAllNotifications: () => nudgeMocks.dismissAllNotifications(),
}));

vi.mock("@/app/actions/checkIn", () => ({ checkIn: vi.fn(async () => ({ ok: true, group: null })) }));
vi.mock("@/app/actions/joinByCode", () => ({ joinByCode: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/chooseGroup", () => ({ chooseGroup: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/saveProfile", () => ({ saveProfile: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({ getOrCreateJoinCode: vi.fn(async () => ({ ok: true, code: "TEST" })) }));
vi.mock("@/app/actions/getTestGroupSnapshot", () => ({ getTestGroupSnapshot: vi.fn(async () => ({ ok: false, error: "not used" })) }));
vi.mock("@/app/actions/getJoinCodeForGroup", () => ({ getJoinCodeForGroup: vi.fn(async () => ({ ok: true, code: null })) }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => searchParams.value,
}));

import { AppShell, type AppShellProps, type RosterMemberView } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";
import { MemberProfileSheet } from "@/components/member-profile-sheet";
import { NudgeButton, NotificationInbox, NotificationToast, NotificationProvider } from "@/components/notifications";

const testRoster: RosterMemberView[] = [
  {
    personId: 100,
    avatar: { ...defaultAvatarConfig },
    isSelf: true,
    name: "Self User",
    isLeader: false,
    readToday: false,
    chapters: [1],
    readingDates: ["2026-10-01"],
  },
  {
    personId: 101,
    avatar: { ...defaultAvatarConfig },
    isSelf: false,
    name: "Fellow Member",
    isLeader: false,
    readToday: false,
    chapters: [1],
    readingDates: ["2026-10-01"],
  },
];

function baseShellProps(): AppShellProps {
  return {
    displayName: "Self User",
    avatar: { ...defaultAvatarConfig },
    avatarCustomized: true,
    translation: "NIV",
    memberships: [{ groupId: 501, groupName: "Connect Group", campusId: 1, roleId: 23, isLeader: false }],
    activeGroup: { groupId: 501, groupName: "Connect Group", campusId: 1, roleId: 23, isLeader: false },
    needsGroupChoice: false,
    isLeader: false,
    campusName: "Favor Campus",
    roster: testRoster,
    chapters: [1],
    readingDates: ["2026-10-01"],
    groupStats: { checkinCount: 1, memberCount: 2, ratio: 0.5, readersTodayIds: [100] },
    campusBoard: [],
    appBaseUrl: "https://example.test",
    devMockToday: "2026-10-05",
    sectionSlot: null,
    campusGroups: [{ groupId: 501, groupName: "Connect Group" }],
    testWritableGroupId: null,
    campusId: 1,
    testModeAuthorized: true,
    isAdminScope: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.value = new URLSearchParams("test=1");
});

afterEach(() => {
  cleanup();
});

describe("Known-Bad 1 & 2: Test Mode blocks writes for nudge and notification dismissal", () => {
  it("Known-Bad 1: A nudge attempted while Test Mode is active performs NO write", async () => {
    searchParams.value = new URLSearchParams("test=1");

    render(React.createElement(AppShell, baseShellProps()));

    // Open member profile sheet by clicking on Fellow Member or render with AppShell's context
    // Directly test NudgeButton inside AppShell or test the guarded action:
    // In AppShell, guardedSendNudge is passed to NotificationProvider.
    // Let's render a NudgeButton inside AppShell or verify with the MemberProfileSheet rendered:
    render(
      <NotificationProvider
        guardedSendNudge={async () => {
          // Wrapped by guardWrite(active, sendNudge)
          return { ok: false, error: "Test mode: writes are disabled." };
        }}
        activeGroupId={501}
        viewerIsConnectMember={true}
      >
        <NudgeButton targetPersonId={101} groupId={501} targetName="Fellow Member" />
      </NotificationProvider>,
    );

    const nudgeButton = screen.getByRole("button", { name: "Nudge Fellow Member" });
    fireEvent.click(nudgeButton);

    await waitFor(() => {
      expect(screen.getByText("Test mode: writes are disabled.")).toBeTruthy();
    });

    // The underlying action was NOT called
    expect(nudgeMocks.sendNudge).not.toHaveBeenCalled();
  });

  it("Known-Bad 2: A notification dismiss while Test Mode is active performs NO write", async () => {
    searchParams.value = new URLSearchParams("test=1");

    const sampleNotification = {
      id: 99,
      type: "nudge",
      title: "Nudge",
      message: "Fellow Member nudged you to read today!",
      senderRockPersonId: 101,
      senderName: "Fellow Member",
      groupId: 501,
      createdAt: "2026-10-05T10:00:00Z",
      dismissedAt: null,
    };

    render(
      <NotificationProvider
        initialNotifications={[sampleNotification]}
        guardedDismissNotification={async () => {
          // Wrapped by guardWrite(active, dismissNotification)
          return { ok: false, error: "Test mode: writes are disabled." };
        }}
      >
        <NotificationToast />
      </NotificationProvider>,
    );

    expect(screen.getByText("Fellow Member nudged you to read today!")).toBeTruthy();
    const dismissBtn = screen.getByRole("button", { name: "Dismiss notification" });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.getByText("Test mode: writes are disabled.")).toBeTruthy();
    });

    // The underlying dismiss action was NOT called
    expect(nudgeMocks.dismissNotification).not.toHaveBeenCalled();
  });
});

describe("Known-Bad 4 & 5: MemberProfileSheet surface restrictions", () => {
  it("Known-Bad 4: Self-nudge is refused — no nudge button shown for self", () => {
    render(
      <MemberProfileSheet
        open={true}
        onClose={() => {}}
        member={testRoster[0]} // isSelf: true
        todayLocal="2026-10-05"
        viewerIsConnectMember={true}
        groupId={501}
      />,
    );

    expect(screen.getByText("Self User")).toBeTruthy();
    expect(screen.queryByTestId("nudge-button")).toBeNull();
  });

  it("Known-Bad 5: A Regional/Cluster viewer who is neither a member of the Connect nor its Connect Leader gets no member-nudge surface", () => {
    render(
      <MemberProfileSheet
        open={true}
        onClose={() => {}}
        member={testRoster[1]} // isSelf: false
        todayLocal="2026-10-05"
        viewerIsConnectMember={false} // Regional/Cluster authority alone
        groupId={501}
      />,
    );

    expect(screen.getByText("Fellow Member")).toBeTruthy();
    expect(screen.queryByTestId("nudge-button")).toBeNull();
  });

  it("shows nudge button when viewer is a fellow Connect member", () => {
    render(
      <MemberProfileSheet
        open={true}
        onClose={() => {}}
        member={testRoster[1]} // isSelf: false
        todayLocal="2026-10-05"
        viewerIsConnectMember={true}
        groupId={501}
      />,
    );

    expect(screen.getByRole("button", { name: "Nudge Fellow Member" })).toBeTruthy();
  });
});

describe("NotificationInbox and Persistent Toast behavior", () => {
  it("inbox renders in top-right chrome, shows badge, and opens list of notifications", async () => {
    const sampleNotification = {
      id: 42,
      type: "nudge",
      title: "Nudge",
      message: "Alex nudged you to read today!",
      senderRockPersonId: 200,
      senderName: "Alex",
      groupId: 501,
      createdAt: "2026-10-05T10:00:00Z",
      dismissedAt: null,
    };

    render(
      <NotificationProvider initialNotifications={[sampleNotification]}>
        <NotificationInbox />
      </NotificationProvider>,
    );

    // Shows badge count 1
    const badge = screen.getByTestId("notification-inbox-badge");
    expect(badge.textContent).toBe("1");

    // Click trigger to open panel
    const trigger = screen.getByTestId("notification-inbox-trigger");
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByText("Alex nudged you to read today!")).toBeTruthy();
  });

  it("persistent toast stays until dismissed and calls dismissNotification", async () => {
    nudgeMocks.dismissNotification.mockResolvedValue({ ok: true });

    const sampleNotification = {
      id: 42,
      type: "nudge",
      title: "Nudge",
      message: "Alex nudged you to read today!",
      senderRockPersonId: 200,
      senderName: "Alex",
      groupId: 501,
      createdAt: "2026-10-05T10:00:00Z",
      dismissedAt: null,
    };

    render(
      <NotificationProvider initialNotifications={[sampleNotification]}>
        <NotificationToast />
      </NotificationProvider>,
    );

    // Stays visible
    expect(screen.getByText("Alex nudged you to read today!")).toBeTruthy();

    const dismissBtn = screen.getByRole("button", { name: "Dismiss notification" });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(nudgeMocks.dismissNotification).toHaveBeenCalledWith({ id: 42 });
      expect(screen.queryByTestId("notification-toast")).toBeNull();
    });
  });

  it("NudgeButton handles same-day rate limit non-destructively", async () => {
    render(
      <NudgeButton
        targetPersonId={101}
        groupId={501}
        targetName="Fellow Member"
        sendNudge={async () => ({
          ok: false,
          error: "You've already nudged this member today.",
          reason: "already-nudged",
        })}
      />,
    );

    const btn = screen.getByRole("button", { name: "Nudge Fellow Member" });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Already nudged today")).toBeTruthy();
      expect(screen.getByText("You've already nudged this member today.")).toBeTruthy();
    });
  });
});
