import { GRACE_DATES, PLAN, dayLabelNumber, displayPhase, planPhase, todaysEntry } from "@/lib/plan";
import type { TodayState } from "@/components/use-today";
import { CAMPUS_ROOT_SECTION_IDS, GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";

/** `?test=1` opens the panel directly; `?day=N` is an alias that also seeds the day. */
export const TEST_MODE_PARAM = "test";
export const DAY_PARAM = "day";

export const TEST_MODE_BLOCKED_MESSAGE = "Test mode: writes are disabled.";

export type SimulatedPhase = "pre-launch" | "active" | "grace" | "closed";

/**
 * The roles the panel can simulate, widest scope first among the admin tiers.
 *
 * - `new`            -- no Connect Group at all; the first-run/solo experience.
 * - `member`         -- an ordinary GT25 member.
 * - `connect-leader` -- a GT25 leader; gets the Leader tab for their own group.
 * - `department`     -- admin scope over a whole campus subtree (widest).
 * - `cluster`        -- admin scope over a cluster, which contains regions.
 * - `regional`       -- admin scope over a single region (narrowest).
 *
 * `new` replaces the old `non-member`; `connect-leader` replaces `leader`; the
 * single `admin` value is split into the three real admin tiers, because an
 * undifferentiated "admin" could not reproduce what a regional head actually
 * sees.
 *
 * ORDERING NOTE: cluster is placed ABOVE regional here on the codebase's own
 * evidence -- `resolveScopeRole` (lib/admin/access.ts) classifies a section as
 * "Cluster Head" precisely when it HAS child sections (regions), and
 * "Regional Leader" when its children are leaf Connect Groups. If Favor's org
 * language actually puts region above cluster, swap the two ids in
 * `SIMULATED_SECTION_ROOTS` -- nothing else depends on the order.
 */
export type TestModeRole =
  | "new"
  | "member"
  | "connect-leader"
  | "department"
  | "cluster"
  | "regional";

export type SyntheticTestModeScenario =
  | "two-regions"
  | "two-connect-memberships"
  | "multi-scope-leadership"
  | "connect-and-upstream-leader"
  | "upstream-leader-no-connect"
  | "ordinary-member"
  | "ordinary-non-member";

export type TestModeScenario = "real" | SyntheticTestModeScenario;

export const SYNTHETIC_TEST_MODE_SCENARIOS = [
  "two-regions",
  "two-connect-memberships",
  "multi-scope-leadership",
  "connect-and-upstream-leader",
  "upstream-leader-no-connect",
  "ordinary-member",
  "ordinary-non-member",
] as const satisfies readonly SyntheticTestModeScenario[];

export const TEST_MODE_SCENARIOS: ReadonlyArray<{
  value: TestModeScenario;
  label: string;
  description: string;
  defaultRole: TestModeRole;
}> = [
  { value: "real", label: "Real authorized data", description: "Only groups in your real admin scope load from Rock.", defaultRole: "department" },
  { value: "two-regions", label: "Two regions", description: "Synthetic upstream scope with two regions.", defaultRole: "regional" },
  { value: "two-connect-memberships", label: "Two Connect memberships", description: "Synthetic reader with two Connect memberships.", defaultRole: "member" },
  { value: "multi-scope-leadership", label: "Multi-scope leadership", description: "Synthetic leader over two Connect scopes.", defaultRole: "regional" },
  { value: "connect-and-upstream-leader", label: "Connect + upstream leader", description: "Synthetic Connect leader who also leads upstream.", defaultRole: "regional" },
  { value: "upstream-leader-no-connect", label: "Upstream leader, no Connect", description: "Synthetic upstream leader without a Connect membership.", defaultRole: "regional" },
  { value: "ordinary-member", label: "Ordinary member", description: "Synthetic ordinary member regression state.", defaultRole: "member" },
  { value: "ordinary-non-member", label: "Ordinary non-member", description: "Synthetic no-membership regression state.", defaultRole: "new" },
];

/** Rock CampusIds: 1 = Manila (MNL), 2 = Brisbane (BNE), 3 = Seoul (SEL). */
export type TestModeCampus = 1 | 2 | 3;

export const TEST_MODE_CAMPUSES: ReadonlyArray<{ id: TestModeCampus; code: string; name: string }> = [
  { id: 1, code: "MNL", name: "Manila" },
  { id: 2, code: "BNE", name: "Brisbane" },
  { id: 3, code: "SEL", name: "Seoul" },
];

export function testModeCampusFromSession(campusId: number | null): TestModeCampus {
  const matchingCampus = TEST_MODE_CAMPUSES.find((campus) => campus.id === campusId);
  return matchingCampus?.id ?? TEST_MODE_CAMPUSES[0].id;
}

export type TestModeState = {
  day: number;
  phase: SimulatedPhase;
  completionPct: number;
  groupPct: number;
  groupId: number | null;
  scenario: TestModeScenario;
  role: TestModeRole;
  campus: TestModeCampus;
};

/**
 * Section subtree roots the admin tiers simulate.
 *
 * `cluster` and `regional` reuse the exact ids the pre-existing dev scope
 * simulation already used (`components/home-data.tsx`, `?scope=cluster` /
 * `?scope=region`), so the panel and that older switch cannot disagree about
 * what "a cluster" means. `department` is campus-wide and so resolves per
 * campus instead -- see `departmentRootForCampus`.
 */
export const SIMULATED_SECTION_ROOTS = {
  cluster: 23869, // Cluster // Cielo Pabalan & Peejay Pabalan
  regional: 23870, // Region // Arnel Guiron & Belle Guiron
} as const;

/**
 * What a simulated role means for the shell's gating, in one place so
 * `app-shell.tsx` never re-derives it.
 *
 * `rootIds === null` means "not an admin tier" -- the caller leaves the
 * section dashboard out entirely rather than showing an empty one.
 */
export type SimulatedRoleScope = {
  isLeader: boolean;
  isAdminScope: boolean;
  hasGroup: boolean;
  rootIds: number[] | null;
};

export function scopeForRole(role: TestModeRole, campus: TestModeCampus): SimulatedRoleScope {
  switch (role) {
    case "new":
      return { isLeader: false, isAdminScope: false, hasGroup: false, rootIds: null };
    case "member":
      return { isLeader: false, isAdminScope: false, hasGroup: true, rootIds: null };
    case "connect-leader":
      return { isLeader: true, isAdminScope: false, hasGroup: true, rootIds: null };
    case "department":
      return {
        isLeader: true,
        isAdminScope: true,
        hasGroup: true,
        rootIds: [departmentRootForCampus(campus)],
      };
    case "cluster":
      return {
        isLeader: true,
        isAdminScope: true,
        hasGroup: true,
        rootIds: [SIMULATED_SECTION_ROOTS.cluster],
      };
    case "regional":
      return {
        isLeader: true,
        isAdminScope: true,
        hasGroup: true,
        rootIds: [SIMULATED_SECTION_ROOTS.regional],
      };
  }
}

/** True for the three tiers that simulate an admin-scope viewer. */
export function isAdminRole(role: TestModeRole): boolean {
  return scopeForRole(role, 1).isAdminScope;
}

/**
 * The single trigger list both the client and the server read. `isTestModeRequested`
 * and `isTestModeRequestedFromQuery` delegate here so the set of URLs that opens the
 * panel can never drift from the set the server loads panel data for -- a drift that
 * would show up as `?day=5` opening the panel over an empty group picker.
 */
function requestsTestMode(get: (key: string) => string | undefined): boolean {
  return (
    get(TEST_MODE_PARAM) !== undefined ||
    get(DAY_PARAM) !== undefined ||
    get("leader") !== undefined ||
    get("admin") !== undefined ||
    get("tab") === "admin"
  );
}

/** True when the URL asks for test mode -- `?test=1` or the `?day=N` alias, or leader inspection `?leader=1`, or admin inspection `?admin=1` / `?tab=admin`. `?tab=leader` alone is the primary nav landing on the Leader tab and must NOT activate test mode. */
export function isTestModeRequested(searchParams: URLSearchParams): boolean {
  return requestsTestMode((key) => searchParams.get(key) ?? undefined);
}

/**
 * Server-side twin of `isTestModeRequested`, for Next's plain `searchParams`
 * object. Used by `HomeData` to decide whether the org-wide Connect Group list
 * (a several-hundred-group Rock call) is worth fetching at all -- it feeds the
 * test panel and nothing else, so ordinary page loads must skip it.
 */
export function isTestModeRequestedFromQuery(
  query: Record<string, string | string[] | undefined>,
): boolean {
  return requestsTestMode((key) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  });
}

