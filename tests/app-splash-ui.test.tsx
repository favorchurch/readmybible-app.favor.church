// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SplashCompanion } from "@/components/app-splash";

function mockMatchMedia(reduceMotion: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduceMotion : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SplashCompanion", () => {
  it("renders with no props, defaulting to a 72px square box", () => {
    mockMatchMedia(false);
    const { container } = render(<SplashCompanion />);
    const box = container.querySelector(".splash-companion") as HTMLElement;
    expect(box).not.toBeNull();
    expect(box.style.width).toBe("72px");
    expect(box.style.height).toBe("72px");
  });

  it("scales both the outer box and inner figure to a custom size prop", () => {
    mockMatchMedia(false);
    const { container } = render(<SplashCompanion size={24} />);
    const box = container.querySelector(".splash-companion") as HTMLElement;
    const figure = container.querySelector(".splash-companion-figure") as HTMLElement;
    expect(box.style.width).toBe("24px");
    expect(box.style.height).toBe("24px");
    expect(figure.style.width).toBe("24px");
    expect(figure.style.height).toBe("24px");
  });

  it("keeps aria-hidden on the glyph box", () => {
    mockMatchMedia(false);
    const { container } = render(<SplashCompanion />);
    const box = container.querySelector(".splash-companion") as HTMLElement;
    expect(box.getAttribute("aria-hidden")).toBe("true");
  });

  it("freezes on the first scene under prefers-reduced-motion and never rotates", () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random");
    const { container } = render(<SplashCompanion />);
    // INITIAL_SCENE is the fixed avatar scene; confirm it's present pre-tick.
    expect(container.querySelector(".avatar")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Reduced motion never sets an interval, so Math.random() (used only by
    // randomScene(), never by the deterministic initial scene) is never
    // called and the glyph never changes.
    expect(randomSpy).not.toHaveBeenCalled();
    expect(container.querySelector(".avatar")).not.toBeNull();
  });

  it("rotates to a new scene after the interval elapses when motion is allowed", () => {
    mockMatchMedia(false);
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random");
    // First call happens inside randomScene() during the interval tick.
    randomSpy.mockReturnValue(0.9); // forces the "home" branch, seed math still runs
    const { container } = render(<SplashCompanion />);
    expect(container.querySelector(".avatar")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(container.querySelector(".stage-mini")).not.toBeNull();
  });
});

describe("SplashCompanion without matchMedia (#125)", () => {
  it("renders instead of throwing when the environment has no matchMedia", () => {
    // Since #125 this component also mounts inside the reading sheet, so it is
    // rendered by suites that never stub matchMedia. jsdom does not implement
    // it, and the unguarded call threw
    // `TypeError: window.matchMedia is not a function` at mount.
    const original = window.matchMedia;
    // @ts-expect-error -- deleting an lib.dom member is the whole point here.
    delete window.matchMedia;
    try {
      expect(() => render(<SplashCompanion />)).not.toThrow();
      expect(document.querySelector(".splash-companion-figure")).not.toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});
