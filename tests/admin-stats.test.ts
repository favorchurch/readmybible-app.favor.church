import { describe, expect, it } from "vitest";

import {
  attachGroupStats,
  buildDailyCumulativeSeries,
  collectTopLevelSeriesInputs,
  flattenGroupNodes,
  statForGroup,
} from "@/lib/admin/stats";
import type { HierarchyGroupNode, HierarchySectionNode } from "@/lib/rock/hierarchy";

function group(overrides: Partial<HierarchyGroupNode>): HierarchyGroupNode {
  return { id: 1, name: "Group", campusId: 1, memberCount: 10, leaders: [], ...overrides };
}

describe("statForGroup", () => {
  it("matches lib/game.ts groupRatio/stageFor", () => {
    const g = group({ id: 1, memberCount: 10 });
    // 28 checkins / (10 members * 28 chapters) = 0.1 -> Trailer
    const stat = statForGroup(g, 28, 3);
    expect(stat.ratio).toBeCloseTo(0.1);
    expect(stat.stage).toBe("Trailer");
    expect(stat.checkins).toBe(28);
    expect(stat.readersToday).toBe(3);
  });

  it("returns a 0 ratio / Tent stage for a group with no members", () => {
    const stat = statForGroup(group({ memberCount: 0 }), 5, 0);
    expect(stat.ratio).toBe(0);
    expect(stat.stage).toBe("Tent");
  });
});

describe("buildDailyCumulativeSeries", () => {
  it("fills gap days by carrying the prior cumulative total forward", () => {
    const points = buildDailyCumulativeSeries(
      [
        { date: "2026-10-01", count: 5 },
        { date: "2026-10-03", count: 3 },
      ],
      1, // memberCount 1 => denominator 28
      "2026-10-01",
      "2026-10-04",
    );
    expect(points.map((p) => p.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(points[0].ratio).toBeCloseTo(5 / 28);
    expect(points[1].ratio).toBeCloseTo(5 / 28); // no new checkins on the 2nd
    expect(points[2].ratio).toBeCloseTo(8 / 28); // cumulative 5 + 3
    expect(points[3].ratio).toBeCloseTo(8 / 28);
  });

  it("clamps the ratio at 1 even if cumulative checkins exceed the denominator", () => {
    const points = buildDailyCumulativeSeries([{ date: "2026-10-01", count: 1000 }], 1, "2026-10-01", "2026-10-01");
    expect(points[0].ratio).toBe(1);
  });
});

describe("flattenGroupNodes / collectTopLevelSeriesInputs", () => {
  const tree: HierarchySectionNode = {
    id: 1,
    name: "Root",
    campusId: null,
    groups: [],
    children: [
      {
        id: 2,
        name: "Cluster A",
        campusId: 1,
        groups: [group({ id: 10, memberCount: 5 }), group({ id: 11, memberCount: 5 })],
        children: [],
      },
      {
        id: 3,
        name: "Cluster B",
        campusId: 1,
        groups: [group({ id: 12, memberCount: 8 })],
        children: [],
      },
    ],
  };

  it("flattens every group across the whole tree", () => {
    const ids = flattenGroupNodes([tree]).map((g) => g.id);
    expect(ids.sort()).toEqual([10, 11, 12]);
  });

  it("makes one series input per direct child section", () => {
    const inputs = collectTopLevelSeriesInputs([tree]);
    expect(inputs).toEqual([
      { label: "Cluster A", groupIds: [10, 11], memberCount: 10 },
      { label: "Cluster B", groupIds: [12], memberCount: 8 },
    ]);
  });

  it("falls back to the root itself when it has no child sections", () => {
    const leafRoot: HierarchySectionNode = {
      id: 5,
      name: "Solo Section",
      campusId: 2,
      groups: [group({ id: 20, memberCount: 4 })],
      children: [],
    };
    expect(collectTopLevelSeriesInputs([leafRoot])).toEqual([
      { label: "Solo Section", groupIds: [20], memberCount: 4 },
    ]);
  });

  it("attaches per-group stats through the whole tree", () => {
    const totals = new Map([[10, 140]]); // 140 / (5*28) = 1.0
    const readersToday = new Map([[10, 5]]);
    const [statsRoot] = attachGroupStats([tree], totals, readersToday);
    const clusterA = statsRoot.children.find((c) => c.id === 2)!;
    const g10 = clusterA.groups.find((g) => g.id === 10)!;
    const g11 = clusterA.groups.find((g) => g.id === 11)!;
    expect(g10.ratio).toBe(1);
    expect(g10.stage).toBe("Mansion");
    expect(g10.readersToday).toBe(5);
    expect(g11.checkins).toBe(0);
    expect(g11.stage).toBe("Tent");
  });
});