function dayFromParams(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get(DAY_PARAM));
  if (Number.isInteger(raw) && raw >= 1 && raw <= PLAN.length) return raw;
  return 1;
}

/**
 * The GT24 campus-root section each campus's `department` tier simulates.
 * `CAMPUS_ROOT_SECTION_IDS` is documented as the three campus-level sections
 * directly under the global root, in campus order.
 */
export function departmentRootForCampus(campus: TestModeCampus): number {
  return CAMPUS_ROOT_SECTION_IDS[campus - 1] ?? CAMPUS_ROOT_SECTION_IDS[0];
}

/**
 * Accepts the role names the panel writes into the URL, and still accepts the
 * pre-rename values (`non-member`, `leader`, `admin`) so an old bookmarked or
 * shared test link keeps working instead of silently falling back to `member`.
 */
function roleFromParam(raw: string | null): TestModeRole | null {
  switch (raw) {
    case "new":
    case "member":
    case "connect-leader":
    case "department":
    case "cluster":
    case "regional":
      return raw;
    // Legacy aliases, kept so existing links do not change meaning.
    case "non-member":
      return "new";
    case "leader":
      return "connect-leader";
    case "admin":
      return "department";
    default:
      return null;
  }
}

function roleFromScopeParam(raw: string | null): TestModeRole | null {
  switch (raw) {
    // `department` never appeared in a page URL, but the CSV export has always
    // accepted it, so a shared export link carries it.
    case "global":
    case "sections":
    case "department":
      return "department";
    case "cluster":
      return "cluster";
    case "region":
      return "regional";
    default:
      return null;
  }
}

