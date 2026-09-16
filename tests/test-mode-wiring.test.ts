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
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SANDBOX = 87177;

// Mutable so the #121 Leader-tab tests below can flip test mode off for one
// case (real-user admin scope, no simulation) without disturbing every other
// test in this file, which relies on test mode being active by default.
const searchParams = vi.hoisted(() => ({ value: new URLSearchParams("test=1") }));

type CheckInInput = { chapter: number; timezone: string; sandboxGroupId?: number };
const checkIn = vi.fn(async (input: CheckInInput) => ({ ok: true, group: null, input }));
const joinByCode = vi.fn(async () => ({ ok: true }));
const chooseGroup = vi.fn(async () => ({ ok: true }));
const saveProfile = vi.fn(async () => ({ ok: true }));
const getOrCreateJoinCode = vi.fn(async () => ({ ok: true, code: "TEST12" }));
const getTestGroupSnapshot = vi.fn(async () => ({ ok: false, error: "not used" }));
const getJoinCodeForGroup = vi.fn(async () => ({ ok: true, code: null }));

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
vi.mock("@/app/actions/getJoinCodeForGroup", () => ({
  getJoinCodeForGroup: (...a: unknown[]) => getJoinCodeForGroup(...(a as [])),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  // Test mode active by default. `groupId` is client state, not a URL param,
  // so the sandbox selection is made through the panel below.
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
    sectionSlot: null,
    campusGroups: [{ groupId: SANDBOX, groupName: "TEST // Connect Group" }],
    testModeAuthorized: true,
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
  // The panel is expanded by default (#127); click Show only if a test or a
  // future default leaves it collapsed, so this setup asserts nothing about it.
  {
    const show = screen.queryByRole("button", { name: /^show$/i });
    if (show) fireEvent.click(show);
  }
}

/**
 * The reading dialog ticks when a sentinel below the passage scrolls into
 * view. jsdom has no IntersectionObserver and no layout, so stub it to report
 * the sentinel as visible the moment it is observed -- that IS "the reader
 * reached the bottom" for the purposes of this wiring test.
 */
class ImmediateIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    // Two callbacks, because D13 distinguishes them: the first reports the
    // state on open (not yet at the end -- a chapter that overflows the
    // sheet), and the second is the reader scrolling down to it. Reporting
    // the end as visible on the first callback would mean a no-scroll dwell,
    // which is not what this test is about.
    const fire = (isIntersecting: boolean) =>
      this.callback(
        [{ isIntersecting, target } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    fire(false);
    queueMicrotask(() => fire(true));
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** The dialog fetches its passage before arming the sentinel. */
function stubScriptureFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ref: "Matthew 1",
          translation: "NIV",
          text: "In the beginning.",
          verses: { "1": "In the beginning." },
          bibleComUrl: "",
          attribution: "",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  searchParams.value = new URLSearchParams("test=1");
});
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);
  stubScriptureFetch();
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
  /**
   * CONTROL. Reaching `checkIn` is the only assertion that proves
   * `blocked === false` INDEPENDENTLY. The panel's "writes are REAL" note is
   * not a control on its own: TestModePanel calls `writesBlocked` itself, so
   * that text only restates the function under test and would still render if
   * AppShell stopped honouring the result (round-3 finding 2).
   *
   * This also pins checkIn's own binding: change AppShell to pass
   * `testMode.active` to checkIn like the other four and this goes red.
   */
  it("actually calls checkIn in the sandbox state (control: writes are NOT blocked)", async () => {
    render(React.createElement(AppShell, baseProps()));
    selectSandbox();

    // Today screen -> opens the reading dialog. Reaching the bottom of the
    // passage is the check-in now; there is no confirm button to press.
    fireEvent.click(screen.getByRole("button", { name: /read matthew/i }));

    await waitFor(() => {
      expect(checkIn).toHaveBeenCalled();
    });
    // And it carries the sandbox id, so the server can re-check the claim
    // against the live session instead of trusting this page's stale props.
    expect(checkIn.mock.calls[0][0]).toMatchObject({ sandboxGroupId: SANDBOX });
  });

  it("never calls joinByCode in that same unblocked state", async () => {
    render(React.createElement(AppShell, baseProps()));
    selectSandbox();

    // Same control, inline: this test only means something if writes really
    // are unblocked at this point.
    expect(await screen.findByText(/writes are REAL/i)).toBeTruthy();

    // New renders SoloScreen, the only surface that submits a join code.
    fireEvent.click(screen.getByRole("button", { name: /^new$/i }));

    // SoloScreen keeps the form behind a button until you opt in.
    fireEvent.click(screen.getByRole("button", { name: /enter a group code/i }));
    const input = screen.getByPlaceholderText("F52A");
    fireEvent.change(input, { target: { value: "F52A" } });
    fireEvent.submit(input.closest("form")!);

    // Two surfaces now show the blocked reason (the inline form error and the
    // #126 bottom toast), so this can no longer assume a single match.
    expect((await screen.findAllByText(/writes are disabled/i)).length).toBeGreaterThan(0);
    expect(joinByCode).not.toHaveBeenCalled();
  });
});

