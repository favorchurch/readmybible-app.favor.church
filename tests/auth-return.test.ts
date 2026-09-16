import { describe, expect, it } from "vitest";

import { safeReturnTo } from "@/lib/auth-return";

describe("safeReturnTo", () => {
  it("keeps local paths while rejecting protocol-relative normalisations", () => {
    expect(safeReturnTo("/join/ABC123")).toBe("/join/ABC123");
    expect(safeReturnTo("//evil.example")).toBe("/");
    expect(safeReturnTo("/\\evil.example")).toBe("/");
  });
});
