// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import LoginPage from "@/app/login/page";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionContext.mockResolvedValue({ status: "logged-out" });
});

describe("LoginPage", () => {
  it("renders the branded entry and starts Auth0 with the Enter App CTA", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("img", { name: /read my bible/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /enter app/i }).getAttribute("href")).toBe("/auth/login");
    expect(screen.queryByText(/log in with favor/i)).toBeNull();
    expect(screen.queryByText(/group code/i)).toBeNull();
  });

  it("carries a join destination through the login handoff", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ returnTo: "/join/ABC123" }) }));

    expect(screen.getByRole("link", { name: /enter app/i }).getAttribute("href")).toBe(
      "/auth/login?returnTo=%2Fjoin%2FABC123",
    );
  });

  it("sends an already-authenticated visitor into the app or requested destination", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "ok" });

    await expect(LoginPage({ searchParams: Promise.resolve({ returnTo: "/join/ABC123" }) })).rejects.toThrow(
      "REDIRECT:/join/ABC123",
    );
  });
});
