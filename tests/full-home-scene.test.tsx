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
import type { ConnectScore } from "@/lib/scoring";

const profile: UserProfile = {
  displayName: "Alex",
  ...defaultAvatarConfig,
  translation: "NET",
};

const roster: RosterMemberView[] = [
  { personId: 1, name: "Alex", avatar: defaultAvatarConfig, isSelf: true, isLeader: true, readToday: false, chapters: [], readingDates: [], displayPoints: 45 },
  { personId: 2, name: "Jamie", avatar: defaultAvatarConfig, isSelf: false, isLeader: false, readToday: true, chapters: [1], readingDates: ["2026-10-01"], displayPoints: 12 },
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
      groupName="Adults // Marco & Denise"
      coins={30}
      groupCheckinCount={3}
      stage={0}
      progress={{ pct: 40, stage: "Condo" }}
      milestone={{ pct: 45, stage: "Condo" }}
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
  it("keeps Home as the default and opens the consolidated 3D Campfire with the same roster", async () => {
    const { onSelectMember } = renderHome({ selectedMemberId: 2 });
    expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByTestId("immersive-home-scene")).toBeNull();

    const campfireButton = screen.getByRole("button", { name: "3D Campfire" });
    fireEvent.click(campfireButton);

    expect((await screen.findByTestId("immersive-home-scene")).dataset.mode).toBe("campfire");
    expect(screen.getByTestId("immersive-home-scene").dataset.stage).toBe("0");
    expect(scene.render).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "campfire",
      stage: 0,
      time: "Day",
      roster,
      profile,
      people: true,
      names: true,
      showPoints: true,
      selectedMemberId: 2,
      onSelectMember,
      resetKey: 0,
    }));
    expect(screen.getByRole("heading", { name: "Adults // Marco & Denise" })).toBeTruthy();
    expect(screen.getByText("2 members · Tent")).toBeTruthy();
    expect(screen.getByRole("button", { name: /30 chapter points\. Select to learn more/ })).toBeTruthy();
  });

  it("switches between Home and 3D Campfire without closing the scene", async () => {
    renderHome();

    const switcher = screen.getByRole("group", { name: "Scene presentation" });
    const homeBtn = screen.getByRole("button", { name: "Home" });
    const campfireBtn = screen.getByRole("button", { name: "3D Campfire" });

    expect(homeBtn.getAttribute("aria-pressed")).toBe("true");
    expect(campfireBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(campfireBtn);
    expect((await screen.findByTestId("immersive-home-scene")).dataset.mode).toBe("campfire");
    expect(campfireBtn.getAttribute("aria-pressed")).toBe("true");
    expect(homeBtn.getAttribute("aria-pressed")).toBe("false");
    expect(switcher).toBeTruthy();

    fireEvent.click(homeBtn);
    expect(screen.queryByTestId("immersive-home-scene")).toBeNull();
    expect(homeBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("group", { name: /Interactive 3D Tent/ })).toBeTruthy();
  });

  it("shows lock icon when 3D Campfire is locked and removes it when unlocked", () => {
    // Locked Connect
    const { unmount } = render(
      <FullHome
        onClose={vi.fn()}
        groupName="Adults // Marco & Denise"
        coins={0}
        groupCheckinCount={0}
        stage={0}
        progress={null}
        milestone={null}
        overallPct={0}
        today={today}
        roster={roster}
        profile={profile}
        selectedMemberId={null}
        onSelectMember={vi.fn()}
      />
    );

    const lockedBtn = screen.getByRole("button", { name: "3D Campfire (locked)" });
    expect(lockedBtn.getAttribute("data-locked")).toBe("true");
    expect(lockedBtn.querySelector(".scene-lock-icon")).toBeTruthy();

    unmount();

    // Unlocked Connect via ConnectScore contract
    const unlockedScore: ConnectScore = {
      groupId: 101,
      basePoints: 250,
      regionalBonus: 25,
      clusterBonus: 25,
      totalPoints: 300,
      stage: "Condo",
      displayPoints: 300,
      unlocked3dCampfire: true,
      contributions: [],
    };

    renderHome({ score: unlockedScore });
    const unlockedBtn = screen.getByRole("button", { name: "3D Campfire" });
    expect(unlockedBtn.getAttribute("data-locked")).toBe("false");
    expect(unlockedBtn.querySelector(".scene-lock-icon")).toBeNull();
  });

  it("defaults to 3D Campfire Day and supports cycling and choosing Sunset and Night", async () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "3D Campfire" }));
    await screen.findByTestId("immersive-home-scene");

    // Default time is Day
    expect(scene.render).toHaveBeenLastCalledWith(expect.objectContaining({ time: "Day" }));

    // Open View Options to check all three 3D Campfire time options
    fireEvent.click(screen.getByRole("button", { name: /People/ }));
    expect(screen.getByRole("button", { name: "3D Campfire Day" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "3D Campfire Sunset" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "3D Campfire Night" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "3D Campfire Sunset" }));
    expect(scene.render).toHaveBeenLastCalledWith(expect.objectContaining({ time: "Sunset" }));

    fireEvent.click(screen.getByRole("button", { name: "3D Campfire Night" }));
    expect(scene.render).toHaveBeenLastCalledWith(expect.objectContaining({ time: "Night" }));
  });

  it("hides controls for bare screenshot mode and provides an accessible restore mechanism via click and Escape", () => {
    renderHome();

    // Header and footer are visible initially
    expect(screen.getByRole("heading", { name: "Adults // Marco & Denise" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide controls" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Restore controls" })).toBeNull();

    // Hide controls
    fireEvent.click(screen.getByRole("button", { name: "Hide controls" }));

    // Header and footer are removed from DOM for screenshot bare mode
    expect(screen.queryByRole("heading", { name: "Adults // Marco & Denise" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hide controls" })).toBeNull();

    // Restore controls button is rendered and focused
    const restoreBtn = screen.getByRole("button", { name: "Restore controls" });
    expect(restoreBtn).toBeTruthy();

    // Restore via click
    fireEvent.click(restoreBtn);
    expect(screen.getByRole("heading", { name: "Adults // Marco & Denise" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Restore controls" })).toBeNull();

    // Hide again and restore via Escape key
    fireEvent.click(screen.getByRole("button", { name: "Hide controls" }));
    expect(screen.getByRole("button", { name: "Restore controls" })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("heading", { name: "Adults // Marco & Denise" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Restore controls" })).toBeNull();
  });

  it("toggles points overlay in settings with default ON and renders points above names", async () => {
    renderHome();

    // In Home mode, person labels contain muted points
    const alexLabel = screen.getByLabelText(/View Alex's profile/);
    expect(alexLabel.querySelector(".home-person-points")?.textContent).toBe("45");
    expect(alexLabel.querySelector(".home-person-name")?.textContent).toContain("Alex");

    const jamieLabel = screen.getByLabelText(/View Jamie's profile/);
    expect(jamieLabel.querySelector(".home-person-points")?.textContent).toBe("12");

    // Open options
    fireEvent.click(screen.getByRole("button", { name: /People/ }));
    const pointsSwitch = screen.getByRole("switch", { name: "Show points" });
    expect(pointsSwitch.getAttribute("aria-checked")).toBe("true");

    // Toggle points off
    fireEvent.click(pointsSwitch);
    expect(pointsSwitch.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByText("45")).toBeNull();

    // Toggle points back on
    fireEvent.click(pointsSwitch);
    expect(screen.getByText("45")).toBeTruthy();
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
    fireEvent.click(screen.getByText("Chapter 2 · 40% to Condo"));
    expect(screen.getByText("40% of Matthew complete")).toBeTruthy();
    expect(screen.getByText("40% through this stage · Condo unlocks at 45% overall")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Read Matthew 2/ }));
    expect(onViewReading).toHaveBeenCalledTimes(1);
  });

  it("renders locked access note when viewing locked 3D Campfire without people", async () => {
    const lockedScore: ConnectScore = {
      groupId: 102,
      basePoints: 0,
      regionalBonus: 50,
      clusterBonus: 50,
      totalPoints: 100,
      stage: "Trailer",
      displayPoints: 100,
      unlocked3dCampfire: false,
      contributions: [],
    };

    renderHome({ score: lockedScore, groupCheckinCount: 0 });
    const lockedBtn = screen.getByRole("button", { name: "3D Campfire (locked)" });
    fireEvent.click(lockedBtn);

    await screen.findByTestId("immersive-home-scene");
    expect(scene.render).toHaveBeenLastCalledWith(expect.objectContaining({
      people: false,
      stage: 1, // Trailer
    }));
    expect(screen.getByText("Your group's first chapter check-in opens this gathering for everyone.")).toBeTruthy();
  });

  it("restores controls via keyboard Enter on the focused restore button and via touch tap", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Hide controls" }));

    const restoreBtn = screen.getByRole("button", { name: "Restore controls" });
    // Touch tap / click event
    fireEvent.click(restoreBtn);
    expect(screen.getByRole("heading", { name: "Adults // Marco & Denise" })).toBeTruthy();

    // Hide again, test keyboard Enter
    fireEvent.click(screen.getByRole("button", { name: "Hide controls" }));
    const restoreBtn2 = screen.getByRole("button", { name: "Restore controls" });
    fireEvent.keyDown(restoreBtn2, { key: "Enter" });
    fireEvent.click(restoreBtn2);
    expect(screen.getByRole("heading", { name: "Adults // Marco & Denise" })).toBeTruthy();
  });

  it("consumes ConnectScore to render Condo stage and displays points above each person", () => {
    const condoScore: ConnectScore = {
      groupId: 103,
      basePoints: 300,
      regionalBonus: 0,
      clusterBonus: 0,
      totalPoints: 300,
      stage: "Condo",
      displayPoints: 300,
      unlocked3dCampfire: true,
      contributions: [],
    };

    renderHome({ score: condoScore });
    expect(screen.getByText("2 members · Condo")).toBeTruthy();
    expect(screen.getByRole("group", { name: /Interactive 3D Condo/ })).toBeTruthy();

    // Verify points rendered above name
    const pointsElements = document.querySelectorAll(".home-person-points");
    expect(pointsElements.length).toBe(2);
    expect(pointsElements[0].textContent).toBe("45");
    expect(pointsElements[1].textContent).toBe("12");
  });
});

