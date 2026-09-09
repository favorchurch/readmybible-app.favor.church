// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WelcomeLanding } from "@/components/welcome";

afterEach(() => cleanup());

describe("WelcomeLanding", () => {
  it("links to /auth/login with a plain anchor, not a Next Link", () => {
    render(React.createElement(WelcomeLanding));

    const link = screen.getByRole("link", { name: /log in with favor/i });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/auth/login");
    // next/link renders <a> too, but always stamps a prefetch marker via the
    // router; a plain <a> never does. This is the "no client-side prefetch"
    // requirement made observable.
    expect(link.hasAttribute("data-next-link")).toBe(false);
  });

  it("labels the scripture panel as sample content, not a personal assignment", () => {
    render(React.createElement(WelcomeLanding));

    expect(screen.getByText(/sample reading, not a personal assignment/i)).toBeTruthy();
    expect(screen.getByText(/a moment in the word/i)).toBeTruthy();
  });

  it("gives the footer brand image explicit width and height to prevent layout shift", () => {
    render(React.createElement(WelcomeLanding));

    const img = screen.getByRole("img", { name: /favor church/i });
    expect(img.getAttribute("width")).toBe("32");
    expect(img.getAttribute("height")).toBe("32");
  });

  it("renders no script-requiring interactive controls (buttons, inputs)", () => {
    render(React.createElement(WelcomeLanding));

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});
