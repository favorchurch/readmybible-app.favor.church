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
vi.mock("@/app/actions/getJoinCodeForGroup", () => ({
  getJoinCodeForGroup: vi.fn(async () => ({ ok: true, code: null })),
}));

/** Mutable so one test can turn test mode on; reset in beforeEach. */
const search = { value: "" };

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { AppShell, type AppShellProps, type RosterMemberView } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";

const GROUP = 24099;

/**
 * jsdom has no IntersectionObserver and no layout. This stub reports whatever
 * `openState.intersecting` says on the first callback -- exactly what a real
 * observer does, which is report the current state the instant observe() is
 * called -- and exposes a way to fire it again, which is how a reader
 * scrolling down to the bottom is modelled here.
 *
 * `openState.intersecting` is the whole of D13: `false` is a chapter long
 * enough to overflow the sheet, so the reader has to scroll and the tick is
 * instant. `true` is a short body already fully in view on open, which must
 * dwell rather than record the day for merely opening the sheet.
 */
const observers: { callback: IntersectionObserverCallback; target: Element | null }[] = [];
const openState = { intersecting: false };

class ReplayableIntersectionObserver {
  private readonly entry: { callback: IntersectionObserverCallback; target: Element | null };
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, target: null };
    observers.push(this.entry);
  }
  observe(target: Element) {
    this.entry.target = target;
    this.entry.callback(
      [{ isIntersecting: openState.intersecting, target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {
    // Drop the entry so a closed dialog's observer cannot be fired again --
    // otherwise reachBottomAgain() drives stale closures from unmounted
    // dialogs and every multi-chapter assertion here measures the wrong one.
    const at = observers.indexOf(this.entry);
    if (at >= 0) observers.splice(at, 1);
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

let mockNow = 1000;

/** Model the reader scrolling down to the bottom (again). */
function reachBottomAgain() {
  for (const o of observers) {
    if (!o.target) continue;
    o.callback(
      [{ isIntersecting: true, target: o.target } as unknown as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );
  }
}

/** Wait for the passage to resolve and arm the sentinel, then scroll to it. */
async function reachBottom() {
  await waitFor(() => expect(observers.some((o) => o.target !== null)).toBe(true));
  mockNow += 16_000;
  reachBottomAgain();
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
    devMockToday: "2026-10-07",
    campusGroups: [],
    testModeAuthorized: true,
    testWritableGroupId: null,
    sectionSlot: null,
    ...overrides,
  };
}

/** The card's single entrypoint. Reads "Read. Nice one." once the day is done. */
function openReadingDialog() {
  fireEvent.click(screen.getByRole("button", { name: /read matthew|read\. nice one/i }));
}

/** The loading companion checks this on mount; jsdom has no real implementation. */
function mockMatchMedia(reduceMotion: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduceMotion : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  mockNow = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => mockNow);
  search.value = "";
  observers.length = 0;
  openState.intersecting = false;
  checkIn.mockClear();
  checkIn.mockImplementation(async (input: CheckInInput) => ({ ok: true, group: null, input }));
  mockMatchMedia(true);
  vi.stubGlobal("IntersectionObserver", ReplayableIntersectionObserver);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      const match = urlStr.match(/Matthew%20(\d+)|Matthew\+(\d+)|Matthew (\d+)/i);
      const ch = match ? match[1] || match[2] || match[3] : "5";
      return new Response(
        JSON.stringify({
          ref: `Matthew ${ch}`,
          translation: "NIV",
          text: `Then one said unto him in chapter ${ch}.`,
          verses: { "1": `Verse 1 of chapter ${ch}.`, "2": `Verse 2 of chapter ${ch}.` },
          bibleComUrl: "",
          attribution: "NIV attribution",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }),
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
    await reachBottom();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
  });

  it("does not check in again when the reader scrolls back down (D5/D6)", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await reachBottom();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));

    reachBottomAgain();
    reachBottomAgain();
    reachBottomAgain();

    // Give any stray write a chance to land before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkIn).toHaveBeenCalledTimes(1);
  });

  it("never checks in for a chapter already marked read (D8)", async () => {
    render(React.createElement(AppShell, baseProps({ chapters: [5], readingDates: ["2026-10-07"] })));
    openReadingDialog();
    await reachBottom();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("shows the celebration in the same dialog, with no confirm button to press (D2)", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await reachBottom();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
    // Details collapsed by default under "You have read" summary to minimize reading distraction
    expect(screen.queryByText(/POINTS ADDED/i)).toBeNull();
    // Clicking "You have read" reveals the completion details
    fireEvent.click(screen.getByRole("button", { name: /you have read/i }));
    expect(await screen.findByText(/POINTS ADDED/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /I read today/i })).toBeNull();
  });

  it("hides the completion details when the whole Read today row is clicked", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await reachBottom();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
    // Click to expand
    fireEvent.click(screen.getByRole("button", { name: /you have read/i }));
    await screen.findByText(/POINTS ADDED/i);

    // Click again to collapse
    fireEvent.click(screen.getByRole("button", { name: /you have read/i }));
    expect(screen.queryByText(/POINTS ADDED/i)).toBeNull();
    expect(checkIn).toHaveBeenCalledTimes(1);
  });
});

