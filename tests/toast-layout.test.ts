// @vitest-environment jsdom

/**
 * The transient save toast (app/styles/toast.css) is position:fixed with a
 * high z-index, so it can paint over whatever the reading sheet happens to
 * have scrolled to -- including the NET licensing attribution and the "You
 * have read" completion pill. The previous version of this test only
 * string-matched the stylesheet, so it stayed green while that occlusion
 * survived: it never rendered the sheet and the toast together.
 *
 * This renders the real AppShell, drives a check-in to completion (which
 * fires both the save toast and the completion pill), loads the real
 * stylesheets into jsdom, and asserts via getComputedStyle that the reading
 * dialog's stacking order beats the toast's -- so the toast can never paint
 * over it, regardless of where the reader has scrolled to.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";
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

const search = { value: "" };
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { AppShell, type AppShellProps, type RosterMemberView } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";

const GROUP = 24099;

const observers: { callback: IntersectionObserverCallback; target: Element | null }[] = [];
const openState = { intersecting: false };

/** Same replay stub as tests/reading-dialog-wiring.test.ts -- jsdom has no real IntersectionObserver. */
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
    const at = observers.indexOf(this.entry);
    if (at >= 0) observers.splice(at, 1);
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

let mockNow = 1000;

function reachBottomAgain() {
  for (const o of observers) {
    if (!o.target) continue;
    o.callback(
      [{ isIntersecting: true, target: o.target } as unknown as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );
  }
}

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

function openReadingDialog() {
  fireEvent.click(screen.getByRole("button", { name: /read matthew|read\. nice one/i }));
}

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

/**
 * Loads the real stylesheets into jsdom's CSSOM so getComputedStyle resolves
 * the actual cascade (including the :has() stacking rule), instead of a
 * hand-rolled fixture that could silently drift from production CSS.
 */
function loadRealStylesheets() {
  const style = document.createElement("style");
  style.textContent = [
    readFileSync(fileURLToPath(new NodeURL("../app/styles/sheet.css", import.meta.url)), "utf8"),
    readFileSync(fileURLToPath(new NodeURL("../app/styles/toast.css", import.meta.url)), "utf8"),
  ].join("\n");
  document.head.appendChild(style);
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
          attribution: "Scripture quotations marked NIV are from the NIV.",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }),
  );
  loadRealStylesheets();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.head.innerHTML = "";
});

describe("transient toast vs. reading sheet stacking", () => {
  it("R6: the reading dialog outranks the save toast, so the NET attribution and completion pill can never be painted over", async () => {
    render(React.createElement(AppShell, baseProps()));
    openReadingDialog();
    await reachBottom();
    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));

    // Both the toast and the reading sheet's licensing text are on screen at
    // the same time -- this is the composition the old CSS-string test never
    // rendered.
    const toastViewport = document.querySelector(".toast-viewport");
    const attribution = document.querySelector(".passage-attribution");
    expect(toastViewport).toBeTruthy();
    expect(attribution?.textContent).toContain("NIV");
    expect(screen.getByText(/you have read/i)).toBeTruthy();

    const readingWrap = document.querySelector(".modal-wrap:has(.reading-dialog-sheet)");
    expect(readingWrap).toBeTruthy();

    const wrapZ = Number(getComputedStyle(readingWrap as Element).zIndex);
    const toastZ = Number(getComputedStyle(toastViewport as Element).zIndex);
    // A strictly higher stacking order for the reading dialog means it
    // paints in front of the toast wherever the two fixed-position elements
    // overlap on screen -- the toast cannot occlude the attribution or the
    // pill, regardless of scroll position, which a fixed-position toast has
    // no way to know about.
    expect(wrapZ).toBeGreaterThan(toastZ);
  });
});
