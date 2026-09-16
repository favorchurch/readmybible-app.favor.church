/**
 * The ladder's ratios are synthetic on purpose: October's real check-in data
 * is near-uniform and would render every home at the same stage, which is the
 * one thing the prototype must not do. These tests pin the property that
 * makes the prototype worth looking at -- a region shows Tent and Mansion
 * side by side -- without touching Rock and without any committed fixture.
 *
 * (The earlier committed fixture was removed: this repository is public and
 * the fixture carried real group names, leader names and member counts.)
 */
import { describe, expect, it } from "vitest";

import { aggregateRatio, occupantStateFor } from "@/components/ladder/occupant-badge";
import type { SectionWithStats } from "@/lib/admin/stats";
import { stageFor, type Stage } from "@/lib/game";
import { attachTunedStats, pickStateGroups, tunedRatio } from "@/lib/ladder/tuning";
import type { HierarchySectionNode } from "@/lib/rock/hierarchy";

function section(id: number, groupCount: number, children: HierarchySectionNode[] = []): HierarchySectionNode {
  return {
    id,
    name: `section-${id}`,
    campusId: 1,
    children,
    groups: Array.from({ length: groupCount }, (_, i) => ({
      id: id * 100 + i,
      name: `group-${id}-${i}`,
      campusId: 1,
      memberCount: 12,
      leaders: [],
    })),
  };
}

function stagesOf(node: HierarchySectionNode, count = node.groups.length): Stage[] {
  return node.groups.map((_, index) => stageFor(tunedRatio(node.id, index, count)));
}

describe("ladder ratio tuning", () => {
  it("spans Tent to Mansion for every region with 3 or more connects", () => {
    for (const groupCount of [3, 4, 5, 6, 7, 8, 12]) {
      const stages = stagesOf(section(1000, groupCount));
      expect(stages, `groupCount ${groupCount}`).toContain("Tent");
      expect(stages, `groupCount ${groupCount}`).toContain("Mansion");
    }
  });

  it("gives a 4-connect region four distinct stages", () => {
    expect(stagesOf(section(1000, 4))).toEqual(["Tent", "Cabin", "Apartment", "Mansion"]);
  });

  it("does not put every 1-connect region at the same stage", () => {
    const stages = [23856, 23857, 23858, 23859, 23860, 23861].map(
      (id) => stagesOf(section(id, 1))[0],
    );
    expect(new Set(stages).size).toBeGreaterThan(1);
  });

  it("survives a zero-member group without dividing by zero", () => {
    const node = section(1000, 1);
    node.groups[0].memberCount = 0;
    const [attached] = attachTunedStats([node], { zeroId: null, unavailableId: null });
    expect(attached.groups[0].ratio).toBe(0);
    expect(attached.groups[0].stage).toBe("Tent");
  });

  it("lands each group in the stage band its target ratio intends", () => {
    const node = section(1000, 6);
    const [attached] = attachTunedStats([node], { zeroId: null, unavailableId: null });
    attached.groups.forEach((group, index) => {
      expect(group.stage).toBe(stageFor(tunedRatio(node.id, index, 6)));
    });
  });
});

describe("ladder data states", () => {
  const tree = [section(1, 2, [section(2, 4), section(3, 5)])];

  it("takes its state groups from the SECOND qualifying section", () => {
    // Not the first: the first 4-connect section is the one a viewer lands
    // on, and spending two of its slots on a zero and a blank destroys the
    // Tent..Mansion spread that is the reason to look at it.
    const states = pickStateGroups(tree);
    expect(states.zeroId).toBe(301);
    expect(states.unavailableId).toBe(302);
  });

  it("leaves a lone qualifying section untouched", () => {
    expect(pickStateGroups([section(2, 4)])).toEqual({ zeroId: null, unavailableId: null });
  });

  it("returns no state groups when no section is large enough", () => {
    expect(pickStateGroups([section(9, 2)])).toEqual({ zeroId: null, unavailableId: null });
  });

  it("keeps a genuine zero numerically identical to unavailable", () => {
    const states = pickStateGroups(tree);
    const [attached] = attachTunedStats(tree, states);
    const child = attached.children.find((c) => c.id === 3)!;
    const zero = child.groups.find((g) => g.id === states.zeroId)!;
    const unavailable = child.groups.find((g) => g.id === states.unavailableId)!;
    // Both read 0. Only the exported id list separates them -- which is
    // exactly the distinction the occupant badge has to render as
    // "zero" vs "unavailable" (#112).
    expect(zero.checkins).toBe(0);
    expect(unavailable.checkins).toBe(0);
    expect(states.unavailableId).not.toBe(zero.id);
  });
});

describe("occupant aggregate", () => {
  it("reports unknown, not zero, for a scope with nothing beneath it", () => {
    const parent: SectionWithStats = { id: 1, name: "p", campusId: 1, children: [], groups: [] };
    expect(aggregateRatio(parent)).toBeNull();
    expect(occupantStateFor({ ...parent, children: [parent] }).kind).toBe("unavailable");
  });

  it("reports unknown when a child's only group is unavailable", () => {
    const group = {
      id: 99, name: "g", campusId: 1, memberCount: 5, leaders: [],
      checkins: 0, readersToday: 0, ratio: 0, stage: "Tent" as const,
    };
    const child: SectionWithStats = { id: 2, name: "c", campusId: 1, children: [], groups: [group] };
    const parent: SectionWithStats = { id: 1, name: "p", campusId: 1, children: [child], groups: [] };
    // Previously rendered "0/1" -- indistinguishable from a real zero, which
    // is the one distinction #112 exists to make.
    expect(occupantStateFor(parent, [99]).kind).toBe("unavailable");
  });

  it("still reports a genuine zero as zero", () => {
    const group = {
      id: 7, name: "g", campusId: 1, memberCount: 5, leaders: [],
      checkins: 0, readersToday: 0, ratio: 0, stage: "Tent" as const,
    };
    const child: SectionWithStats = { id: 2, name: "c", campusId: 1, children: [], groups: [group] };
    const parent: SectionWithStats = { id: 1, name: "p", campusId: 1, children: [child], groups: [] };
    expect(occupantStateFor(parent, []).kind).toBe("zero");
  });
});
