// @vitest-environment jsdom

/**
 * Issue #127: the test-mode panel opens expanded.
 *
 * `?test=1` is an explicit opt-in, so a tester who reached this panel has
 * already asked for its controls -- starting collapsed cost a click on every
 * session. The Show/Hide toggle still has to work, or "expanded by default"
 * silently becomes "always expanded".
 */


import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestModePanel } from "@/components/test-mode/TestModePanel";
import type { TestModeState } from "@/components/test-mode/logic";

vi.mock("@/app/actions/getJoinCodeForGroup", () => ({
  getJoinCodeForGroup: vi.fn(async () => ({ ok: true, code: "ABC123" })),
}));

const state: TestModeState = {
  groupId: null,
  viewer: "member",
  phase: "active",
  day: 1,
  completionPct: 0,
  groupPct: 0,
};

afterEach(cleanup);

describe("TestModePanel default collapsed state (#127)", () => {
  it("renders its body expanded on first mount", () => {
    render(<TestModePanel state={state} onChange={() => {}} />);
    // The Viewer control lives in the body, so its presence is the body's presence.
    expect(screen.queryByRole("group", { name: "Viewer" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Hide" })).toBeTruthy();
  });

  it("still collapses and re-expands via the toggle", () => {
    render(<TestModePanel state={state} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByRole("group", { name: "Viewer" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.queryByRole("group", { name: "Viewer" })).not.toBeNull();
  });
});
