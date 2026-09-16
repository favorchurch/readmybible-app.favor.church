// @vitest-environment jsdom

/**
 * Issue #127: the test-mode panel opens expanded.
 *
 * `?test=1` is an explicit opt-in, so a tester who reached this panel has
 * already asked for its controls -- starting collapsed cost a click on every
 * session. The Show/Hide toggle still has to work, or "expanded by default"
 * silently becomes "always expanded".
 */


import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestModePanel } from "@/components/test-mode/TestModePanel";
import type { TestModeState } from "@/components/test-mode/logic";

vi.mock("@/app/actions/getJoinCodeForGroup", () => ({
  getJoinCodeForGroup: vi.fn(async () => ({ ok: true, code: "ABC123" })),
}));

const state: TestModeState = {
  groupId: null,
  scenario: "real",
  role: "member",
  campus: 1,
  phase: "active",
  day: 1,
  completionPct: 0,
  groupPct: 0,
};

afterEach(cleanup);

describe("TestModePanel default collapsed state (#127)", () => {
  it("renders its body expanded on first mount", () => {
    render(<TestModePanel state={state} onChange={() => {}} />);
    // The Role control lives in the body, so its presence is the body's presence.
    expect(screen.queryByRole("group", { name: "Role" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Hide" })).toBeTruthy();
  });

  it("still collapses and re-expands via the toggle", () => {
    render(<TestModePanel state={state} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByRole("group", { name: "Role" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.queryByRole("group", { name: "Role" })).not.toBeNull();
  });

  it("does not render a deprecated Admin dashboard link for an admin-scope role", () => {
    render(<TestModePanel state={{ ...state, role: "department" }} onChange={() => {}} />);

    expect(screen.queryByRole("link", { name: /Admin Dashboard/i })).toBeNull();
    expect(screen.queryByText("Open Admin Dashboard →")).toBeNull();
  });

  it("keeps the panel recoverable when the streamed group list fails", async () => {
    let rejectGroups!: (error: Error) => void;
    const campusGroupsPromise = new Promise<never>((_, reject) => {
      rejectGroups = reject;
    });
    const view = render(
      <TestModePanel
        state={state}
        onChange={() => {}}
        campusGroupsPromise={campusGroupsPromise}
      />,
    );

    await act(async () => {
      rejectGroups(new Error("group service unavailable"));
    });
    view.rerender(
      <TestModePanel
        state={state}
        onChange={() => {}}
        campusGroupsPromise={campusGroupsPromise}
      />,
    );
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/group list is unavailable/i));
    expect(screen.getByRole("group", { name: "Role" })).toBeTruthy();
  });

  it("switches from real data to a synthetic compound scenario", () => {
    const onChange = vi.fn();
    render(<TestModePanel state={state} onChange={onChange} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
      target: { value: "two-regions" },
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      scenario: "two-regions",
      groupId: null,
      role: "regional",
    }));
  });
});