describe("AppShell wiring: a simulated group never falls back to the real group", () => {
  it("renders no roster while a selected group's snapshot is unavailable", async () => {
    getTestGroupSnapshot.mockResolvedValueOnce({ ok: false, error: "Group 999 has an empty roster." });

    const props = baseProps();
    props.campusGroups = [{ groupId: 999, groupName: "Some Other Group" }];
    render(React.createElement(AppShell, props));

    // The panel is expanded by default (#127); click Show only if a test or a
    // future default leaves it collapsed, so this setup asserts nothing about it.
    {
    const show = screen.queryByRole("button", { name: /^show$/i });
    if (show) fireEvent.click(show);
  }
    fireEvent.change(screen.getByRole("combobox", { name: "Group" }), { target: { value: "999" } });

    // "Rico Test" is the REAL group's only member. It must not appear under a
    // different group's selection -- that was the silent wrong-group render.
    await waitFor(() => {
      expect(screen.queryByText("Rico Test")).toBeNull();
    });
  });
});

/**
 * #121: in test mode, the simulated role must be the SOLE authority for the
 * Leader tab -- a real signed-in user with admin scope (`props.isAdminScope === true`)
 * simulating a plain member must not still see it. Before the fix,
 * `isAdminScope` OR'd in `props.isAdminScope` regardless of which role was
 * being simulated, so `canSeeLeaderTab` stayed true no matter what role was selected.
 */
describe("AppShell wiring: the Leader tab follows the simulated role, not the real user's scope (#121)", () => {
  function mainNav() {
    return screen.getByRole("navigation", { name: "Main navigation" });
  }

  function pickRole(label: "Member" | "Connect Leader" | "Department" | "Cluster" | "Regional" | "New") {
    // The panel is expanded by default (#127); click Show only if some
    // future default leaves it collapsed. Asserts nothing either way.
    const show = screen.queryByRole("button", { name: /^show$/i });
    if (show) fireEvent.click(show);
    const roleGroup = screen.getByRole("group", { name: "Role" });
    fireEvent.click(within(roleGroup).getByRole("button", { name: label }));
  }

  it("REGRESSION: hides the Leader tab for a simulated member even though the real user has admin scope", () => {
    const props: AppShellProps = { ...baseProps(), isAdminScope: true };
    render(React.createElement(AppShell, props));

    // The panel already defaults to role "member"; select it explicitly so
    // the test does not depend on that default silently changing later.
    pickRole("Member");

    expect(within(mainNav()).queryByRole("button", { name: "Leader" })).toBeNull();
  });

  it("hides the Leader tab for a simulated new role", () => {
    const props: AppShellProps = { ...baseProps(), isAdminScope: true };
    render(React.createElement(AppShell, props));

    pickRole("New");

    // Role "new" renders SoloScreen instead of the shell -- there is
    // no bottom nav to find the Leader tab in at all.
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).toBeNull();
  });

  it("shows the Leader tab for a simulated connect leader", () => {
    const props = baseProps();
    render(React.createElement(AppShell, props));

    pickRole("Connect Leader");

    expect(within(mainNav()).getByRole("button", { name: "Leader" })).toBeTruthy();
  });

  it("shows the Leader tab for a simulated department role", () => {
    const props = baseProps();
    render(React.createElement(AppShell, props));

    pickRole("Department");

    expect(within(mainNav()).getByRole("button", { name: "Leader" })).toBeTruthy();
  });

  it("renders the section surface only for the three simulated admin roles", () => {
    const roles = [
      ["New", false],
      ["Member", false],
      ["Connect Leader", false],
      ["Department", true],
      ["Cluster", true],
      ["Regional", true],
    ] as const;

    for (const [role, hasSectionSurface] of roles) {
      cleanup();
      const props: AppShellProps = {
        ...baseProps(),
        isAdminScope: true,
        sectionSlot: React.createElement("div", { "data-testid": "section-surface" }, "Section surface"),
      };
      render(React.createElement(AppShell, props));
      pickRole(role);

      if (hasSectionSurface || role === "Connect Leader") {
        fireEvent.click(within(mainNav()).getByRole("button", { name: "Leader" }));
      }

      expect(screen.queryByTestId("section-surface") !== null).toBe(hasSectionSurface);
    }
  });

  it("defaults test mode to the real Brisbane campus", () => {
    const props = Object.assign(baseProps(), { campusId: 2 }) as AppShellProps;
    render(React.createElement(AppShell, props));

    expect(screen.getByRole("button", { name: "BNE" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "MNL" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("publishes role and campus selections for the server scope", () => {
    window.history.replaceState(null, "", "/?test=1");
    render(React.createElement(AppShell, baseProps()));

    fireEvent.click(screen.getByRole("button", { name: "BNE" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Role" })).getByRole("button", { name: "Regional" }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("role")).toBe("regional");
    expect(params.get("campus")).toBe("BNE");
  });

  it.each(["global", "sections", "cluster", "region"])(
    "keeps the legacy ?scope=%s link on the section surface",
    (scope) => {
      cleanup();
      searchParams.value = new URLSearchParams(`test=1&scope=${scope}`);
      const props: AppShellProps = {
        ...baseProps(),
        isAdminScope: true,
        sectionSlot: React.createElement("div", { "data-testid": "section-surface" }, "Section surface"),
      };
      render(React.createElement(AppShell, props));

      fireEvent.click(within(mainNav()).getByRole("button", { name: "Leader" }));
      expect(screen.getByTestId("section-surface")).toBeTruthy();
    },
  );

  it("no regression: outside test mode, a real admin-scope user still sees the Leader tab", () => {
    searchParams.value = new URLSearchParams(""); // test mode off entirely
    const props: AppShellProps = { ...baseProps(), isAdminScope: true };
    render(React.createElement(AppShell, props));

    expect(within(mainNav()).getByRole("button", { name: "Leader" })).toBeTruthy();
  });
});
