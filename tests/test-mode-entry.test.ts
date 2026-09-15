// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(""),
}));

import { TestModeEntry } from "@/components/test-mode/TestModeEntry";

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe("TestModeEntry", () => {
  it("renders nothing at all when visible is false", () => {
    const { container } = render(React.createElement(TestModeEntry, { visible: false }));
    expect(container.innerHTML).toBe("");
  });

  it("renders a visible control when visible is true", () => {
    render(React.createElement(TestModeEntry, { visible: true }));
    expect(screen.getByTestId("test-mode-entry")).not.toBeNull();
  });

  it("activates test mode by navigating to a ?test=1 URL", () => {
    render(React.createElement(TestModeEntry, { visible: true }));
    screen.getByTestId("test-mode-entry").click();
    expect(push).toHaveBeenCalledWith("/?test=1");
  });
});
