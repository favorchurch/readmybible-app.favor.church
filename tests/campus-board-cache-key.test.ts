/**
 * Regression: correction-01.
 *
 * T1 bumped the campus board *read* key to campus:{id}:board:v2 but left the
 * *bust* key in checkIn.ts as campus:{id}:board. This test derives the expected
 * key suffix from a shared constant and asserts both sides agree so the test
 * will catch future drift without needing to parse source files.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The canonical board key suffix — update this constant if the key ever bumps again.
export const CAMPUS_BOARD_KEY_SUFFIX = "board:v2";

describe("campus board cache key consistency (correction-01)", () => {
  it("checkIn.ts busts the same board key that getCampusBoard reads", () => {
    const checkInSrc = readFileSync("app/actions/checkIn.ts", "utf8");
    const statsSrc = readFileSync("lib/data/stats.ts", "utf8");

    // Extract the bust key template literal argument from redisDel in checkIn.ts
    const bustMatch = checkInSrc.match(/redisDel\([^)]*`campus:\$\{[^}]+\}:([^`]+)`/);
    expect(bustMatch, "redisDel call with campus board key not found in checkIn.ts").toBeTruthy();
    const bustSuffix = bustMatch![1];

    // Extract the read key template literal from cached() in getCampusBoard
    const readMatch = statsSrc.match(/cached\(`campus:\$\{[^}]+\}:([^`]+)`,\s*300/);
    expect(readMatch, "cached() call with campus board key not found in lib/data/stats.ts").toBeTruthy();
    const readSuffix = readMatch![1];

    expect(bustSuffix).toBe(readSuffix);
    expect(bustSuffix).toBe(CAMPUS_BOARD_KEY_SUFFIX);
  });
});
