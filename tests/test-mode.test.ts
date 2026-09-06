import { describe, expect, it, vi } from "vitest";

import { PLAN } from "@/lib/plan";
import {
  dateForSimulatedDay,
  guardWrite,
  initialTestModeState,
  isTestModeRequested,
  simulatedChapters,
  simulatedGroupRatio,
  simulatedMemberHistory,
  simulatedTodayState,
  TEST_MODE_BLOCKED_MESSAGE,
  writesBlocked,
} from "@/components/test-mode/logic";

describe("isTestModeRequested", () => {
  it("is true for ?test=1", () => {
    expect(isTestModeRequested(new URLSearchParams("test=1"))).toBe(true);
  });

  it("is true for the ?day=N alias", () => {
    expect(isTestModeRequested(new URLSearchParams("day=5"))).toBe(true);
  });

  it("is false with neither param", () => {
    expect(isTestModeRequested(new URLSearchParams(""))).toBe(false);
  });
});

describe("initialTestModeState", () => {
  it("seeds the day from ?day=N", () => {
    expect(initialTestModeState(new URLSearchParams("day=12")).day).toBe(12);
  });

  it("defaults to day 1 without ?day", () => {
    expect(initialTestModeState(new URLSearchParams("test=1")).day).toBe(1);
  });

  it("clamps an out-of-range ?day to 1", () => {
    expect(initialTestModeState(new URLSearchParams("day=999")).day).toBe(1);
    expect(initialTestModeState(new URLSearchParams("day=0")).day).toBe(1);
    expect(initialTestModeState(new URLSearchParams("day=nope")).day).toBe(1);
  });

  it("starts with nothing else simulated", () => {
    const state = initialTestModeState(new URLSearchParams("test=1"));
    expect(state.phase).toBe("active");
    expect(state.completionPct).toBe(0);
    expect(state.groupPct).toBe(0);
    expect(state.groupId).toBeNull();
    expect(state.viewer).toBe("member");
    expect(state).not.toHaveProperty("role");
  });
});

describe("writesBlocked", () => {
  it("returns false (writes allowed) when test mode is inactive", () => {
    expect(writesBlocked(false, null, null, null)).toBe(false);
    expect(writesBlocked(false, 87177, 87177, 87177)).toBe(false);
    expect(writesBlocked(false, 12345, 99999, 87177)).toBe(false);
  });

  describe("when test mode is active", () => {
    it("returns false (writes allowed) only when writable, selected, and real active all match", () => {
      expect(writesBlocked(true, 87177, 87177, 87177)).toBe(false);
    });

    it("returns true when writableGroupId is null", () => {
      expect(writesBlocked(true, 87177, 87177, null)).toBe(true);
      expect(writesBlocked(true, null, null, null)).toBe(true);
    });

    /**
     * `selectedGroupId === null` means "my real active group", the panel's
     * first option -- and the ONLY way that group can be selected, because the
     * picker filters it out of the campus list rather than listing it twice.
     *
     * Treating null as "nothing selected" made the sandbox unreachable: the
     * unblock requires the sandbox to be the session's real active group, and
     * in exactly that case the picker offers it only as "(my group)", i.e.
     * null. The feature could never activate. Hence null resolves to the real
     * active group here.
     */
    it("resolves a null selection to the real active group, so the sandbox is reachable", () => {
      expect(writesBlocked(true, null, 87177, 87177)).toBe(false);
    });

    it("still blocks a null selection when the real active group is not the sandbox", () => {
      expect(writesBlocked(true, null, 12345, 87177)).toBe(true);
      expect(writesBlocked(true, null, null, 87177)).toBe(true);
    });

    it("returns true when selectedGroupId does not match writableGroupId", () => {
      expect(writesBlocked(true, 12345, 87177, 87177)).toBe(true);
      expect(writesBlocked(true, 12345, 12345, 87177)).toBe(true);
    });

    it("returns true when realActiveGroupId does not match writableGroupId (A2 mismatch case)", () => {
      expect(writesBlocked(true, 87177, 99999, 87177)).toBe(true);
      expect(writesBlocked(true, 87177, null, 87177)).toBe(true);
    });
  });
});

