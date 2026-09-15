// @vitest-environment jsdom

/**
 * The Leader tab's Connect Group progress hierarchy: stage-count charts,
 * podiums, and the title quick-filter. These replace the retired
 * "Other Connects" board, so the behaviours it used to own (comparing groups,
 * spotting who's ahead) are pinned here instead.
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HierarchyView } from "@/components/sections/hierarchy-view";
import { stageCounts, leadingGroups } from "@/components/sections/hierarchy-overview";
import type { GroupWithStats, SectionWithStats } from "@/lib/admin/stats";
import type { Stage } from "@/lib/game";

function group(id: number, name: string, ratio: number, stage: Stage): GroupWithStats {
  return {
    id,
    name,
    campusId: 1,
    memberCount: 10,
    leaders: [],
    checkins: Math.round(ratio * 280),
    readersToday: 2,
    ratio,
    stage,
  };
}

function section(
  id: number,
  name: string,
  groups: GroupWithStats[],
  children: SectionWithStats[] = [],
): SectionWithStats {
  return { id, name, campusId: 1, children, groups };
}

const mnl = section(
  2,
  "MNL Connect Groups",
  [group(11, "Ortigas Alpha", 0.9, "Mansion")],
  [
    section(4, "Ortigas Cluster", [
      group(12, "Ortigas Beta", 0.5, "House"),
      group(13, "Ortigas Gamma", 0.1, "Tent"),
    ]),
  ],
);
const bne = section(3, "BNE Connect Groups", [
  group(21, "Brisbane One", 0.7, "House"),
  group(22, "Brisbane Two", 0.05, "Tent"),
]);
const tree: SectionWithStats[] = [section(1, "Connect Groups", [], [mnl, bne])];

afterEach(() => cleanup());

describe("stageCounts", () => {
  it("tallies in progression order and drops stages nobody has reached", () => {
    const counts = stageCounts([
      group(1, "a", 0.1, "Tent"),
      group(2, "b", 0.1, "Tent"),
      group(3, "c", 0.6, "House"),
    ]);
    expect(counts).toEqual([
      { stage: "Tent", count: 2 },
      { stage: "House", count: 1 },
    ]);
    expect(counts.some((c) => c.count === 0)).toBe(false);
  });
});

describe("leadingGroups", () => {
  it("ranks by progress and breaks ties on name so the podium is stable", () => {
    const ranked = leadingGroups([
      group(1, "Zulu", 0.5, "House"),
      group(2, "Alpha", 0.5, "House"),
      group(3, "Top", 0.9, "Mansion"),
      group(4, "Last", 0.1, "Tent"),
    ]);
    expect(ranked.map((g) => g.name)).toEqual(["Top", "Alpha", "Zulu"]);
  });
});

describe("HierarchyView", () => {
  it("charts every group beneath a section, not just its own", () => {
    const { container } = render(<HierarchyView sections={tree} />);

    // The root owns no groups of its own but sits above all five.
    const root = container.querySelector(".admin-section-details") as HTMLElement;
    const chart = within(root).getAllByLabelText("Connect Groups — homes reached")[0];
    expect(chart.textContent).toContain("2Tent");
    expect(chart.textContent).toContain("2House");
    expect(chart.textContent).toContain("1Mansion");
  });

  it("awards gold, silver and bronze to the three leading connects", () => {
    const { container } = render(<HierarchyView sections={tree} />);

    const podium = container.querySelector('[data-section="leading-connects"] ol') as HTMLElement;
    const entries = podium.querySelectorAll("li");
    expect(Array.from(entries).map((li) => li.querySelector("strong")?.textContent)).toEqual([
      "Ortigas Alpha",
      "Brisbane One",
      "Ortigas Beta",
    ]);
    expect(entries[0].className).toContain("medal-gold");
    expect(entries[1].className).toContain("medal-silver");
    expect(entries[2].className).toContain("medal-bronze");
  });

  it("prunes the tree to matching titles, keeps ancestors, and recomputes the counts", () => {
    const { container } = render(<HierarchyView sections={tree} />);

    fireEvent.change(screen.getByLabelText("Filter Connect Groups by title"), {
      target: { value: "brisbane one" },
    });

    expect(container.textContent).toContain("Brisbane One");
    expect(container.textContent).not.toContain("Ortigas Alpha");
    // Ancestors survive so the match keeps its place in the hierarchy.
    expect(container.textContent).toContain("BNE Connect Groups");
    expect(container.textContent).toContain("Connect Groups");
    expect(container.textContent).not.toContain("MNL Connect Groups");

    const root = container.querySelector(".admin-section-details") as HTMLElement;
    const chart = within(root).getAllByLabelText("Connect Groups — homes reached")[0];
    expect(chart.textContent).toContain("1House");
    expect(chart.textContent).not.toContain("Tent");
  });

  it("keeps a whole subtree when the section title itself matches", () => {
    const { container } = render(<HierarchyView sections={tree} />);

    fireEvent.change(screen.getByLabelText("Filter Connect Groups by title"), {
      target: { value: "MNL" },
    });

    expect(container.textContent).toContain("Ortigas Alpha");
    expect(container.textContent).toContain("Ortigas Gamma");
    expect(container.textContent).not.toContain("Brisbane One");
  });

  it("says so when nothing matches, instead of showing an empty tree", () => {
    const { container } = render(<HierarchyView sections={tree} />);

    fireEvent.change(screen.getByLabelText("Filter Connect Groups by title"), {
      target: { value: "nothing-here" },
    });

    expect(container.querySelector('[data-section="hierarchy-no-match"]')).not.toBeNull();
    expect(container.querySelector(".admin-section-details")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(container.querySelector(".admin-section-details")).not.toBeNull();
  });

  it("uses flat SVG glyphs, never the 3D CSS home model, for the many-icon charts", () => {
    const { container } = render(<HierarchyView sections={tree} />);

    expect(container.querySelectorAll("svg.stage-glyph").length).toBeGreaterThan(0);
    expect(container.querySelector(".home3d-model")).toBeNull();
    expect(container.querySelector(".stage-mini")).toBeNull();
  });
});
