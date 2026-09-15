// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import LoginPage from "@/app/login/page";

afterEach(() => cleanup());

describe("LoginPage", () => {
  it("keeps authentication and group joining separate by offering Auth0 login and a landing-page exit", () => {
    render(React.createElement(LoginPage));

    expect(screen.getByRole("link", { name: /log in with favor/i }).getAttribute("href")).toBe("/auth/login");
    expect(screen.getByRole("link", { name: /back to landing page/i }).getAttribute("href")).toBe("/");
    expect(screen.queryByText(/group code/i)).toBeNull();
  });
});
