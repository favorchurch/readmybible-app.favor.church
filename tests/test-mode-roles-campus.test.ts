import { describe, expect, it } from "vitest";

import {
  initialTestModeState,
  isAdminRole,
  scopeForRole,
  departmentRootForCampus,
  SIMULATED_SECTION_ROOTS,
  STAGE_PRESETS,
  TEST_MODE_CAMPUSES,
  type TestModeRole,
} from "@/components/test-mode/logic";
import { CAMPUS_ROOT_SECTION_IDS } from "@/lib/rock/hierarchy-constants";
import { stageFor } from "@/lib/game";

const ADMIN_ROLES: TestModeRole[] = ["department", "cluster", "regional"];
const NON_ADMIN_ROLES: TestModeRole[] = ["new", "member", "connect-leader"];

describe("simulated role scope", () => {
  it("gives only the three admin tiers admin scope", () => {
    for (const role of ADMIN_ROLES) expect(isAdminRole(role)).toBe(true);
    for (const role of NON_ADMIN_ROLES) expect(isAdminRole(role)).toBe(false);
  });

  it("treats `new` as the only role without a group", () => {
    expect(scopeForRole("new", 1).hasGroup).toBe(false);
    for (const role of [...NON_ADMIN_ROLES.slice(1), ...ADMIN_ROLES]) {
      expect(scopeForRole(role, 1).hasGroup).toBe(true);
    }
  });

  it("gives a plain member no leader tab and no section subtree", () => {
    const scope = scopeForRole("member", 1);
    expect(scope.isLeader).toBe(false);
    expect(scope.rootIds).toBeNull();
  });

  it("gives a connect leader the leader tab but no section subtree", () => {
    const scope = scopeForRole("connect-leader", 1);
    expect(scope.isLeader).toBe(true);
    expect(scope.isAdminScope).toBe(false);
    expect(scope.rootIds).toBeNull();
  });

  // The three admin pills must not be interchangeable -- an undifferentiated
  // "admin" was exactly what this replaces.
  it("gives each admin tier a DIFFERENT section subtree", () => {
    const roots = ADMIN_ROLES.map((role) => scopeForRole(role, 1).rootIds?.[0]);
    expect(new Set(roots).size).toBe(ADMIN_ROLES.length);
    expect(roots.every((r) => typeof r === "number")).toBe(true);
  });

  it("reuses the ids the pre-existing dev scope switch already used", () => {
    expect(scopeForRole("cluster", 1).rootIds).toEqual([SIMULATED_SECTION_ROOTS.cluster]);
    expect(scopeForRole("regional", 1).rootIds).toEqual([SIMULATED_SECTION_ROOTS.regional]);
  });

  it("moves the department subtree with the selected campus", () => {
    const perCampus = TEST_MODE_CAMPUSES.map((c) => scopeForRole("department", c.id).rootIds?.[0]);
    expect(perCampus).toEqual([...CAMPUS_ROOT_SECTION_IDS]);
    expect(new Set(perCampus).size).toBe(3);
  });

  it("keeps the non-department tiers campus-independent", () => {
    for (const role of ["cluster", "regional"] as TestModeRole[]) {
      const roots = TEST_MODE_CAMPUSES.map((c) => scopeForRole(role, c.id).rootIds?.[0]);
      expect(new Set(roots).size).toBe(1);
    }
  });

  it("falls back to the first campus root for an out-of-range campus", () => {
    // @ts-expect-error deliberately out of the TestModeCampus union
    expect(departmentRootForCampus(99)).toBe(CAMPUS_ROOT_SECTION_IDS[0]);
  });
});

describe("initial state from the URL", () => {
  const parse = (search: string, campus: 1 | 2 | 3 = 1) =>
    initialTestModeState(new URLSearchParams(search), campus);

  it("defaults to member on the session's own campus", () => {
    expect(parse("?test=1", 2)).toMatchObject({ role: "member", campus: 2 });
  });

  it("reads ?role= for every role name", () => {
    for (const role of [...NON_ADMIN_ROLES, ...ADMIN_ROLES]) {
      expect(parse(`?role=${role}`).role).toBe(role);
    }
  });

  // Old shared/bookmarked links must not silently change meaning.
  it.each([
    ["non-member", "new"],
    ["leader", "connect-leader"],
    ["admin", "department"],
  ])("maps the legacy ?viewer=%s to %s", (legacy, expected) => {
    expect(parse(`?viewer=${legacy}`).role).toBe(expected);
    expect(parse(`?role=${legacy}`).role).toBe(expected);
  });

  it("keeps seeding the role from ?leader=1 and ?admin=1", () => {
    expect(parse("?leader=1").role).toBe("connect-leader");
    expect(parse("?admin=1").role).toBe("department");
    expect(parse("?tab=admin").role).toBe("department");
  });

  it("lets an explicit ?role= win over the ?admin=1 shorthand", () => {
    expect(parse("?admin=1&role=regional").role).toBe("regional");
  });

  it.each([
    ["MNL", 1],
    ["bne", 2],
    ["SEL", 3],
    ["2", 2],
  ])("reads ?campus=%s as campus %i", (raw, expected) => {
    expect(parse(`?campus=${raw}`).campus).toBe(expected);
  });

  it("falls back to the session campus for an unknown campus code", () => {
    expect(parse("?campus=XYZ", 3).campus).toBe(3);
    expect(parse("?campus=", 2).campus).toBe(2);
  });
});

describe("stage presets", () => {
  it("covers every house stage exactly once, in ascending order", () => {
    const pcts = STAGE_PRESETS.map((p) => p.pct);
    expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
    expect(new Set(STAGE_PRESETS.map((p) => p.stage)).size).toBe(STAGE_PRESETS.length);
  });

  // The whole point of a preset is that clicking "Cabin" shows a cabin.
  it("lands each preset percentage on its own stage", () => {
    for (const preset of STAGE_PRESETS) {
      expect(stageFor(preset.pct / 100)).toBe(preset.stage);
    }
  });

  // Alt-click uses the exact threshold, to exercise the transition boundary.
  it("lands each threshold on its own stage too", () => {
    for (const preset of STAGE_PRESETS) {
      expect(stageFor(preset.threshold / 100)).toBe(preset.stage);
    }
  });

  it("puts one percent below each threshold in the stage beneath it", () => {
    for (let i = 1; i < STAGE_PRESETS.length; i += 1) {
      const below = (STAGE_PRESETS[i].threshold - 1) / 100;
      expect(stageFor(below)).toBe(STAGE_PRESETS[i - 1].stage);
    }
  });
});
