import { describe, expect, it } from "vitest";

import {
  coinsFor,
  groupByLocality,
  groupRatio,
  medals,
  nextMedal,
  nextStageProgress,
  rankGroups,
  stageFor,
  stageTransition,
  streak,
  UNKNOWN_LOCALITY,
} from "@/lib/game";

describe("stageTransition", () => {
  it("is null when both ratios map to the same stage", () => {
    expect(stageTransition(0.02, 0.05)).toBeNull(); // both Tent
  });

  it("is null when the ratio is unchanged", () => {
    expect(stageTransition(0.3, 0.3)).toBeNull();
  });

  it("reports the stage change when the ratio crosses a threshold", () => {
    expect(stageTransition(0.24, 0.26)).toEqual({ from: "Trailer", to: "Cabin" });
  });

  it("reports a downward transition too", () => {
    expect(stageTransition(0.5, 0.2)).toEqual({ from: "Apartment", to: "Trailer" });
  });
});

describe("coinsFor", () => {
  it("gives 10 coins per chapter", () => {
    expect(coinsFor(0)).toBe(0);
    expect(coinsFor(1)).toBe(10);
    expect(coinsFor(28)).toBe(280);
  });

  it("never goes negative", () => {
    expect(coinsFor(-5)).toBe(0);
  });
});

describe("medals", () => {
  it("returns thresholds reached", () => {
    expect(medals(0)).toEqual([]);
    expect(medals(3)).toEqual([3]);
    expect(medals(10)).toEqual([3, 7]);
    expect(medals(28)).toEqual([3, 7, 14, 21, 28]);
  });
});

describe("nextMedal", () => {
  it("returns the next unreached threshold", () => {
    expect(nextMedal(0)).toBe(3);
    expect(nextMedal(3)).toBe(7);
    expect(nextMedal(28)).toBeNull();
  });
});

