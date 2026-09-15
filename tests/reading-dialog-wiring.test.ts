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

/** Mutable so one test can turn test mode on; reset in beforeEach. */
const search = { value: "" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
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
  search.value = "";
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

describe("review regressions", () => {
  it("F1: a later sentinel entry never paints a celebration over a failed check-in", async () => {
    checkIn.mockImplementation(async () => ({ ok: false, error: "network down" }) as never);
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    const retry = await screen.findByRole("button", { name: /tap to retry/i });
    expect(retry).toBeTruthy();

    // The reader scrolls up and back down while the failure is on screen.
    reachBottomAgain();
    reachBottomAgain();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // The retry must survive, and no celebration may appear for a day that
    // was never recorded.
    expect(screen.queryByText(/COINS ADDED/i)).toBeNull();
    expect(screen.getByRole("button", { name: /tap to retry/i })).toBeTruthy();
  });

  it("F2: a late result never drives the chapter the reader has since opened", async () => {
    // Keyed by chapter: chapter 11 starts its own in-flight write when it is
    // opened, and a single shared resolver would release the wrong promise.
    // One entry per attempt, not per chapter: checkInWithRetry makes a second
    // attempt for the same chapter, and both must be released to reach the
    // final failed state.
    const pending = new Map<number, ((value: { ok: false; error: string }) => void)[]>();
    checkIn.mockImplementation(
      ((input: CheckInInput) =>
        new Promise((resolve) => {
          const list = pending.get(input.chapter) ?? [];
          list.push(resolve as (value: { ok: false; error: string }) => void);
          pending.set(input.chapter, list);
        })) as never,
    );
    async function failAll(chapter: number) {
      for (let i = 0; i < 4; i++) {
        const list = pending.get(chapter) ?? [];
        while (list.length) list.shift()?.({ ok: false, error: "network down" });
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    render(React.createElement(AppShell, baseProps()));

    // Chapter 12 (today): sentinel fires, request hangs in flight.
    openReadingDialog();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
    expect(checkIn.mock.calls[0][0].chapter).toBe(12);

    const close = document.querySelector(".reading-dialog-sheet .close-button");
    fireEvent.click(close as Element);

    // Move back to chapter 11 and open it. Its own sentinel fires and is
    // blocked only by its own state, not by chapter 12's.
    fireEvent.click(screen.getByRole("button", { name: /previous chapter/i }));
    openReadingDialog();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Chapter 12's request now fails, with chapter 11 on screen.
    await failAll(12);

    // Chapter 11 must not inherit chapter 12's failure: tapping a retry here
    // would write a check-in for a chapter this reader never finished.
    // Chapter 11 must not inherit chapter 12's failure in any form: neither a
    // retry button (tapping it would write a chapter this reader never
    // finished) nor the "retrying" tick that precedes it.
    expect(screen.queryByRole("button", { name: /tap to retry/i })).toBeNull();
    expect(document.querySelector("#reading-dialog-title")?.textContent).toContain("11");
    expect(document.querySelector(".reading-tick")?.getAttribute("data-state")).not.toBe("failed");
  });

  it("F3: a scripture fetch error never checks the reader in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("F7: a blocked test-mode sentinel entry never reaches the server action", async () => {
    // Test mode on with no sandbox configured, so writesBlocked is true. This
    // is the wiring half of the rule tests/reading-tick.test.ts proves purely.
    search.value = "test=1";
    render(React.createElement(AppShell, baseProps({ testWritableGroupId: null })));
    openReadingDialog();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(checkIn).not.toHaveBeenCalled();
  });
});
