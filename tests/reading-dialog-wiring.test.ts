// @vitest-environment jsdom

/**
 * Binds the scroll-to-bottom check-in to AppShell's ACTUAL wiring.
 *
 * `tests/reading-tick.test.ts` covers `shouldWrite` as a pure function, but a
 * pure-function test cannot catch the defect that matters here: the sentinel
 * re-enters the viewport every time the reader scrolls back down, so a missing
 * fired-chapter guard writes again on every bounce. These render the real
 * component and count calls to the real action module.
 *
 * The same lesson as issue #58 -- wiring is what breaks, so wiring is what has
 * to be asserted.
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type CheckInInput = { chapter: number; timezone: string; sandboxGroupId?: number };
const checkIn = vi.fn(async (input: CheckInInput) => ({ ok: true, group: null, input }));

vi.mock("@/app/actions/checkIn", () => ({ checkIn: (input: CheckInInput) => checkIn(input) }));
vi.mock("@/app/actions/joinByCode", () => ({ joinByCode: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/chooseGroup", () => ({ chooseGroup: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/saveProfile", () => ({ saveProfile: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/actions/getOrCreateJoinCode", () => ({
  getOrCreateJoinCode: vi.fn(async () => ({ ok: true, code: "TEST12" })),
}));
vi.mock("@/app/actions/getTestGroupSnapshot", () => ({
  getTestGroupSnapshot: vi.fn(async () => ({ ok: false, error: "not used" })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

import { AppShell, type AppShellProps, type RosterMemberView } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";

const GROUP = 24077;

/**
 * jsdom has no IntersectionObserver and no layout. This stub reports the
 * sentinel as visible when observed and exposes a way to fire it again, which
 * is how a reader scrolling back down to the bottom is modelled here.
 */
const observers: { callback: IntersectionObserverCallback; target: Element | null }[] = [];

class ReplayableIntersectionObserver {
  private readonly entry: { callback: IntersectionObserverCallback; target: Element | null };
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, target: null };
    observers.push(this.entry);
  }
  observe(target: Element) {
    this.entry.target = target;
    this.fire();
  }
  fire() {
    if (!this.entry.target) return;
    this.entry.callback(
      [{ isIntersecting: true, target: this.entry.target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Model the reader scrolling away and back down to the bottom again. */
function reachBottomAgain() {
  for (const o of observers) {
    if (!o.target) continue;
    o.callback(
      [{ isIntersecting: true, target: o.target } as unknown as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );
  }
}

const roster: RosterMemberView[] = [
  {
    personId: 13358,
    avatar: { ...defaultAvatarConfig },
    isSelf: true,
    name: "Rico Test",
    isLeader: false,
    readToday: false,
    chapters: [],
    readingDates: [],
  },
];

function baseProps(overrides: Partial<AppShellProps> = {}): AppShellProps {
  return {
    displayName: "Rico Test",
    avatar: { ...defaultAvatarConfig },
    avatarCustomized: true,
    translation: "NIV",
    memberships: [],
    activeGroup: { groupId: GROUP, groupName: "Connect Group", campusId: 5, roleId: 23, isLeader: false },
    needsGroupChoice: false,
    isLeader: false,
    campusName: "OPEN ACCESS",
    roster,
    chapters: [],
    readingDates: [],
    groupStats: { checkinCount: 0, memberCount: 1, ratio: 0, readersTodayIds: [] },
    campusBoard: [],
    appBaseUrl: "https://example.test",
    devMockToday: "2026-10-12",
    campusGroups: [],
    testWritableGroupId: null,
    ...overrides,
  };
}

/** The card's single entrypoint. Reads "Read. Nice one." once the day is done. */
function openReadingDialog() {
  fireEvent.click(screen.getByRole("button", { name: /read matthew|read\. nice one/i }));
}

beforeEach(() => {
  observers.length = 0;
  checkIn.mockClear();
  checkIn.mockImplementation(async (input: CheckInInput) => ({ ok: true, group: null, input }));
  vi.stubGlobal("IntersectionObserver", ReplayableIntersectionObserver);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ref: "Matthew 12",
          translation: "NIV",
          text: "Then one said unto him.",
          bibleComUrl: "",
          attribution: "NIV attribution",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the scroll tick records a reading exactly once", () => {
  it("checks in when the reader reaches the bottom", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
  });

  it("does not check in again when the reader scrolls back down (D5/D6)", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));

    reachBottomAgain();
    reachBottomAgain();
    reachBottomAgain();

    // Give any stray write a chance to land before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkIn).toHaveBeenCalledTimes(1);
  });

  it("never checks in for a chapter already marked read (D8)", async () => {
    render(React.createElement(AppShell, baseProps({ chapters: [12], readingDates: ["2026-10-12"] })));
    openReadingDialog();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("shows the celebration in the same dialog, with no confirm button to press (D2)", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/COINS ADDED/i)).toBeTruthy();
  });
});

describe("a failed check-in is surfaced rather than silently lost (D9)", () => {
  it("retries once, then offers a retry the reader can tap", async () => {
    checkIn.mockImplementation(async () => ({ ok: false, error: "network down" }) as never);
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    // One silent retry, so two calls before anything is shown.
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: /tap to retry/i })).toBeTruthy();
  });

  it("writes again when the retry is tapped, because the first attempt was released", async () => {
    checkIn.mockImplementation(async () => ({ ok: false, error: "network down" }) as never);
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    const retry = await screen.findByRole("button", { name: /tap to retry/i });
    checkIn.mockClear();
    checkIn.mockImplementation(async (input: CheckInInput) => ({ ok: true, group: null, input }));
    fireEvent.click(retry);

    await waitFor(() => expect(checkIn).toHaveBeenCalled());
    expect(await screen.findByText(/COINS ADDED/i)).toBeTruthy();
  });
});
