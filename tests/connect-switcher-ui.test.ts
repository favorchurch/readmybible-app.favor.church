// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
const searchParams = vi.hoisted(() => ({ value: new URLSearchParams("test=1") }));
const chooseGroup = vi.hoisted(() => vi.fn(async (input: { groupId: number }): Promise<{ ok: true } | { ok: false; error: string }> => {
  void input;
  return { ok: true };
}));
const switcherChooseGroup = vi.hoisted(() => vi.fn(async (groupId: number): Promise<{ ok: true } | { ok: false; error: string }> => {
  void groupId;
  return { ok: true };
}));
const checkIn = vi.hoisted(() => vi.fn(async () => ({ ok: true as const, group: null })));
const joinByCode = vi.hoisted(() => vi.fn(async () => ({ ok: true as const })));
const saveProfile = vi.hoisted(() => vi.fn(async () => ({ ok: true as const })));
const getOrCreateJoinCode = vi.hoisted(() => vi.fn(async () => ({ ok: true as const, code: "TEST12" })));
const getTestGroupSnapshot = vi.hoisted(() => vi.fn(async () => ({ ok: false as const, error: "not used" })));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh, push: vi.fn() }),
  useSearchParams: () => searchParams.value,
}));
vi.mock("@/app/actions/chooseGroup", () => ({ chooseGroup }));
vi.mock("@/app/actions/checkIn", () => ({ checkIn }));
vi.mock("@/app/actions/joinByCode", () => ({ joinByCode }));
vi.mock("@/app/actions/saveProfile", () => ({ saveProfile }));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({ getOrCreateJoinCode }));
vi.mock("@/app/actions/getTestGroupSnapshot", () => ({ getTestGroupSnapshot }));

import { AppShell, type AppShellProps } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";
import { ConnectSwitcher } from "@/components/connect-switcher";

const memberships = [
  { groupId: 101, groupName: "Alpha Connect", campusId: 1, roleId: 24, isLeader: true },
  { groupId: 202, groupName: "Beta Connect", campusId: 2, roleId: 81, isLeader: true },
  { groupId: 303, groupName: "Gamma Connect", campusId: 3, roleId: 23, isLeader: false },
];

function switcherProps(overrides: Partial<React.ComponentProps<typeof ConnectSwitcher>> = {}) {
  return {
    memberships,
    activeGroup: memberships[0],
    pending: false,
    onChooseGroup: switcherChooseGroup,
    ...overrides,
  };
}

function appShellProps(): AppShellProps {
  return {
    displayName: "Alex",
    avatar: { ...defaultAvatarConfig },
    avatarCustomized: true,
    translation: "NIV",
    memberships,
    activeGroup: memberships[0],
    needsGroupChoice: false,
    isLeader: true,
    campusName: "Manila",
    roster: [],
    chapters: [],
    readingDates: [],
    groupStats: { checkinCount: 0, memberCount: 0, ratio: 0, readersTodayIds: [] },
    campusBoard: [],
    appBaseUrl: "http://localhost:3000",
    devMockToday: "2026-10-05",
    campusGroups: [],
    testWritableGroupId: null,
  };
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.value = new URLSearchParams("test=1");
  chooseGroup.mockResolvedValue({ ok: true });
  switcherChooseGroup.mockResolvedValue({ ok: true });
});

