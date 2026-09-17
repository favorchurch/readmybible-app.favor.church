// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import {
  clearAllSceneOrientations,
  clearSceneOrientation,
  headingToward,
  loadSceneOrientations,
  normalizeAngle,
  orientationScope,
  ROTATE_STEP,
  saveSceneOrientation,
} from "@/lib/scene-orientation";

const home = [{ personId: 1 }, { personId: 2 }, { personId: 3 }];
const otherHome = [{ personId: 1 }, { personId: 9 }];

afterEach(() => {
  window.localStorage.clear();
});

describe("scene orientation yaw math", () => {
  it("points a person standing across the fire straight at it", () => {
    // Fire at the origin: someone on the far side faces +z (yaw 0), someone to the east faces west.
    expect(headingToward({ x: 0, z: -3.65 }, { x: 0, z: 0 })).toBe(0);
    expect(headingToward({ x: 3.2, z: -1.25 }, { x: 0, z: 0 })).toBe(Math.atan2(-3.2, 1.25));
  });

  it("targets each mode's real fire focal point", () => {
    const standing = { x: 0, z: 4 };
    expect(headingToward(standing, { x: 0, z: .5 })).toBeCloseTo(Math.PI, 5);
    expect(headingToward(standing, { x: 0, z: 1.15 })).toBeCloseTo(Math.PI, 5);
    expect(headingToward({ x: -4.3, z: 1.15 }, { x: 0, z: 1.15 })).toBeCloseTo(Math.PI / 2, 5);
  });

  it("normalizes drift back into [-π, π] without changing the heading", () => {
    // ±π are the same heading, so an odd number of half-turns may land on either.
    expect(Math.abs(normalizeAngle(Math.PI * 3))).toBeCloseTo(Math.PI, 5);
    expect(Math.abs(normalizeAngle(-Math.PI * 3))).toBeCloseTo(Math.PI, 5);
    // 96 steps of 15 degrees is exactly four full turns.
    expect(normalizeAngle(.4 + ROTATE_STEP * 96)).toBeCloseTo(.4, 5);
  });

  it("uses a 15 degree rotate step", () => {
    expect(ROTATE_STEP).toBeCloseTo(Math.PI / 12, 10);
  });
});

describe("scene orientation persistence scoping", () => {
  it("scopes by mode and exact roster so yaw cannot leak across homes", () => {
    expect(orientationScope("tent", home)).not.toBe(orientationScope("campfire", home));
    expect(orientationScope("tent", home)).not.toBe(orientationScope("tent", otherHome));
    expect(orientationScope("tent", home)).toBe(orientationScope("tent", [...home].reverse()));
  });

  it("round-trips a manual yaw for one person only", () => {
    const scope = orientationScope("tent", home);
    saveSceneOrientation(scope, 2, .7);
    const loaded = loadSceneOrientations(scope);
    expect(loaded.get(2)).toBe(.7);
    expect(loaded.has(1)).toBe(false);
  });

  it("never shares storage between homes that contain the same person", () => {
    saveSceneOrientation(orientationScope("tent", home), 1, 1.2);
    expect(loadSceneOrientations(orientationScope("tent", otherHome)).size).toBe(0);
  });

  it("clears exactly one person's manual heading on Face fire", () => {
    const scope = orientationScope("campfire", home);
    saveSceneOrientation(scope, 1, .3);
    saveSceneOrientation(scope, 2, .9);
    clearSceneOrientation(scope, 1);
    const loaded = loadSceneOrientations(scope);
    expect(loaded.has(1)).toBe(false);
    expect(loaded.get(2)).toBe(.9);
  });

  it("clears both modes for a roster on reset without touching other homes", () => {
    for (const mode of ["tent", "campfire"] as const) {
      saveSceneOrientation(orientationScope(mode, home), 3, -.5);
      saveSceneOrientation(orientationScope(mode, otherHome), 9, -.5);
    }
    clearAllSceneOrientations(home);
    expect(loadSceneOrientations(orientationScope("tent", home)).size).toBe(0);
    expect(loadSceneOrientations(orientationScope("campfire", home)).size).toBe(0);
    expect(loadSceneOrientations(orientationScope("tent", otherHome)).get(9)).toBe(-.5);
  });

  it("ignores corrupt or malformed storage instead of throwing", () => {
    window.localStorage.setItem("read-my-bible-scene-orientation", "{not json");
    expect(loadSceneOrientations("tent:1-2").size).toBe(0);
    window.localStorage.setItem("read-my-bible-scene-orientation", JSON.stringify({ "tent:1-2": { bad: "x", "3": "nope", "4": 1.5 } }));
    const loaded = loadSceneOrientations("tent:1-2");
    expect(loaded.get(4)).toBe(1.5);
    expect(loaded.size).toBe(1);
  });

  it("prunes the least recently saved homes after ten scopes", () => {
    for (let index = 0; index < 12; index++) {
      saveSceneOrientation(`tent:home-${index}`, 1, index * .1);
    }
    const raw = JSON.parse(window.localStorage.getItem("read-my-bible-scene-orientation") ?? "{}") as Record<string, unknown>;
    expect(Object.keys(raw)).toHaveLength(10);
    expect(raw["tent:home-0"]).toBeUndefined();
    expect(raw["tent:home-11"]).toBeDefined();
  });
});