function campusFromParams(searchParams: URLSearchParams, fallback: TestModeCampus): TestModeCampus {
  const raw = (searchParams.get("campus") ?? "").trim().toUpperCase();
  if (raw === "") return fallback;
  const byCode = TEST_MODE_CAMPUSES.find((c) => c.code === raw);
  if (byCode) return byCode.id;
  const asId = Number(raw);
  const byId = TEST_MODE_CAMPUSES.find((c) => c.id === asId);
  return byId ? byId.id : fallback;
}

/**
 * The panel's starting values: `?day=N` seeds the day, `?role=` seeds the role
 * (`?viewer=` is still read as its alias), `?campus=MNL|BNE|SEL` (or the numeric
 * id) seeds the campus, and `?leader=1` / `?admin=1` / `?tab=admin` seed the
 * role the way they always did.
 *
 * `sessionCampus` is the viewer's real campus, used as the campus default so a
 * Brisbane tester does not open the panel scoped to Manila.
 */
export function initialTestModeState(
  searchParams: URLSearchParams,
  sessionCampus: TestModeCampus = 1,
): TestModeState {
  const explicit = roleFromParam(searchParams.get("role") ?? searchParams.get("viewer"));
  const legacyScopeRole = roleFromScopeParam(searchParams.get("scope"));
  const isLeaderParam = searchParams.get("leader") === "1" || searchParams.get("tab") === "leader";
  const isAdminParam = searchParams.get("admin") === "1" || searchParams.get("tab") === "admin";
  const role: TestModeRole =
    explicit ?? legacyScopeRole ?? (isAdminParam ? "department" : isLeaderParam ? "connect-leader" : "member");
  return {
    day: dayFromParams(searchParams),
    phase: "active",
    completionPct: 0,
    groupPct: 0,
    groupId: null,
    scenario: "real",
    role,
    campus: campusFromParams(searchParams, sessionCampus),
  };
}

export type SimulatedScopeSelection = {
  kind: "global" | "sections";
  rootIds: number[];
  simulatedScope: "global" | "cluster" | "region" | "department";
  campus?: TestModeCampus;
};

function selectionForRole(role: TestModeRole, campus: TestModeCampus): SimulatedScopeSelection | null {
  const simulated = scopeForRole(role, campus);
  if (!simulated.isAdminScope || simulated.rootIds === null) return null;
  return {
    kind: "sections",
    rootIds: simulated.rootIds,
    simulatedScope: role === "cluster" ? "cluster" : role === "regional" ? "region" : "department",
    campus: role === "department" ? campus : undefined,
  };
}

/** Resolves the simulated scope shared by HomeData and the CSV route. */
export function simulatedScopeFromQuery(
  searchParams: URLSearchParams,
  sessionCampus: TestModeCampus = 1,
): SimulatedScopeSelection | null {
  const roleParam = searchParams.get("role") ?? searchParams.get("viewer");
  const campusParam = searchParams.get("campus");
  const scopeParam = searchParams.get("scope");

  if (roleParam !== null || campusParam !== null) {
    const state = initialTestModeState(searchParams, sessionCampus);
    return selectionForRole(state.role, state.campus);
  }

  if (scopeParam === "cluster") {
    return selectionForRole("cluster", 1);
  }
  if (scopeParam === "region") {
    return selectionForRole("regional", 1);
  }
  if (scopeParam === "global" || scopeParam === "sections") {
    return { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID], simulatedScope: "global" };
  }

  // A bare test-mode URL starts as the simulated member role, which has no
  // admin scope. Do not let the endpoint fall back to the real admin scope.
  return null;
}

