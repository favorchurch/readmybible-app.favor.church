import { describe, expect, it } from "vitest";

import {
  coinsFor,
  groupRatio,
  medals,
  nextMedal,
  nextStageProgress,
  rankGroups,
  stageFor,
  stageTransition,
  streak,
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
      { groupId: 1, name: "Zeta", ratio: 0.5, readersToday: 2 },
      { groupId: 2, name: "Alpha", ratio: 0.5, readersToday: 3 },
      { groupId: 3, name: "Beta", ratio: 0.8, readersToday: 1 },
      { groupId: 4, name: "Alpha", ratio: 0.5, readersToday: 2 },
    ]);
    expect(ranked.map((g) => g.groupId)).toEqual([3, 2, 4, 1]);
  });
});
