import { describe, expect, it } from "vitest";

import { syntheticTestModeView } from "@/components/test-mode/synthetic-fixtures";
import {
  SYNTHETIC_TEST_MODE_SCENARIOS,
  TEST_MODE_SCENARIOS,
} from "@/components/test-mode/logic";

describe("synthetic Test Mode scenarios", () => {
  it.each(SYNTHETIC_TEST_MODE_SCENARIOS)("keeps %s independent of real identifiers", (scenario) => {
    const view = syntheticTestModeView(scenario, 2);

    expect(view.campusName).toBe("Brisbane");
    expect(view.memberships.every((membership) => membership.groupId < 0)).toBe(true);
    expect(view.roster.every((member) => member.personId < 0)).toBe(true);
    expect(view.roster.every((member) => member.name.startsWith("Synthetic reader"))).toBe(true);
  });

  it("models two regions and two Connect memberships as separate compound states", () => {
    const regions = syntheticTestModeView("two-regions", 1);
    const memberships = syntheticTestModeView("two-connect-memberships", 1);

    expect(regions.memberships.map((membership) => membership.groupName)).toEqual([
      "Synthetic Region A",
      "Synthetic Region B",
    ]);
    expect(memberships.memberships).toHaveLength(2);
    expect(memberships.memberships.every((membership) => !membership.isLeader || membership.groupId === -5101)).toBe(true);
  });

  it("models overlapping and multi-scope leadership", () => {
    const multiScope = syntheticTestModeView("multi-scope-leadership", 1);
    const overlap = syntheticTestModeView("connect-and-upstream-leader", 1);

    expect(multiScope.memberships.filter((membership) => membership.isLeader)).toHaveLength(2);
    expect(overlap.memberships).toHaveLength(1);
    expect(overlap.activeGroup?.isLeader).toBe(true);
  });

  it("keeps upstream-only and ordinary regression states distinct", () => {
    const upstreamOnly = syntheticTestModeView("upstream-leader-no-connect", 1);
    const member = syntheticTestModeView("ordinary-member", 1);
    const nonMember = syntheticTestModeView("ordinary-non-member", 1);

    expect(upstreamOnly.memberships).toEqual([]);
    expect(upstreamOnly.activeGroup).toBeNull();
    expect(member.memberships).toHaveLength(1);
    expect(member.memberships[0].isLeader).toBe(false);
    expect(nonMember.memberships).toEqual([]);
    expect(nonMember.roster).toEqual([]);
  });

  it("keeps the scenario catalog aligned with the fixture union", () => {
    const catalog = TEST_MODE_SCENARIOS.map((scenario) => scenario.value);
    expect(catalog).toContain("real");
    expect(catalog).toEqual(expect.arrayContaining([...SYNTHETIC_TEST_MODE_SCENARIOS]));
  });
});
