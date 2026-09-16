// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FontReadyGate } from "@/components/font-ready-gate";

const originalFonts = document.fonts;

afterEach(() => {
  cleanup();
  Object.defineProperty(document, "fonts", { configurable: true, value: originalFonts });
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("FontReadyGate", () => {
  it("waits for both required font faces before rendering the app", async () => {
    const load = vi.fn().mockImplementation(async () => [{}]);
    const check = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "fonts", { configurable: true, value: { load, check } });

    render(
      <FontReadyGate>
        <div data-testid="app-content">App content</div>
      </FontReadyGate>,
    );

    expect(screen.queryByTestId("app-content")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("app-content")).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("offers retry and a safe system-font continuation when a font fails", async () => {
    const load = vi.fn().mockRejectedValue(new Error("font unavailable"));
    Object.defineProperty(document, "fonts", { configurable: true, value: { load, check: () => false } });

    render(
      <FontReadyGate>
        <div data-testid="app-content">App content</div>
      </FontReadyGate>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: /taking a moment to load/i })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /continue without custom fonts/i }));
    expect(screen.getByTestId("app-content")).toBeTruthy();
  });
});
