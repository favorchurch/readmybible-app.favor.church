import { describe, expect, it } from "vitest";

import { rosterUnlocks3dCampfire } from "@/components/connect-score";
import type { RosterMemberView } from "@/components/app-shell";
import { defaultAvatarConfig } from "@/components/avatar";

function member(overrides: Partial<RosterMemberView> = {}): RosterMemberView {
  return {
    personId: 1,
    avatar: defaultAvatarConfig,
    isSelf: false,
    name: "Reader",
    isLeader: false,
    readToday: false,
    chapters: [],
    readingDates: [],
    ...overrides,
  };
}

describe("rosterUnlocks3dCampfire", () => {
  it("does not unlock when no current Connect member or leader has completed a chapter", () => {
    // This is the exact failure the ticket bars: a group can carry a stale or
    // upstream-attributed check-in count elsewhere in the app, but nobody
    // presently on its own roster has read anything yet.
    const unlocked = rosterUnlocks3dCampfire(101, [
      member({ personId: 1, isLeader: true, chapters: [] }),
      member({ personId: 2, isLeader: false, chapters: [] }),
    ]);
    expect(unlocked).toBe(false);
  });

  it("unlocks once a genuine Connect member has a completed assignment", () => {
    const unlocked = rosterUnlocks3dCampfire(101, [member({ personId: 1, isLeader: false, chapters: [5] })]);
    expect(unlocked).toBe(true);
  });

  it("unlocks from a Connect Leader's own completed assignment too", () => {
    const unlocked = rosterUnlocks3dCampfire(101, [member({ personId: 1, isLeader: true, chapters: [5] })]);
    expect(unlocked).toBe(true);
  });

  it("stays sound with every upstream role flag false, since scoreConnect's unlock check never reads them", () => {
    // Regression guard for A1: this adapter hardcodes isRegionalLeader /
    // isClusterHead / isDepartmentHead to false for everyone (no data source
    // exists in this app yet -- that belongs to PR #185/#150). That is only
    // safe because scoreConnect's unlocked3dCampfire never consults those
    // flags. If it ever did, hardcoding them false here would need to change
    // to hardcoding the unlock itself unsafe -- this test exists so that
    // change would be caught.
    const unlocked = rosterUnlocks3dCampfire(101, [
      member({ personId: 1, isLeader: false, chapters: [5] }),
    ]);
    expect(unlocked).toBe(true);
  });

  it("returns a plain boolean, not a ConnectScore -- callers cannot reach for points or stage from this adapter", () => {
    const result = rosterUnlocks3dCampfire(101, [member({ personId: 1, chapters: [5] })]);
    expect(typeof result).toBe("boolean");
  });
});
