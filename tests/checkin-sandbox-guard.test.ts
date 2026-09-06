import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkIn } from "@/app/actions/checkIn";
import { getSessionContext } from "@/lib/session";
import { testWritableGroupId } from "@/lib/test-mode-config";

/**
 * The sandbox unblock is the only path on which test mode permits a real
 * write. AppShell decides to take it from props captured at page render, which
 * go stale if the active group changes elsewhere -- so the server re-checks the
 * claim against the session it resolves itself (round-3 finding 1).
 *
 * These assert the refusal, not the happy path: what matters is whether the
 * action reaches its insert at all.
 */

const SANDBOX = 87177;

vi.mock("@/lib/session", () => ({ getSessionContext: vi.fn() }));
vi.mock("@/lib/test-mode-config", () => ({ testWritableGroupId: vi.fn(() => null) }));
vi.mock("@/lib/cache/redis", () => ({ redisDel: vi.fn() }));
vi.mock("@/lib/data/stats", () => ({ getGroupStatsFresh: vi.fn(async () => null) }));
// Today is outside the plan window in real time, so validateCheckIn would
// reject before the insert and the positive tests below would pass for the
// wrong reason. Pin the clock to day 1 of the plan instead.
vi.mock("@/lib/dev-clock", () => ({ appNow: () => new Date(2026, 9, 1, 12, 0, 0) }));

const insertSpy = vi.fn();
vi.mock("@/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      insertSpy(...args);
      return {
        values: () => ({
          onConflictDoNothing: () => ({ returning: async () => [{ id: 1 }] }),
        }),
      };
    },
  },
}));

const session = vi.mocked(getSessionContext);
const writable = vi.mocked(testWritableGroupId);

function sessionInGroup(groupId: number | null) {
  session.mockResolvedValue({
    status: "ok",
    rockPersonId: 13358,
    campusId: 5,
    activeGroup: groupId === null ? null : { groupId, groupName: "TEST // Connect Group" },
  } as unknown as Awaited<ReturnType<typeof getSessionContext>>);
}

const BLOCKED = { ok: false, error: "Test mode: writes are disabled." };

describe("checkIn sandbox claim", () => {
  let input: { chapter: number; timezone: string };

  beforeEach(() => {
    vi.clearAllMocks();
    insertSpy.mockClear();
    input = { chapter: 1, timezone: "Asia/Manila" };
  });

  it("refuses when the session's active group is no longer the sandbox", async () => {
    writable.mockReturnValue(SANDBOX);
    sessionInGroup(12345); // moved on in another tab; this page's props still say SANDBOX

    expect(await checkIn({ ...input, sandboxGroupId: SANDBOX })).toEqual(BLOCKED);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("refuses when no sandbox is configured at all", async () => {
    writable.mockReturnValue(null);
    sessionInGroup(SANDBOX);

    expect(await checkIn({ ...input, sandboxGroupId: SANDBOX })).toEqual(BLOCKED);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("refuses a claimed group that is not the configured sandbox", async () => {
    writable.mockReturnValue(SANDBOX);
    sessionInGroup(SANDBOX);

    expect(await checkIn({ ...input, sandboxGroupId: 12345 })).toEqual(BLOCKED);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("refuses when the session has no active group", async () => {
    writable.mockReturnValue(SANDBOX);
    sessionInGroup(null);

    expect(await checkIn({ ...input, sandboxGroupId: SANDBOX })).toEqual(BLOCKED);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  /**
   * The refusals above all pass if the guard simply rejects every claim, which
   * would silently kill the one write test mode is meant to permit. These two
   * are the other half of the pair (round-4 finding 1).
   */
  it("proceeds when configured sandbox, claimed group, and live active group all agree", async () => {
    writable.mockReturnValue(SANDBOX);
    sessionInGroup(SANDBOX);

    const result = await checkIn({ ...input, sandboxGroupId: SANDBOX });

    expect(result.ok).toBe(true);
    expect(insertSpy).toHaveBeenCalled();
  });

  it("leaves an ordinary check-in untouched when no claim is made", async () => {
    writable.mockReturnValue(SANDBOX);
    sessionInGroup(12345);

    const result = await checkIn(input);

    expect(result.ok).toBe(true);
    expect(insertSpy).toHaveBeenCalled();
  });
});
