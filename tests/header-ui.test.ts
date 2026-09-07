// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultAvatarConfig, type UserProfile } from "@/components/avatar";
import { Header } from "@/components/screens/header";

const sampleProfile: UserProfile = {
  displayName: "Rico",
  translation: "NIV",
  ...defaultAvatarConfig,
};

afterEach(() => cleanup());

describe("Header", () => {
  it("renders personal greeting and Edit profile button", () => {
    const onEditProfile = vi.fn();
    render(
      React.createElement(Header, {
        heading: "Today",
        profile: sampleProfile,
        onEditProfile,
      })
    );

    expect(screen.getByText("Hey, Rico!")).toBeTruthy();
    expect(screen.getByText("Edit profile")).toBeTruthy();
    expect(screen.getByRole("link", { name: /read my bible/i })).toBeTruthy();

    const editBtn = screen.getByRole("button", { name: /edit your avatar/i });
    expect(editBtn.getAttribute("type")).toBe("button");
    fireEvent.click(editBtn);
    expect(onEditProfile).toHaveBeenCalledTimes(1);
  });

  it("renders generic greeting when displayName is empty", () => {
    render(
      React.createElement(Header, {
        heading: "Today",
        profile: { ...sampleProfile, displayName: "" },
        onEditProfile: vi.fn(),
      })
    );

    expect(screen.getByText("Hey, you!")).toBeTruthy();
  });

  it("renders connect switcher when context is provided with multiple memberships", () => {
    const memberships = [
      { groupId: 101, groupName: "Alpha Connect", campusId: 1, roleId: 24, isLeader: true },
      { groupId: 202, groupName: "Beta Connect", campusId: 2, roleId: 81, isLeader: true },
    ];

    render(
      React.createElement(Header, {
        heading: "Connect",
        profile: sampleProfile,
        onEditProfile: vi.fn(),
        connectSwitcher: {
          memberships,
          activeGroup: memberships[0],
          pending: false,
          onChooseGroup: vi.fn(),
        },
      })
    );

    expect(screen.getByRole("button", { name: /switch connect group/i })).toBeTruthy();
    expect(screen.getByText("Alpha Connect")).toBeTruthy();
    expect(screen.getByText("Hey, Rico!")).toBeTruthy();
    expect(screen.getByText("Edit profile")).toBeTruthy();
  });
});