describe("ConnectSwitcher", () => {
  it("stays hidden for a single membership", () => {
    render(React.createElement(ConnectSwitcher, switcherProps({ memberships: [memberships[0]] })));
    expect(screen.queryByRole("button", { name: /switch connect group/i })).toBeNull();
  });

  it("shows every membership, the active selection, and constant-backed role labels", () => {
    render(React.createElement(ConnectSwitcher, switcherProps()));
    fireEvent.click(screen.getByRole("button", { name: /switch connect group/i }));

    expect(screen.getByRole("button", { name: /Alpha Connect.*Leader/i }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Beta Connect")).toBeTruthy();
    expect(screen.getByText("Assistant leader")).toBeTruthy();
    expect(screen.getByText("Member")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks a member-only active group without granting it a leader role", () => {
    render(React.createElement(ConnectSwitcher, switcherProps({ activeGroup: memberships[2] })));
    fireEvent.click(screen.getByRole("button", { name: /switch connect group/i }));

    expect(screen.getByRole("button", { name: /Gamma Connect.*Member/i }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Gamma Connect.*Member/i }).textContent).toContain("Member");
  });

  it("passes the selected authorized group through the callback and closes only after success", async () => {
    render(React.createElement(ConnectSwitcher, switcherProps()));
    fireEvent.click(screen.getByRole("button", { name: /switch connect group/i }));
    fireEvent.click(screen.getByRole("button", { name: /Beta Connect.*Assistant leader/i }));

    await waitFor(() => expect(switcherChooseGroup).toHaveBeenCalledWith(202));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Switch group" })).toBeNull());
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("keeps the sheet open and exposes a retryable error after a failed selection", async () => {
    switcherChooseGroup.mockResolvedValueOnce({ ok: false, error: "We couldn't save that group. Please try again." });
    render(React.createElement(ConnectSwitcher, switcherProps()));
    fireEvent.click(screen.getByRole("button", { name: /switch connect group/i }));
    fireEvent.click(screen.getByRole("button", { name: /Beta Connect.*Assistant leader/i }));

    expect((await screen.findByRole("alert")).textContent).toContain("couldn't save");
    expect(screen.getByRole("heading", { name: "Switch group" })).toBeTruthy();
  });
});

describe("AppShell test-mode switcher wiring", () => {
  it("is visible but blocks chooseGroup without changing state or refreshing", async () => {
    render(React.createElement(AppShell, appShellProps()));
    fireEvent.click(screen.getByRole("button", { name: /switch connect group/i }));
    fireEvent.click(screen.getByRole("button", { name: /Beta Connect.*Assistant leader/i }));

    expect((await screen.findByRole("alert")).textContent).toContain("Test mode: writes are disabled.");
    expect(chooseGroup).not.toHaveBeenCalled();
    expect(navigation.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /switch connect group.*Alpha Connect/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Switch group" })).toBeTruthy();
  });
});

describe("AppShell persisted switcher wiring", () => {
  it("passes a later authorized selection to the server action and refreshes after success", async () => {
    searchParams.value = new URLSearchParams();
    render(React.createElement(AppShell, appShellProps()));
    fireEvent.click(screen.getByRole("button", { name: /switch connect group/i }));
    fireEvent.click(screen.getByRole("button", { name: /Beta Connect.*Assistant leader/i }));

    await waitFor(() => expect(chooseGroup).toHaveBeenCalledWith({ groupId: 202 }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledTimes(1));
  });
});

describe("AppShell initial picker selection wiring", () => {
  function renderInitialPicker() {
    searchParams.value = new URLSearchParams();
    render(React.createElement(AppShell, { ...appShellProps(), needsGroupChoice: true }));
    return screen.getByRole("button", { name: /read with this group/i });
  }

  it("refreshes only after the initial selection succeeds", async () => {
    const button = renderInitialPicker();
    fireEvent.click(button);

    await waitFor(() => expect(chooseGroup).toHaveBeenCalledWith({ groupId: 101 }));
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the initial picker usable after a structured action failure", async () => {
    chooseGroup.mockResolvedValueOnce({ ok: false, error: "We couldn't save that group. Please try again." });
    const button = renderInitialPicker();
    fireEvent.click(button);

    expect((await screen.findByRole("alert")).textContent).toContain("couldn't save");
    expect(navigation.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /read with this group/i }).hasAttribute("disabled")).toBe(false);
  });

  it("maps a rejected initial action to a retryable alert without refreshing", async () => {
    chooseGroup.mockRejectedValueOnce(new Error("server action failed"));
    const button = renderInitialPicker();
    fireEvent.click(button);

    expect((await screen.findByRole("alert")).textContent).toContain("couldn't save");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("ignores a rapid duplicate initial selection while the action is in flight", async () => {
    let resolve: ((value: { ok: true }) => void) | undefined;
    chooseGroup.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const button = renderInitialPicker();
    fireEvent.click(button);
    fireEvent.click(button);

    expect(chooseGroup).toHaveBeenCalledTimes(1);
    resolve?.({ ok: true });
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledTimes(1));
  });
});
