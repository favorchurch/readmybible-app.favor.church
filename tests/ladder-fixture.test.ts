/**
 * Guards the home-ladder fixture against the shapes the ladder prototypes
 * need on day one -- the acceptance list on wayfinder ticket #111.
 *
 * If a refresh of the frozen Rock read drops one of these branches, the
 * prototypes silently lose the case they exist to exercise, so it is
 * asserted rather than trusted.
 */
import { describe, expect, it } from "vitest";
import {
  FIXTURE_UNAVAILABLE_GROUP_IDS,
  FIXTURE_VIEWERS,
  FIXTURE_ZERO_GROUP_IDS,
  ladderFixtureTree,
  loadLadderFixture,
  loadLadderFixtureAs,
} from "@/lib/ladder/fixture";
import type { SectionWithStats } from "@/lib/admin/stats";

function findSection(sections: SectionWithStats[], id: number): SectionWithStats | null {
  for (const section of sections) {
    if (section.id === id) return section;
    const hit = findSection(section.children, id);
    if (hit) return hit;
  }
  return null;
}

describe("home ladder fixture", () => {
  const all = loadLadderFixture();

  it("spans Tent to Mansion inside one region", () => {
    const region = findSection(all, 23865);
    expect(region?.name).toBe("Region // Eula Cheng");
    const stages = region!.groups.map((g) => g.stage);
    expect(stages).toContain("Tent");
    expect(stages).toContain("Mansion");
    expect(new Set(stages).size).toBe(region!.groups.length);
  });

  it("holds a region with 4 connects and a region with 1", () => {
    expect(findSection(all, 23865)!.groups).toHaveLength(4);
    expect(findSection(all, 23856)!.groups).toHaveLength(1);
  });

  it("holds the 12-region cluster and a single-region parent", () => {
    const big = findSection(all, 31557);
    expect(big?.name).toBe("Cluster // Pranav Sadhwani");
    expect(big!.children).toHaveLength(12);
    expect(findSection(all, 24174)!.children).toHaveLength(1);
  });

  it("holds a BNE branch with no cluster layer", () => {
    const dept = findSection(all, 24173);
    expect(dept?.name).toBe("BNE Adults");
    // Regions sit directly under the department -- every child is a region
    // with connects of its own, and none of them is a cluster of regions.
    expect(dept!.children.length).toBeGreaterThan(0);
    expect(dept!.children.every((region) => region.children.length === 0)).toBe(true);
  });

  it("holds two sibling regions with identical leader names", () => {
    const cluster = findSection(all, 23913)!;
    const names = cluster.children.map((c) => c.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toContain("Region // Gene B. Manaois & Yolly Manaois");
  });

  it("gives the multi-scope viewer two roots under different departments", () => {
    expect(FIXTURE_VIEWERS.multiScope.rootIds).toHaveLength(2);
    const roots = loadLadderFixtureAs("multiScope");
    expect(roots).toHaveLength(2);
    // Both roots carry the same leader name -- the chooser cannot label by name alone.
    expect(new Set(roots.map((r) => r.name)).size).toBe(1);
  });

  it("keeps a genuine zero distinct from unavailable data", () => {
    const region = findSection(all, 23867)!;
    const zero = region.groups.find((g) => g.id === FIXTURE_ZERO_GROUP_IDS[0])!;
    const unavailable = region.groups.find((g) => g.id === FIXTURE_UNAVAILABLE_GROUP_IDS[0])!;
    expect(zero.checkins).toBe(0);
    // Both read 0 numerically; only the id list tells them apart, which is
    // exactly the distinction the occupant encoding (#112) has to render.
    expect(unavailable.checkins).toBe(0);
    expect(FIXTURE_UNAVAILABLE_GROUP_IDS).not.toContain(zero.id);
  });

  it("leaves the frozen Rock read untouched by tuning", () => {
    const tree = ladderFixtureTree();
    const groups = JSON.stringify(tree);
    expect(groups).not.toContain("checkins");
    expect(groups).not.toContain("ratio");
    expect(findSection(all, 23865)!.groups[0].memberCount).toBe(14);
  });
});
