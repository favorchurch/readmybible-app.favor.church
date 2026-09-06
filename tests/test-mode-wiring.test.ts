// @vitest-environment jsdom

/**
 * Binds the sandbox write rule to AppShell's ACTUAL wiring.
 *
 * `tests/test-mode.test.ts` covers `writesBlocked` and `guardWrite` as pure
 * functions, but a pure-function test cannot catch the defect that mattered:
 * passing the same `blocked` flag to all five guarded actions. Review round 1
 * found exactly that -- `joinByCode` joins whatever group the *entered code*
 * names, not the simulated group, so a shared unblock let any code perform a
 * real Rock write and move the tester's active group.
 *
 * These render the real component in the most permissive state that exists
 * (simulating the sandbox, from a session really in the sandbox, sandbox
 * configured) and assert which action modules actually get called. Revert the
 * per-action split in AppShell and these go red.
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SANDBOX = 87177;

const checkIn = vi.fn(async () => ({ ok: true, group: null }));
const joinByCode = vi.fn(async () => ({ ok: true }));
const chooseGroup = vi.fn(async () => ({ ok: true }));
const saveProfile = vi.fn(async () => ({ ok: true }));
const getOrCreateJoinCode = vi.fn(async () => ({ ok: true, code: "TEST12" }));
const getTestGroupSnapshot = vi.fn(async () => ({ ok: false, error: "not used" }));

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  // Test mode active. `groupId` is client state, not a URL param, so the
  // sandbox selection is made through the panel below.
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
    // The session is REALLY in the sandbox -- the only state in which
    // writesBlocked permits anything at all.
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

/**
 * Put the panel into the fully-matching sandbox state.
 *
 * The session's real active group IS the sandbox, and the picker filters the
 * real active group out of the campus list -- so the sandbox is selected as
 * the first option ("(my group)", value ""), which `writesBlocked` resolves
 * back to the real active group. Expanding the panel is enough; the default
 * selection is already the sandbox.
 */
function selectSandbox() {
  fireEvent.click(screen.getByRole("button", { name: /show/i }));
}

afterEach(() => cleanup());
beforeEach(() => {
  [checkIn, joinByCode, chooseGroup, saveProfile, getOrCreateJoinCode, getTestGroupSnapshot].forEach((m) =>
    m.mockClear(),
  );
});

describe("AppShell wiring: the sandbox unblock reaches check-in only", () => {
  /**
   * CONTROL. Without this, the joinByCode assertion below is vacuous: if the
   * panel never actually reached the sandbox state, `blocked` stays true, every
   * action is blocked, and "joinByCode was not called" passes for the wrong
   * reason -- it would still pass with the per-action split reverted.
   *
   * Asserting checkIn IS reached proves `blocked === false` here, which is the
   * only state in which the joinByCode assertion has any teeth.
   */
  it("reaches the unblocked sandbox state (control: proves writes are NOT blocked)", async () => {
    render(React.createElement(AppShell, baseProps()));
    selectSandbox();

    // The panel renders this note only when `writesBlocked(...)` returned
    // false. If the selection had not taken, it would read "View-only. Writes
    // disabled" instead and every assertion below would pass for the wrong
    // reason.
    expect(await screen.findByText(/writes are REAL/i)).toBeTruthy();
  });

  it("never calls joinByCode in that same unblocked state", async () => {
    render(React.createElement(AppShell, baseProps()));
    selectSandbox();

    // Same control, inline: this test only means something if writes really
    // are unblocked at this point.
    expect(await screen.findByText(/writes are REAL/i)).toBeTruthy();

    // Non-member renders SoloScreen, the only surface that submits a join code.
    fireEvent.click(screen.getByRole("button", { name: /non-member/i }));

    // SoloScreen keeps the form behind a button until you opt in.
    fireEvent.click(screen.getByRole("button", { name: /enter a group code/i }));
    const input = screen.getByPlaceholderText("F52A");
    fireEvent.change(input, { target: { value: "F52A" } });
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByText(/writes are disabled/i)).toBeTruthy();
    expect(joinByCode).not.toHaveBeenCalled();
  });
});

describe("AppShell wiring: a simulated group never falls back to the real group", () => {
  it("renders no roster while a selected group's snapshot is unavailable", async () => {
    getTestGroupSnapshot.mockResolvedValueOnce({ ok: false, error: "Group 999 has an empty roster." });

    const props = baseProps();
    props.campusGroups = [{ groupId: 999, groupName: "Some Other Group" }];
    render(React.createElement(AppShell, props));

    fireEvent.click(screen.getByRole("button", { name: /show/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "999" } });

    // "Rico Test" is the REAL group's only member. It must not appear under a
    // different group's selection -- that was the silent wrong-group render.
    await waitFor(() => {
      expect(screen.queryByText("Rico Test")).toBeNull();
    });
  });
});
