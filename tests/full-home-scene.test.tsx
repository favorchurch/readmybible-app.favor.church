// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const scene = vi.hoisted(() => ({ render: vi.fn() }));

vi.mock("@/components/immersive-home-scene", () => ({
  ImmersiveHomeScene: (props: Record<string, unknown>) => {
    scene.render(props);
    return <div data-testid="immersive-home-scene" data-mode={props.mode as string} data-stage={String(props.stage)} />;
  },
}));

import { defaultAvatarConfig, type UserProfile } from "@/components/avatar";
import { FullHome } from "@/components/full-home";
import type { RosterMemberView } from "@/components/app-shell";
import type { TodayState } from "@/components/use-today";

const profile: UserProfile = {
  displayName: "Alex",
  ...defaultAvatarConfig,
  translation: "NET",
};

const roster: RosterMemberView[] = [
  { personId: 1, name: "Alex", avatar: defaultAvatarConfig, isSelf: true, isLeader: true, readToday: false, chapters: [], readingDates: [] },
  { personId: 2, name: "Jamie", avatar: defaultAvatarConfig, isSelf: false, isLeader: false, readToday: true, chapters: [1], readingDates: ["2026-10-01"] },
];

const today: TodayState = {
  todayLocal: "2026-10-02",
  timezone: "Asia/Manila",
  phase: "active",
  displayPhase: "active",
  dayLabel: 2,
  entry: { day: 2, chapter: 2, date: "2026-10-02", keyPassage: "Matthew 2:1-2", title: "The wise men arrive" },
};

function renderHome(overrides: Partial<React.ComponentProps<typeof FullHome>> = {}) {
  const onClose = vi.fn();
  const onSelectMember = vi.fn();
  render(
    <FullHome
      onClose={onClose}
      groupName="Adults // Erwin & Jeric"
      coins={30}
      groupCheckinCount={3}
      stage={0}
      progress={{ pct: 40, stage: "Apartment" }}
      milestone={{ pct: 45, stage: "Apartment" }}
      overallPct={40}
      today={today}
      roster={roster}
      profile={profile}
      selectedMemberId={null}
      onSelectMember={onSelectMember}
      {...overrides}
    />,
  );
  return { onClose, onSelectMember };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FullHome scene integration", () => {
  it("keeps Classic as the default and opens the alternate Tent with the same roster", async () => {
    const { onSelectMember } = renderHome({ selectedMemberId: 2 });
    expect(screen.getByRole('button', { name: 'Classic' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('immersive-home-scene')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tent' }));
    expect((await screen.findByTestId("immersive-home-scene")).dataset.mode).toBe("tent");
    expect(screen.getByTestId("immersive-home-scene").dataset.stage).toBe("0");
    expect(scene.render).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "tent",
      stage: 0,
      roster,
      profile,
      people: true,
      names: true,
      selectedMemberId: 2,
      onSelectMember,
      resetKey: 0,
    }));
    expect(screen.getByRole("heading", { name: "Adults // Erwin & Jeric" })).toBeTruthy();
    expect(screen.getByText("2 members · Tent")).toBeTruthy();
    expect(screen.getByRole("button", { name: /30 chapter coins\. Select to learn more/ })).toBeTruthy();
  });

  it("switches between Classic, Tent and Campfire without closing the scene", async () => {
    renderHome();

    const switcher = screen.getByRole("group", { name: "Scene presentation" });
    const tent = screen.getByRole("button", { name: "Tent" });
    const campfire = screen.getByRole("button", { name: "Campfire" });
    expect(tent.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(campfire);
    expect((await screen.findByTestId("immersive-home-scene")).dataset.mode).toBe("campfire");
    expect(campfire.getAttribute("aria-pressed")).toBe("true");
    expect(tent.getAttribute("aria-pressed")).toBe("false");
    expect(switcher).toBeTruthy();
    fireEvent.click(tent);
    expect(screen.getByTestId("immersive-home-scene").dataset.mode).toBe("tent");
    fireEvent.click(screen.getByRole('button', { name: 'Classic' }));
    expect(screen.queryByTestId('immersive-home-scene')).toBeNull();
    expect(screen.getByRole('group', { name: /Interactive 3D Tent/ })).toBeTruthy();
  });

  it("updates People, name labels, time of day, and reset key through the controls", async () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Tent' }));
    await screen.findByTestId('immersive-home-scene');
    fireEvent.click(screen.getByRole("button", { name: /People/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Show all members" }));
    fireEvent.click(screen.getByRole("button", { name: /^Night$/ }));
    fireEvent.click(screen.getByRole("button", { name: "↺ Reset view" }));

    expect(scene.render).toHaveBeenLastCalledWith(expect.objectContaining({ people: false, names: true, time: "Night", resetKey: 1 }));
    expect(screen.getByRole("switch", { name: "Show name labels" }).hasAttribute("disabled")).toBe(true);
  });

  it("forwards member selection and closes through the home dismissal control", () => {
    const { onClose, onSelectMember } = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "People" }));
    fireEvent.click(screen.getByRole("button", { name: "Jamie" }));
    expect(onSelectMember).toHaveBeenCalledWith(roster[1]);
    fireEvent.click(screen.getByRole("button", { name: "Close Home" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exposes progress details and the active reading action", () => {
    const onViewReading = vi.fn();
    renderHome({ onViewReading });
    fireEvent.click(screen.getByText("Chapter 2 · 40% to Apartment"));
    expect(screen.getByText("40% of Matthew complete")).toBeTruthy();
    expect(screen.getByText("40% through this stage · Apartment unlocks at 45% overall")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Read Matthew 2/ }));
    expect(onViewReading).toHaveBeenCalledTimes(1);
  });
});