/** Group completion percentages that land mid-band for each house stage (`stageFor`, lib/game.ts). */
export const STAGE_PRESETS: ReadonlyArray<{ stage: string; pct: number; threshold: number }> = [
  { stage: "Tent", pct: 0, threshold: 0 },
  { stage: "Trailer", pct: 15, threshold: 10 },
  { stage: "Cabin", pct: 35, threshold: 25 },
  { stage: "Apartment", pct: 55, threshold: 45 },
  { stage: "House", pct: 75, threshold: 65 },
  { stage: "Mansion", pct: 95, threshold: 85 },
];

/**
 * The plan date a simulated day/phase maps to, reusing the real plan
 * calendar (`lib/plan.ts`) so a simulated "Day 5" is the exact date the real
 * app would use for day 5 -- the two can never drift apart.
 */
export function dateForSimulatedDay(day: number, phase: SimulatedPhase): string {
  if (phase === "pre-launch") return "2026-09-15";
  if (phase === "grace") return GRACE_DATES[0];
  if (phase === "closed") return "2026-11-02"; // day after PLAN_END (2026-10-31)
  const clamped = Math.min(Math.max(Math.trunc(day), 1), PLAN.length);
  return PLAN[clamped - 1].date;
}

/**
 * The `TodayState` a simulated date produces -- mirrors `useToday`'s own
 * `computeToday` shape exactly, but as a plain function (not a hook) so it
 * can be recomputed on every render as the panel's day/phase change, which
 * `useToday`'s override (captured once at mount) intentionally cannot do.
 */
export function simulatedTodayState(date: string, timezone: string): TodayState {
  return {
    todayLocal: date,
    timezone,
    phase: planPhase(date),
    displayPhase: displayPhase(date),
    dayLabel: dayLabelNumber(date),
    entry: todaysEntry(date),
  };
}

/** A synthetic "chapters read" set for a completion percentage, 0-100. */
export function simulatedChapters(completionPct: number): number[] {
  const clamped = Math.min(Math.max(completionPct, 0), 100);
  const count = Math.round((clamped / 100) * PLAN.length);
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** A synthetic group ratio (0-1, the unit `groupStats.ratio` and `stageFor` use) for a group percentage, 0-100. */
export function simulatedGroupRatio(groupPct: number): number {
  return Math.min(Math.max(groupPct, 0), 100) / 100;
}

/** Synthetic reading history for a roster member in test mode. */
export function simulatedMemberHistory(
  memberId: number,
  completionPct: number,
  todayLocal: string,
): { chapters: number[]; readingDates: string[] } {
  const chapterCount = simulatedChapters(completionPct).length;
  const maxStart = Math.max(PLAN.length - chapterCount, 0);
  const start = chapterCount === 0 ? 0 : Math.abs(memberId) % (maxStart + 1);
  const chapters = Array.from({ length: chapterCount }, (_, index) => start + index + 1);
  const readingDates = chapters
    .filter((ch) => ch <= PLAN.length)
    .map((ch) => PLAN[ch - 1].date)
    .filter((d) => d <= todayLocal);
  return { chapters, readingDates };
}

type WriteResult = { ok: true } | { ok: false; error: string };

/**
 * Pure helper to determine if writes are blocked in test mode.
 * Returns `false` (writes allowed) only when all hold:
 * `active === true`, `writableGroupId !== null`, `selectedGroupId === writableGroupId`, `realActiveGroupId === writableGroupId`.
 * Otherwise `true`. When `active` is `false`, returns `false` so `guardWrite` stays a pass-through.
 */
export function writesBlocked(
  active: boolean,
  selectedGroupId: number | null,
  realActiveGroupId: number | null,
  writableGroupId: number | null,
): boolean {
  if (!active) return false;
  // `selectedGroupId === null` means "my real active group" -- the panel's
  // first option, which is also the ONLY way that group can be selected,
  // because the picker filters it out of the campus list to avoid listing it
  // twice. Resolving null here is what makes the sandbox reachable at all:
  // the unblock needs the sandbox to be the session's real active group, and
  // in exactly that case the picker offers it only as "(my group)".
  const effectiveGroupId = selectedGroupId ?? realActiveGroupId;
  if (
    writableGroupId !== null &&
    effectiveGroupId === writableGroupId &&
    realActiveGroupId === writableGroupId
  ) {
    return false;
  }
  return true;
}

/**
 * Wraps a Supabase/Rock write action (checkIn, saveProfile, chooseGroup,
 * joinByCode all share this `{ok:true,...}|{ok:false,error}` result shape).
 * When test mode is active, the wrapped action is never called -- this is
 * the actual no-write guarantee for #47, verified directly in
 * tests/test-mode.test.ts rather than by inspecting call sites.
 */
export function guardWrite<Args extends unknown[], R extends WriteResult>(
  active: boolean,
  action: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
  if (!active) return action;
  return async () => ({ ok: false, error: TEST_MODE_BLOCKED_MESSAGE }) as R;
}