describe("dateForSimulatedDay", () => {
  it("maps an active day to that day's real plan date", () => {
    expect(dateForSimulatedDay(1, "active")).toBe(PLAN[0].date);
    expect(dateForSimulatedDay(28, "active")).toBe(PLAN[27].date);
  });

  it("clamps an out-of-range active day into the plan", () => {
    expect(dateForSimulatedDay(0, "active")).toBe(PLAN[0].date);
    expect(dateForSimulatedDay(999, "active")).toBe(PLAN[27].date);
  });

  it("maps pre-launch/grace/closed to a date in that phase, independent of day", () => {
    expect(dateForSimulatedDay(5, "pre-launch") < "2026-10-01").toBe(true);
    expect(dateForSimulatedDay(5, "grace") >= "2026-10-29").toBe(true);
    expect(dateForSimulatedDay(5, "grace") <= "2026-10-31").toBe(true);
    expect(dateForSimulatedDay(5, "closed") > "2026-10-31").toBe(true);
  });
});

describe("simulatedTodayState", () => {
  it("derives phase and day label from the simulated date, same as the real clock would", () => {
    const state = simulatedTodayState(PLAN[4].date, "America/New_York");
    expect(state.todayLocal).toBe(PLAN[4].date);
    expect(state.timezone).toBe("America/New_York");
    expect(state.phase).toBe("active");
    expect(state.displayPhase).toBe("active");
    expect(state.dayLabel).toBe(5);
    expect(state.entry?.chapter).toBe(5);
  });

  it("has no entry before the plan starts", () => {
    const state = simulatedTodayState("2026-09-15", "UTC");
    expect(state.phase).toBe("pre-launch");
    expect(state.entry).toBeNull();
  });
});

