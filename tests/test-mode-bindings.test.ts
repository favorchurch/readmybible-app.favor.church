// @vitest-environment jsdom

/**
 * Per-action binding tests for the four writes the sandbox must NEVER unblock.
 *
 * `tests/test-mode.test.ts` asserts the rule against a local `otherActionGate`
 * helper, not against AppShell -- so swapping any one of these bindings from
 * `testMode.active` to `blocked` leaves that suite green while the action
 * becomes reachable in the sandbox state (round-4 finding 2).
 *
 * Every test below renders in the fully-matching sandbox state, which is the
 * only state where the two flags differ: `testMode.active` is true and
 * `blocked` is false. So each assertion fails the moment its binding is
 * swapped, and for no other reason.
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SANDBOX = 87177;

type CheckInInput = { chapter: number; timezone: string; sandboxGroupId?: number };

const checkIn = vi.fn(async (input: CheckInInput) => ({ ok: true, group: null, input }));
const joinByCode = vi.fn(async () => ({ ok: true }));
const chooseGroup = vi.fn(async () => ({ ok: true }));
const saveProfile = vi.fn(async () => ({ ok: true }));
const getOrCreateJoinCode = vi.fn(async () => ({ ok: true, code: "TEST12" }));
const getTestGroupSnapshot = vi.fn(async () => ({ ok: false, error: "not used" }));

vi.mock("@/app/actions/checkIn", () => ({ checkIn: (input: CheckInInput) => checkIn(input) }));
vi.mock("@/app/actions/joinByCode", () => ({ joinByCode: (...a: unknown[]) => joinByCode(...(a as [])) }));
vi.mock("@/app/actions/chooseGroup", () => ({ chooseGroup: (...a: unknown[]) => chooseGroup(...(a as [])) }));
vi.mock("@/app/actions/saveProfile", () => ({ saveProfile: (...a: unknown[]) => saveProfile(...(a as [])) }));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({
  getOrCreateJoinCode: (...a: unknown[]) => getOrCreateJoinCode(...(a as [])),
}));
vi.mock("@/app/actions/getTestGroupSnapshot", () => ({
  getTestGroupSnapshot: (...a: unknown[]) => getTestGroupSnapshot(...(a as [])),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("test=1"),
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
    // The session is REALLY in the sandbox, so `blocked` is false. Any binding
    // wrongly reading `blocked` would let its action through here.
    activeGroup: { groupId: SANDBOX, groupName: "TEST // Connect Group", campusId: 5, roleId: 23, isLeader: false },
    needsGroupChoice: false,
    isLeader: false,
    campusName: "OPEN ACCESS",
    roster,
    chapters: [],
    readingDates: [],
    groupStats: { checkinCount: 0, memberCount: 1, ratio: 0, readersTodayIds: [] },
    campusBoard: [],
    appBaseUrl: "https://example.test",
    devMockToday: null,
    campusGroups: [{ groupId: SANDBOX, groupName: "TEST // Connect Group" }],
    testWritableGroupId: SANDBOX,
  };
}

/** Confirms `blocked === false`, so a passing assertion below means something. */
async function assertUnblocked() {
  fireEvent.click(screen.getByRole("button", { name: /show/i }));
  expect(await screen.findByText(/writes are REAL/i)).toBeTruthy();
}

afterEach(() => cleanup());
beforeEach(() => {
  [checkIn, joinByCode, chooseGroup, saveProfile, getOrCreateJoinCode, getTestGroupSnapshot].forEach((m) =>
    m.mockClear(),
  );
});

describe("saveProfile stays blocked in the sandbox state", () => {
  it("does not persist a profile edit", async () => {
    render(React.createElement(AppShell, baseProps()));
    await assertUnblocked();

    fireEvent.click(screen.getByRole("button", { name: /edit your avatar/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^save/i }));

    await waitFor(() => {
      expect(saveProfile).not.toHaveBeenCalled();
    });
  });
});

describe("chooseGroup stays blocked in the sandbox state", () => {
  /**
   * `needsGroupChoice` is `memberships.length > 1 && !chosenGroup`, while
   * `activeGroup` falls back to a membership regardless -- so the picker and a
   * sandbox active group genuinely co-occur for a reader in 2+ groups who has
   * not chosen one. This is not a contrived fixture.
   */
  it("does not write the picked group", async () => {
    const props = baseProps();
    props.needsGroupChoice = true;
    props.memberships = [
      { groupId: SANDBOX, groupName: "TEST // Connect Group", campusId: 5, roleId: 23, isLeader: false },
      { groupId: 24077, groupName: "Another Group", campusId: 5, roleId: 23, isLeader: false },
    ];
    render(React.createElement(AppShell, props));
    await assertUnblocked();

    fireEvent.click(screen.getByRole("button", { name: /another group/i }));
    fireEvent.click(screen.getByRole("button", { name: /read with this group/i }));

    await waitFor(() => {
      expect(chooseGroup).not.toHaveBeenCalled();
    });
  });
});

describe("getOrCreateJoinCode stays blocked in the sandbox state", () => {
  it("does not mint a join code for a simulated leader", async () => {
    render(React.createElement(AppShell, baseProps()));
    await assertUnblocked();

    // The join code is requested from an effect in the Leader screen (#66 moved
    // it there off Connect), and the Leader nav item only appears for a leader.
    // Simulate the leader viewer first, then open that tab.
    // "Leader" names both the panel's viewer control and the nav item, so scope
    // the first click to the panel's Viewer group.
    const viewerControl = screen.getByRole("group", { name: /viewer/i });
    fireEvent.click(within(viewerControl).getByRole("button", { name: /^leader$/i }));

    const navLeader = (await screen.findAllByRole("button", { name: /^leader$/i })).filter(
      (el) => !viewerControl.contains(el),
    );
    expect(navLeader).toHaveLength(1);
    fireEvent.click(navLeader[0]);

    await waitFor(() => {
      expect(getOrCreateJoinCode).not.toHaveBeenCalled();
    });
  });
});