describe("streak", () => {
  it("is 0 with no dates", () => {
    expect(streak([], "2026-10-15")).toBe(0);
  });

  it("counts a single day ending today", () => {
    expect(streak(["2026-10-15"], "2026-10-15")).toBe(1);
  });

  it("counts a single day ending yesterday", () => {
    expect(streak(["2026-10-14"], "2026-10-15")).toBe(1);
  });

  it("resets when the gap is two days or more", () => {
    expect(streak(["2026-10-12"], "2026-10-15")).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(streak(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"], "2026-10-15")).toBe(4);
  });

  it("ignores a gap earlier in the history", () => {
    expect(streak(["2026-10-01", "2026-10-14", "2026-10-15"], "2026-10-15")).toBe(2);
  });

  it("ignores duplicate dates", () => {
    expect(streak(["2026-10-15", "2026-10-15", "2026-10-14"], "2026-10-15")).toBe(2);
  });

  it("handles a month boundary", () => {
    expect(streak(["2026-09-30", "2026-10-01"], "2026-10-01")).toBe(2);
  });
});

describe("groupRatio", () => {
  it("clamps to [0, 1]", () => {
    expect(groupRatio(0, 5)).toBe(0);
    expect(groupRatio(5 * 28, 5)).toBe(1);
    expect(groupRatio(10 * 28, 5)).toBe(1);
  });

  it("computes checkins over members times 28", () => {
    expect(groupRatio(14, 5)).toBeCloseTo(14 / 140);
  });

  it("returns 0 for zero members instead of dividing by zero", () => {
    expect(groupRatio(10, 0)).toBe(0);
  });
});

describe("stageFor", () => {
  it("maps ratio thresholds to stages", () => {
    expect(stageFor(0)).toBe("Tent");
    expect(stageFor(0.09)).toBe("Tent");
    expect(stageFor(0.1)).toBe("Trailer");
    expect(stageFor(0.25)).toBe("Cabin");
    expect(stageFor(0.45)).toBe("Apartment");
    expect(stageFor(0.65)).toBe("House");
    expect(stageFor(0.85)).toBe("Mansion");
    expect(stageFor(1)).toBe("Mansion");
  });
});

describe("nextStageProgress", () => {
  it("returns the next stage and pct progressed toward it", () => {
    const progress = nextStageProgress(0);
    expect(progress?.stage).toBe("Trailer");
    expect(progress?.pct).toBe(0);
  });

  it("returns null at Mansion", () => {
    expect(nextStageProgress(0.9)).toBeNull();
  });
});

describe("rankGroups", () => {
  it("sorts by ratio desc, then readers today desc, then name asc", () => {
    const ranked = rankGroups([
      { groupId: 1, name: "Zeta", ratio: 0.5, readersToday: 2, locality: null },
      { groupId: 2, name: "Alpha", ratio: 0.5, readersToday: 3, locality: null },
      { groupId: 3, name: "Beta", ratio: 0.8, readersToday: 1, locality: null },
      { groupId: 4, name: "Alpha", ratio: 0.5, readersToday: 2, locality: null },
    ]);
    expect(ranked.map((g) => g.groupId)).toEqual([3, 2, 4, 1]);
  });
});

describe("groupByLocality", () => {
  const makeGroup = (groupId: number, name: string, locality: string | null) => ({
    groupId,
    name,
    ratio: 0,
    readersToday: 0,
    locality,
  });

  it("sections are ordered by group count descending then locality name ascending", () => {
    const standings = [
      makeGroup(1, "A", "Pasig"),
      makeGroup(2, "B", "Ortigas Center"),
      makeGroup(3, "C", "Ortigas Center"),
      makeGroup(4, "D", "Ortigas Center"),
      makeGroup(5, "E", "Quezon City"),
      makeGroup(6, "F", "Quezon City"),
    ];
    const result = groupByLocality(standings);
    expect(result.map((s) => s.locality)).toEqual(["Ortigas Center", "Quezon City", "Pasig"]);
  });

  it("count tie-break falls back to locality name ascending", () => {
    const standings = [
      makeGroup(1, "A", "Zebra"),
      makeGroup(2, "B", "Alpha"),
    ];
    const result = groupByLocality(standings);
    expect(result.map((s) => s.locality)).toEqual(["Alpha", "Zebra"]);
  });

  it("groups within a section keep rankGroups order", () => {
    const standings = [
      { groupId: 1, name: "Zeta", ratio: 0.1, readersToday: 0, locality: "Pasig" },
      { groupId: 2, name: "Alpha", ratio: 0.5, readersToday: 0, locality: "Pasig" },
    ];
    const result = groupByLocality(standings);
    expect(result[0].groups.map((g) => g.groupId)).toEqual([1, 2]); // rankGroups order preserved
  });

  it("Unknown section is always last regardless of its count", () => {
    const standings = [
      makeGroup(1, "A", null),
      makeGroup(2, "B", null),
      makeGroup(3, "C", null),
      makeGroup(4, "D", null),
      makeGroup(5, "E", "Pasig"),
    ];
    const result = groupByLocality(standings);
    expect(result[result.length - 1].locality).toBe(UNKNOWN_LOCALITY);
    expect(result[0].locality).toBe("Pasig");
  });

  it("every standing in equals exactly one standing out (conservation)", () => {
    const standings = [
      makeGroup(1, "A", "Ortigas Center"),
      makeGroup(2, "B", "Pasig"),
      makeGroup(3, "C", null),
      makeGroup(4, "D", "Ortigas Center"),
      makeGroup(5, "E", null),
    ];
    const result = groupByLocality(standings);
    const allOut = result.flatMap((s) => s.groups);
    expect(allOut.length).toBe(standings.length);
    // Every input groupId appears exactly once in the output
    const outIds = allOut.map((g) => g.groupId).sort((a, b) => a - b);
    expect(outIds).toEqual([1, 2, 3, 4, 5]);
  });

  it("empty input returns empty output", () => {
    expect(groupByLocality([])).toEqual([]);
  });

  it("all null locality produces a single Unknown section", () => {
    const standings = [makeGroup(1, "A", null), makeGroup(2, "B", null)];
    const result = groupByLocality(standings);
    expect(result).toHaveLength(1);
    expect(result[0].locality).toBe(UNKNOWN_LOCALITY);
  });
});
