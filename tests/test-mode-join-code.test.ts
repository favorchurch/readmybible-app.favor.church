// @vitest-environment jsdom

/**
 * #122: the Leader tab's GROUP CODE tile must read from the never-creates
 * `getJoinCodeForGroup` action while test mode is active, not the guarded
 * `getOrCreateJoinCode` -- which the sandbox correctly blocks, and which is
 * why the tile used to spin forever. See components/app-shell.tsx's
 * `testModeGetJoinCode` adapter and `simulatedGroupId`.
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("qrcode", () => ({
  toDataURL: vi.fn(async (value: string) => `data:${value}`),
}));

const REAL_GROUP = 87177;
const OTHER_GROUP = 24077;

const searchParams = vi.hoisted(() => ({ value: new URLSearchParams("test=1") }));

const checkIn = vi.fn(async () => ({ ok: true as const, group: null }));
const joinByCode = vi.fn(async () => ({ ok: true as const }));
const chooseGroup = vi.fn(async () => ({ ok: true as const }));
const saveProfile = vi.fn(async () => ({ ok: true as const }));
const getOrCreateJoinCode = vi.fn(async () => ({ ok: true as const, code: "SHOULD-NOT-BE-CALLED" }));
const getTestGroupSnapshot = vi.fn(async () => ({ ok: false as const, error: "not used" }));
const getJoinCodeForGroup = vi.fn(async (groupId: number) => ({ ok: true as const, code: null as string | null, groupId }));

vi.mock("@/app/actions/checkIn", () => ({ checkIn: (...a: unknown[]) => checkIn(...(a as [])) }));
vi.mock("@/app/actions/joinByCode", () => ({ joinByCode: (...a: unknown[]) => joinByCode(...(a as [])) }));
vi.mock("@/app/actions/chooseGroup", () => ({ chooseGroup: (...a: unknown[]) => chooseGroup(...(a as [])) }));
vi.mock("@/app/actions/saveProfile", () => ({ saveProfile: (...a: unknown[]) => saveProfile(...(a as [])) }));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({
  getOrCreateJoinCode: (...a: unknown[]) => getOrCreateJoinCode(...(a as [])),
}));
vi.mock("@/app/actions/getTestGroupSnapshot", () => ({
  getTestGroupSnapshot: (...a: unknown[]) => getTestGroupSnapshot(...(a as [])),
}));
vi.mock("@/app/actions/getJoinCodeForGroup", () => ({
  getJoinCodeForGroup: (groupId: number) => getJoinCodeForGroup(groupId),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => searchParams.value,
}));

import { AppShell, type AppShellProps, type RosterMemberView } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";

const roster: RosterMemberView[] = [
  {
    personId: 13358,
    avatar: { ...defaultAvatarConfig },
    isSelf: true,
    name: "Rico Test",
    isLeader: true,
    readToday: false,
    chapters: [],
    readingDates: [],
  },
];

function baseProps(): AppShellProps {
  return {
    displayName: "Rico Test",
    avatar: { ...defaultAvatarConfig },
    avatarCustomized: true,
    translation: "NIV",
    memberships: [],
    activeGroup: { groupId: REAL_GROUP, groupName: "TEST // Connect Group", campusId: 5, roleId: 23, isLeader: true },
    needsGroupChoice: false,
    isLeader: true,
    campusName: "OPEN ACCESS",
    roster,
    chapters: [],
    readingDates: [],
    groupStats: { checkinCount: 0, memberCount: 1, ratio: 0, readersTodayIds: [] },
    campusBoard: [],
    appBaseUrl: "https://example.test",
    devMockToday: null,
    sectionSlot: null,
    campusGroups: [
      { groupId: REAL_GROUP, groupName: "TEST // Connect Group" },
      { groupId: OTHER_GROUP, groupName: "Some Other Group" },
    ],
    testModeAuthorized: true,
    testWritableGroupId: null,
  };
}

function expandPanel() {
  const show = screen.queryByRole("button", { name: /^show$/i });
  if (show) fireEvent.click(show);
}

function openLeaderTabAsConnectLeader() {
  expandPanel();
  const roleControl = screen.getByRole("group", { name: /role/i });
  fireEvent.click(within(roleControl).getByRole("button", { name: /^connect leader$/i }));
  const navLeader = screen.getAllByRole("button", { name: /^leader$/i }).find((el) => !roleControl.contains(el));
  fireEvent.click(navLeader!);
}

afterEach(() => {
  cleanup();
  searchParams.value = new URLSearchParams("test=1");
});
beforeEach(() => {
  [checkIn, joinByCode, chooseGroup, saveProfile, getOrCreateJoinCode, getTestGroupSnapshot, getJoinCodeForGroup].forEach(
    (m) => m.mockClear(),
  );
});

describe("#122: Leader tab GROUP CODE tile in test mode", () => {
  it("shows the real code and QR for the simulated group (falls back to the real active group when none is picked)", async () => {
    // `mockResolvedValue`, not `Once`: both the Test Mode panel's own preview
    // and app-shell's adapter call `getJoinCodeForGroup` for the same group,
    // so a one-shot resolution is consumed by whichever fires first.
    getJoinCodeForGroup.mockResolvedValue({ ok: true, code: "REALCODE", groupId: REAL_GROUP });

    render(React.createElement(AppShell, baseProps()));
    openLeaderTabAsConnectLeader();

    await waitFor(() => expect(screen.getByText("REALCODE")).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByRole("img", { name: /QR code to join/i })).toBeTruthy(),
    );
    expect(getJoinCodeForGroup).toHaveBeenCalledWith(REAL_GROUP);
    expect(getOrCreateJoinCode).not.toHaveBeenCalled();
  });

  it("shows an honest empty state -- not an infinite Loading… -- for a simulated group with no code yet", async () => {
    getJoinCodeForGroup.mockResolvedValue({ ok: true, code: null, groupId: OTHER_GROUP });

    render(React.createElement(AppShell, baseProps()));
    expandPanel();
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), { target: { value: String(OTHER_GROUP) } });
    const roleControl = screen.getByRole("group", { name: /role/i });
    fireEvent.click(within(roleControl).getByRole("button", { name: /^connect leader$/i }));
    const navLeader = screen.getAllByRole("button", { name: /^leader$/i }).find((el) => !roleControl.contains(el));
    fireEvent.click(navLeader!);

    await waitFor(() => expect(getJoinCodeForGroup).toHaveBeenCalledWith(OTHER_GROUP));
    // The tile must resolve to something other than the perpetual "Loading…".
    await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
    expect(screen.getByText(/no group code yet/i)).toBeTruthy();
    expect(screen.queryByRole("img", { name: /QR code to join/i })).toBeNull();
    expect(getOrCreateJoinCode).not.toHaveBeenCalled();
  });

  it("safety property: getOrCreateJoinCode is never called while test mode is active, whatever the group/code state", async () => {
    getJoinCodeForGroup.mockResolvedValue({ ok: true, code: "SOMECODE", groupId: REAL_GROUP });

    render(React.createElement(AppShell, baseProps()));
    openLeaderTabAsConnectLeader();

    await waitFor(() => expect(screen.getByText("SOMECODE")).toBeTruthy());

    // Switch groups a couple of times -- still never a write.
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), { target: { value: String(OTHER_GROUP) } });
    await waitFor(() => expect(getJoinCodeForGroup).toHaveBeenCalledWith(OTHER_GROUP));
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), { target: { value: "" } });
    await waitFor(() => expect(getJoinCodeForGroup).toHaveBeenCalledWith(REAL_GROUP));

    expect(getOrCreateJoinCode).not.toHaveBeenCalled();
  });

  // Review finding: `readerGroupId` was made simulated while its sibling
  // `hasGroupView` was left on the real group. A department-scoped user with no Connect Group
  // of their own -- exactly the population the test-mode entry point is gated
  // to -- then hit LeaderScreen's no-group early return, so the tile never
  // rendered and the fetch never fired.
  it("renders the code tile for a groupless connect-leader role who picks a group in the panel", async () => {
    getJoinCodeForGroup.mockResolvedValue({ ok: true, code: "PICKEDCODE", groupId: OTHER_GROUP });

    const props: AppShellProps = { ...baseProps(), activeGroup: null, isAdminScope: true };
    render(React.createElement(AppShell, props));

    expandPanel();
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), { target: { value: String(OTHER_GROUP) } });
    const roleControl = screen.getByRole("group", { name: /role/i });
    fireEvent.click(within(roleControl).getByRole("button", { name: /^connect leader$/i }));
    const navLeader = screen
      .getAllByRole("button", { name: /^leader$/i })
      .find((el) => !roleControl.contains(el));
    fireEvent.click(navLeader!);

    await waitFor(() => expect(screen.getByText("PICKEDCODE")).toBeTruthy());
    expect(getJoinCodeForGroup).toHaveBeenCalledWith(OTHER_GROUP);
    expect(getOrCreateJoinCode).not.toHaveBeenCalled();
  });

  it("outside test mode, the original guarded path still runs getOrCreateJoinCode", async () => {
    searchParams.value = new URLSearchParams("");
    getOrCreateJoinCode.mockResolvedValueOnce({ ok: true, code: "REALWRITE" });

    render(React.createElement(AppShell, baseProps()));
    fireEvent.click(screen.getByRole("button", { name: "Leader" }));

    await waitFor(() => expect(getOrCreateJoinCode).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("REALWRITE")).toBeTruthy());
    expect(getJoinCodeForGroup).not.toHaveBeenCalled();
  });
});
