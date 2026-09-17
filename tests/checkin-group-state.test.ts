import { describe, expect, it } from "vitest";

import { groupStateFor } from "@/lib/game";

describe("groupStateFor", () => {
  it("pairs a ratio with its stage", () => {
    expect(groupStateFor(0, 10)).toEqual({ ratio: 0, stage: "Tent" });
  });

  it("reflects a check-in bump within the same stage", () => {
    const before = groupStateFor(2, 10); // 2 / 280
    const after = groupStateFor(3, 10); // 3 / 280
    expect(before.stage).toBe("Tent");
    expect(after.stage).toBe("Tent");
    expect(after.ratio).toBeGreaterThan(before.ratio);
  });

  it("crosses a stage boundary when the ratio passes a threshold", () => {
    // groupRatio = assignments / (members * 20); Cabin starts at 0.25.
    const before = groupStateFor(49, 10); // 49/200 = .245
    const after = groupStateFor(50, 10); // 50/200 = .25 exactly
    expect(before.stage).toBe("Trailer");
    expect(after.stage).toBe("Cabin");
  });

  it("returns zero ratio and Tent for zero members, never dividing by zero", () => {
    expect(groupStateFor(5, 0)).toEqual({ ratio: 0, stage: "Tent" });
  });
});