describe("a failed check-in is surfaced rather than silently lost (D9)", () => {
  it("retries once, then offers a retry the reader can tap", async () => {
    checkIn.mockImplementation(async () => ({ ok: false, error: "network down" }) as never);
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await reachBottom();

    // One silent retry, so two calls before anything is shown.
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: /tap to retry/i })).toBeTruthy();
  });

  it("writes again when the retry is tapped, because the first attempt was released", async () => {
    checkIn.mockImplementation(async () => ({ ok: false, error: "network down" }) as never);
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await reachBottom();

    const retry = await screen.findByRole("button", { name: /tap to retry/i });
    checkIn.mockClear();
    checkIn.mockImplementation(async (input: CheckInInput) => ({ ok: true, group: null, input }));
    fireEvent.click(retry);

    await waitFor(() => expect(checkIn).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: /you have read/i }));
    expect(await screen.findByText(/POINTS ADDED/i)).toBeTruthy();
  });
});

describe("review regressions", () => {
  it("F1: a later sentinel entry never paints a celebration over a failed check-in", async () => {
    checkIn.mockImplementation(async () => ({ ok: false, error: "network down" }) as never);
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await reachBottom();

    const retry = await screen.findByRole("button", { name: /tap to retry/i });
    expect(retry).toBeTruthy();

    // The reader scrolls up and back down while the failure is on screen.
    reachBottomAgain();
    reachBottomAgain();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // The retry must survive, and no celebration may appear for a day that
    // was never recorded.
    expect(screen.queryByText(/POINTS ADDED/i)).toBeNull();
    expect(screen.getByRole("button", { name: /tap to retry/i })).toBeTruthy();
  });

  it("F2: a late result never drives the chapter the reader has since opened", async () => {
    // Keyed by chapter: Day 2 starts its own in-flight write when it is
    // opened, and a single shared resolver would release the wrong promise.
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

    // Day 3 (today, chapter 5): sentinel fires, request hangs in flight.
    openReadingDialog();
    await reachBottom();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
    expect(checkIn.mock.calls[0][0].chapter).toBe(5);

    const close = document.querySelector(".reading-dialog-sheet .close-button");
    fireEvent.click(close as Element);

    // Move back to Day 2 (Matthew 3–4) and open it. Its own sentinel fires.
    fireEvent.click(screen.getByRole("button", { name: /previous chapter/i }));
    openReadingDialog();
    await reachBottom();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Chapter 5's request now fails, with Matthew 3–4 on screen.
    await failAll(5);

    expect(screen.queryByRole("button", { name: /tap to retry/i })).toBeNull();
    expect(document.querySelector("#reading-dialog-title")?.textContent).toContain("Matthew 3–4");
    expect(document.querySelector(".reading-tick")?.getAttribute("data-state")).not.toBe("failed");
  });

  it("F3: a scripture fetch error never checks the reader in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await new Promise((resolve) => setTimeout(resolve, 40));
    // The sentinel is never armed at all, so there is nothing to scroll to.
    expect(observers).toHaveLength(0);
    reachBottomAgain();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("a stale cached body with text but no verses renders nothing and never ticks", async () => {
    // The API sends Cache-Control: public, max-age=86400 and the dialog fetches
    // with the browser's default cache mode, so for a day after the per-verse
    // field shipped a returning reader is served a pre-deploy body: `text`
    // present, `verses` absent. That body renders no scripture at all, so it
    // must not arm. Arming off `text` here ticked the reader in for a chapter
    // the dialog never showed -- and every test in this file passed anyway,
    // because the shared mock had the same shape.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ref: "Matthew 5",
            translation: "NIV",
            text: "Then one said unto him.",
            bibleComUrl: "",
            attribution: "NIV attribution",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(observers).toHaveLength(0);
    reachBottomAgain();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("renders every verse with its number, and marks only the key verses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ref: "Matthew 5",
            translation: "NIV",
            text: "two three four thirteen",
            verses: { "2": "two", "3": "three", "4": "four", "13": "thirteen" },
            bibleComUrl: "",
            attribution: "NIV attribution",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => {
      const chapter = document.querySelector('[data-section="passage-chapter"]');
      expect(chapter).toBeTruthy();
      expect(chapter!.querySelectorAll(".passage-verse")).toHaveLength(4);
      expect([...chapter!.querySelectorAll(".passage-verse-number")].map((n) => n.textContent)).toEqual([
        "2",
        "3",
        "4",
        "13",
      ]);
      // The plan's key passage for Matthew 5 is 5:3-12, so 3 and 4 are key verses
      const keyed = [...chapter!.querySelectorAll('.passage-verse[data-key-verse="true"]')];
      expect(keyed.map((v) => v.querySelector(".passage-verse-number")?.textContent)).toEqual(["3", "4"]);
    });
  });

  it("says so when only the key passage is available, instead of substituting silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ref: "Matthew 5",
            translation: "NIV",
            text: "three four",
            verses: { "3": "three", "4": "four" },
            bibleComUrl: "",
            attribution: "NIV attribution",
            source: "key-passage-fallback",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => {
      expect(document.querySelector('[data-section="passage-degraded"]')).toBeTruthy();
    });
  });

  it("shows no degraded note for a complete chapter", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => {
      expect(document.querySelector('[data-section="passage-chapter"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-section="passage-degraded"]')).toBeNull();
  });

  it("F7: a blocked test-mode sentinel entry never reaches the server action", async () => {
    search.value = "test=1";
    render(React.createElement(AppShell, baseProps({ testWritableGroupId: null })));
    openReadingDialog();
    await reachBottom();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(checkIn).not.toHaveBeenCalled();
  });
});

