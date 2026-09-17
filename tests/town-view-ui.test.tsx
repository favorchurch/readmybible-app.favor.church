// @vitest-environment jsdom

/**
 * The promoted town view (issue #151): jurisdiction navigation shape, the
 * locked copy (Your Connect / Visiting Connect / Region Connects), locality
 * grouping, and the Visiting status chip. `viewer="leader"` throughout --
 * that is what the real promoted call site (section-dashboard.tsx) passes,
 * never a Connect-role viewer, so legends default off and there is no
 * "own group" to auto-select.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import { LadderTownView } from "@/components/ladder/town-view";
import type { SectionWithStats } from "@/lib/admin/stats";
import type { Stage } from "@/lib/game";

function group(
  id: number,
  name: string,
  ratio: number,
  stage: Stage,
  locality: string | null = null,
): SectionWithStats["groups"][number] {
  return {
    id,
    name,
    campusId: 1,
    memberCount: 10,
    leaders: [],
    locality,
    checkins: Math.round(ratio * 280),
    readersToday: 2,
    ratio,
    stage,
  };
}

function section(
  id: number,
  name: string,
  groups: SectionWithStats["groups"] = [],
  children: SectionWithStats[] = [],
): SectionWithStats {
  return { id, name, campusId: 1, children, groups };
}

afterEach(() => cleanup());

describe("LadderTownView -- Regional Leader landing", () => {
  it("lands directly on the region's Connect homes -- no fabricated Region-owned Home (known-bad 1)", () => {
    const region = section(23870, "Ortigas Region", [group(1, "Ortigas Alpha", 0.9, "Mansion")]);
    render(<LadderTownView roots={[region]} unavailableGroupIds={[]} viewer="leader" ownGroupId={null} />);

    expect(screen.getByText("Region Connects")).toBeTruthy();
    expect(screen.getByText("Ortigas Region")).toBeTruthy();
    expect(screen.getByText("Ortigas Alpha")).toBeTruthy();
    // Never a heading naming the region itself as a "Home".
    expect(screen.queryByText(/Ortigas Region Home/i)).toBeNull();
  });
});

describe("LadderTownView -- Cluster Head landing", () => {
  it("lands on a plain list of regions, not a pre-selected region's town view (issue #117)", () => {
    const cluster = section(23869, "MNL Cluster", [], [
      section(23870, "Ortigas Region", [group(1, "Ortigas Alpha", 0.9, "Mansion")]),
      section(23871, "Pasig Region", [group(2, "Pasig One", 0.4, "Cabin")]),
    ]);
    render(<LadderTownView roots={[cluster]} unavailableGroupIds={[]} viewer="leader" ownGroupId={null} />);

    expect(screen.getByRole("heading", { name: "Choose a region" })).toBeTruthy();
    // Landing is the picker itself -- no region's Connects rendered yet.
    expect(screen.queryByText("Ortigas Alpha")).toBeNull();
    expect(screen.queryByText("Pasig One")).toBeNull();
    expect(screen.queryByText("Region Connects")).toBeNull();
  });

  it("enters a region's town view after picking it, and can return to the region list", () => {
    const cluster = section(23869, "MNL Cluster", [], [
      section(23870, "Ortigas Region", [group(1, "Ortigas Alpha", 0.9, "Mansion")]),
      section(23871, "Pasig Region", [group(2, "Pasig One", 0.4, "Cabin")]),
    ]);
    render(<LadderTownView roots={[cluster]} unavailableGroupIds={[]} viewer="leader" ownGroupId={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Pasig Region/ }));

    expect(screen.getByText("Region Connects")).toBeTruthy();
    expect(screen.getByText("Pasig One")).toBeTruthy();
    expect(screen.queryByText("Ortigas Alpha")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "← All regions" }));
    expect(screen.getByRole("heading", { name: "Choose a region" })).toBeTruthy();
  });
});

describe("LadderTownView -- locality grouping", () => {
  it("groups a region's Connects by locality when there is more than one bucket", () => {
    const region = section(23870, "Ortigas Region", [
      group(1, "Alpha", 0.9, "Mansion", "Ortigas Center"),
      group(2, "Beta", 0.5, "House", "Ortigas Center"),
      group(3, "Gamma", 0.2, "Tent", "Pasig"),
    ]);
    render(<LadderTownView roots={[region]} unavailableGroupIds={[]} viewer="leader" ownGroupId={null} />);

    expect(screen.getByRole("heading", { name: /Ortigas Center/ }).textContent).toContain("2 Connect homes");
    expect(screen.getByRole("heading", { name: /Pasig/ }).textContent).toContain("1 Connect home");
  });

  it("does not group when the region has only one locality (unchanged single-row rendering)", () => {
    const region = section(23870, "Ortigas Region", [
      group(1, "Alpha", 0.9, "Mansion", "Ortigas Center"),
      group(2, "Beta", 0.5, "House", "Ortigas Center"),
    ]);
    const { container } = render(
      <LadderTownView roots={[region]} unavailableGroupIds={[]} viewer="leader" ownGroupId={null} />,
    );

    expect(container.querySelector(".locality-town-container")).toBeNull();
    expect(container.querySelector(".ladder-row")).not.toBeNull();
  });
});

describe("LadderTownView -- visiting a Connect home", () => {
  function landOnRegionWithOneConnect() {
    const region = section(23870, "Ortigas Region", [group(1, "Ortigas Alpha", 0.9, "Mansion")]);
    return render(<LadderTownView roots={[region]} unavailableGroupIds={[]} viewer="leader" ownGroupId={null} />);
  }

  it("uses the locked copy and shows a Visiting status chip with its own exit action", () => {
    landOnRegionWithOneConnect();
    fireEvent.click(screen.getByRole("button", { name: "Visit home" }));

    expect(screen.getByText("Visiting Connect")).toBeTruthy();
    expect(screen.getByText(/Visiting: Ortigas Alpha/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop visiting this Connect" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Return to Connect homes/ })).toBeTruthy();
  });

  it("exits the visit via the chip's own action, back to Region Connects", () => {
    // Arrives already visiting (a deep link, not a same-session click) so the
    // exit takes the plain replaceState path rather than jsdom's
    // asynchronous window.history.back().
    const region = section(23870, "Ortigas Region", [group(1, "Ortigas Alpha", 0.9, "Mansion")]);
    render(
      <LadderTownView
        roots={[region]}
        unavailableGroupIds={[]}
        viewer="leader"
        ownGroupId={null}
        initialVisitedKey="group:1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Stop visiting this Connect" }));

    expect(screen.queryByText("Visiting Connect")).toBeNull();
    expect(screen.getByText("Region Connects")).toBeTruthy();
  });

  it("never resolves a visit key for a Connect outside the supplied jurisdiction (known-bad 3)", () => {
    const region = section(23870, "Ortigas Region", [group(1, "Ortigas Alpha", 0.9, "Mansion")]);
    render(
      <LadderTownView
        roots={[region]}
        unavailableGroupIds={[]}
        viewer="leader"
        ownGroupId={null}
        initialVisitedKey="group:999"
      />,
    );

    expect(screen.queryByText("Visiting Connect")).toBeNull();
    expect(screen.getByText("Region Connects")).toBeTruthy();
  });
});