describe("simulatedChapters", () => {
  it("is empty at 0%", () => {
    expect(simulatedChapters(0)).toEqual([]);
  });

  it("is all 28 chapters at 100%", () => {
    expect(simulatedChapters(100)).toEqual(PLAN.map((entry) => entry.chapter));
  });

  it("is a proportional, sequential prefix in between", () => {
    expect(simulatedChapters(50)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it("clamps out-of-range percentages", () => {
    expect(simulatedChapters(-10)).toEqual([]);
    expect(simulatedChapters(500)).toEqual(PLAN.map((entry) => entry.chapter));
  });
});

describe("simulatedMemberHistory", () => {
  it("varies member histories while keeping each result deterministic", () => {
    const jordan = simulatedMemberHistory(101, 50, "2026-10-14");
    const taylor = simulatedMemberHistory(102, 50, "2026-10-14");

    expect(jordan).not.toEqual(taylor);
    expect(simulatedMemberHistory(101, 50, "2026-10-14")).toEqual(jordan);
    expect(jordan.readingDates.every((date) => date <= "2026-10-14")).toBe(true);
  });
});

describe("simulatedGroupRatio", () => {
  it("converts a 0-100 percentage to a 0-1 ratio", () => {
    expect(simulatedGroupRatio(0)).toBe(0);
    expect(simulatedGroupRatio(50)).toBe(0.5);
    expect(simulatedGroupRatio(100)).toBe(1);
  });

  it("clamps out-of-range percentages", () => {
    expect(simulatedGroupRatio(-20)).toBe(0);
    expect(simulatedGroupRatio(150)).toBe(1);
  });
});

describe("guardWrite", () => {
  it("never calls the wrapped write action when test mode is active", async () => {
    const action = vi.fn(async () => ({ ok: true as const }));
    const guarded = guardWrite(true, action);

    const result = await guarded();

    expect(action).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: TEST_MODE_BLOCKED_MESSAGE });
  });

  it("passes arguments through to the real action when test mode is inactive", async () => {
    const action = vi.fn(async (chapter: number) => ({ ok: true as const, chapter }));
    const guarded = guardWrite(false, action);

    const result = await guarded(7);

    expect(action).toHaveBeenCalledWith(7);
    expect(result).toEqual({ ok: true, chapter: 7 });
  });

  it("blocks every call while active, not just the first", async () => {
    const action = vi.fn(async () => ({ ok: true as const }));
    const guarded = guardWrite(true, action);

    await guarded();
    await guarded();
    await guarded();

    expect(action).not.toHaveBeenCalled();
  });

  it.each([
    ["a valid-shaped code", "ABCD"],
    ["an invalid code", "ZZZZ"],
  ])("does not call a join action for %s in test mode", async (_label, code) => {
    const action = vi.fn(async (input: { code: string }) => ({
      ok: true as const,
      groupId: input.code.length,
      outcome: "joined" as const,
    }));
    const guarded = guardWrite(true, action);

    const result = await guarded({ code });

    expect(action).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: TEST_MODE_BLOCKED_MESSAGE });
  });

  it("blocks a check-in attempt for a non-sandbox group", async () => {
    const checkInAction = vi.fn(async () => ({ ok: true as const }));
    const nonSandboxBlocked = writesBlocked(true, 12345, 87177, 87177);
    const guarded = guardWrite(nonSandboxBlocked, checkInAction);

    const result = await guarded();

    expect(checkInAction).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: TEST_MODE_BLOCKED_MESSAGE });
  });

  it("allows a check-in attempt for the designated sandbox group when real active group matches", async () => {
    const checkInAction = vi.fn(async () => ({ ok: true as const }));
    const sandboxBlocked = writesBlocked(true, 87177, 87177, 87177);
    const guarded = guardWrite(sandboxBlocked, checkInAction);

    const result = await guarded();

    expect(checkInAction).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});

/**
 * The sandbox unblock is deliberately per-action, not one flag across all five
 * guarded writes. `joinByCode` joins whatever group the *entered code* belongs
 * to -- not the simulated group -- so a shared unblock would let any code
 * perform a real Rock write and move the tester's active group off the sandbox.
 * `chooseGroup` and `getOrCreateJoinCode` are Rock writes for the same reason,
 * and `saveProfile` persists outside the group entirely.
 *
 * AppShell therefore passes `writesBlocked(...)` only to checkIn, and plain
 * `testMode.active` to the other four. These assert the rule that wiring must
 * satisfy.
 */
describe("sandbox unblock is scoped to check-in only", () => {
  const SANDBOX = 87177;
  // The most permissive state that exists: simulating the sandbox, from a
  // session really in the sandbox, with the sandbox configured.
  const checkInGate = () => writesBlocked(true, SANDBOX, SANDBOX, SANDBOX);
  const otherActionGate = (testModeActive: boolean) => testModeActive;

  it("unblocks check-in in the fully-matching sandbox state", () => {
    expect(checkInGate()).toBe(false);
  });

  it.each([
    ["joinByCode"],
    ["chooseGroup"],
    ["saveProfile"],
    ["getOrCreateJoinCode"],
  ])("keeps %s blocked even in the fully-matching sandbox state", () => {
    expect(otherActionGate(true)).toBe(true);
  });

  it("never calls joinByCode in the sandbox state", async () => {
    const joinAction = vi.fn(async () => ({ ok: true as const }));
    const guarded = guardWrite(otherActionGate(true), joinAction);

    const result = await guarded();

    expect(joinAction).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: TEST_MODE_BLOCKED_MESSAGE });
  });

  it("still passes the four through untouched when test mode is off", async () => {
    const joinAction = vi.fn(async () => ({ ok: true as const }));
    const guarded = guardWrite(otherActionGate(false), joinAction);

    const result = await guarded();

    expect(joinAction).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});