describe("issue #123: the heading shows the chapter's full verse range", () => {
  it("shows the full range immediately, before the passage fetch resolves", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    expect(document.querySelector("#reading-dialog-title")?.textContent).toBe("Matthew 5:1-48");

    resolveFetch(
      new Response(
        JSON.stringify({
          ref: "Matthew 5",
          translation: "NIV",
          text: "Then one said unto him.",
          verses: { "1": "Then one said unto him." },
          bibleComUrl: "",
          attribution: "NIV attribution",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  });

  it("shows the whole chapter's range, not the 2-3 verse fallback range, under key-passage-fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ref: "Matthew 5",
            translation: "NIV",
            text: "three four",
            verses: { "3": "three", "4": "four" },
            bibleComUrl: "",
            attribution: "NIV attribution",
            source: "key-passage-fallback",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    await waitFor(() => {
      expect(document.querySelector('[data-section="passage-degraded"]')).toBeTruthy();
    });
    expect(document.querySelector("#reading-dialog-title")?.textContent).toBe("Matthew 5:1-48");
  });
});

describe("issue #125: verse loading shows the companion glyph, not bare text", () => {
  it("renders the splash companion glyph while the passage fetches", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    expect(document.querySelector(".passage-loading .splash-companion")).toBeTruthy();

    resolveFetch(
      new Response(
        JSON.stringify({
          ref: "Matthew 5",
          translation: "NIV",
          text: "Then one said unto him.",
          verses: { "1": "Then one said unto him." },
          bibleComUrl: "",
          attribution: "NIV attribution",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  });

  it("announces the loading status to a screen reader via role=status", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    const status = document.querySelector(".passage-loading[role='status']") as HTMLElement | null;
    expect(status).toBeTruthy();
    expect(status!.querySelector(".splash-companion")?.getAttribute("aria-hidden")).toBe("true");
    expect(status!.textContent).toMatch(/loading matthew 5:1-48/i);

    resolveFetch(
      new Response(
        JSON.stringify({
          ref: "Matthew 5",
          translation: "NIV",
          text: "Then one said unto him.",
          verses: { "1": "Then one said unto him." },
          bibleComUrl: "",
          attribution: "NIV attribution",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  });

  it("leaves the error-state copy unchanged", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    expect(await screen.findByText("This chapter is available at Bible.com.")).toBeTruthy();
    expect(document.querySelector(".passage-loading")).toBeNull();
  });

  it("renders the commentaries section inside link-groups", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();

    const commentariesSummary = await screen.findByText("Commentaries");
    expect(commentariesSummary).toBeTruthy();
    const disclosure = commentariesSummary.closest("details");
    expect(disclosure).toBeTruthy();
    expect(disclosure?.classList.contains("link-group")).toBe(true);

    const linkRow = disclosure?.querySelector(".link-group-row");
    expect(linkRow).toBeTruthy();
    expect(disclosure?.querySelector("a[href*='enduringword.com']")).toBeTruthy();
  });
});

describe("qualification: 15s elapsed and 3s bottom eligibility delay", () => {
  it("does not qualify when reaching bottom before 3s mark", async () => {
    openState.intersecting = false;
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => expect(observers.some((o) => o.target !== null)).toBe(true));

    // Scroll to bottom at t = 2s
    mockNow += 2000;
    reachBottomAgain();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(checkIn).not.toHaveBeenCalled();

    // Even if waiting until t = 16s, bottom reached before 3s did not arm check-in
    mockNow += 14000;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("qualifies when re-reaching bottom after 3s mark once 15s have elapsed", async () => {
    openState.intersecting = false;
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => expect(observers.some((o) => o.target !== null)).toBe(true));

    // Scroll to bottom at t = 16s (>= 3s and >= 15s)
    mockNow += 16000;
    reachBottomAgain();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
  });

  it("arms dwell when reaching bottom at t >= 3s but before 15s", async () => {
    openState.intersecting = false;
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await waitFor(() => expect(observers.some((o) => o.target !== null)).toBe(true));

    // Scroll to bottom at t = 4s (eligible, but < 15s)
    mockNow += 4000;
    reachBottomAgain();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(checkIn).not.toHaveBeenCalled();
    expect(document.querySelector("[data-section='reading-tick-dwell']")).toBeTruthy();
    expect(document.querySelector(".reading-tick")?.getAttribute("data-dwelling")).toBe("true");
  });
});
