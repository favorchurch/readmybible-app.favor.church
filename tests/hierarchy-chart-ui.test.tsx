// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HierarchyChart } from "@/components/sections/HierarchyChart";

describe("HierarchyChart pre-launch empty state", () => {
  afterEach(() => cleanup());

  it("R4: names the real Oct 5 launch date, not the legacy October 1", () => {
    render(React.createElement(HierarchyChart, { series: [{ label: "Test", points: [] }] }));

    expect(screen.getByText("The chart starts filling in on October 5.")).toBeTruthy();
    expect(screen.queryByText(/October 1\b/)).toBeNull();
  });

  it("still reports pre-launch-only when every point predates the real Oct 5 launch", () => {
    render(
      React.createElement(HierarchyChart, {
        series: [{ label: "Test", points: [{ date: "2026-10-02", ratio: 0 }] }],
      }),
    );

    expect(screen.getByText("The chart starts filling in on October 5.")).toBeTruthy();
  });
});
