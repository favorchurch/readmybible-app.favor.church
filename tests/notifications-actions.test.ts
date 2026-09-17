import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  getRoster: vi.fn(),
  appNow: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  updateWhere: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/lib/rock/client", () => ({ getRoster: mocks.getRoster }));
vi.mock("@/lib/dev-clock", () => ({ appNow: mocks.appNow }));

vi.mock("@/db", () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
    update: mocks.update,
  },
}));

import {
  dismissAllNotifications,
  dismissNotification,
  getNotifications,
  sendNudge,
} from "@/app/actions/notifications";

const memberSession = {
  status: "ok" as const,
  rockPersonId: 100,
  rockGender: null,
  displayName: "Jordan",
  memberships: [
    {
      groupId: 501,
      groupName: "Alpha Connect",
      campusId: 1,
      roleId: 23,
      isLeader: false,
    },
  ],
  sectionMemberships: [],
  activeGroup: {
    groupId: 501,
    groupName: "Alpha Connect",
    campusId: 1,
    roleId: 23,
    isLeader: false,
  },
  needsGroupChoice: false,
  campusId: 1,
  isLeader: false,
  isAdminScope: false,
  defaultTranslation: "NIV" as const,
};

const regionalLeaderSession = {
  status: "ok" as const,
  rockPersonId: 999,
  rockGender: null,
  displayName: "Regional Head",
  memberships: [], // not a member of group 501
  sectionMemberships: [],
  activeGroup: null,
  needsGroupChoice: false,
  campusId: 1,
  isLeader: false,
  isAdminScope: true, // Regional/Cluster authority alone
  defaultTranslation: "NIV" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSessionContext.mockResolvedValue(memberSession);
  mocks.appNow.mockReturnValue(new Date());
  // Default roster covers both the sender (100) and the usual test target
  // (101) so existing tests don't need to know about the roster check.
  mocks.getRoster.mockResolvedValue([{ PersonId: 100 }, { PersonId: 101 }]);

  mocks.values.mockResolvedValue([{ id: 1 }]);
  mocks.insert.mockReturnValue({ values: mocks.values });

  mocks.limit.mockResolvedValue([]);
  mocks.orderBy.mockReturnValue({ limit: mocks.limit });
  mocks.where.mockReturnValue({ limit: mocks.limit, orderBy: mocks.orderBy });
  mocks.from.mockReturnValue({
    where: mocks.where,
    orderBy: mocks.orderBy,
  });
  mocks.select.mockReturnValue({ from: mocks.from });

  mocks.updateWhere.mockResolvedValue(undefined);
  mocks.set.mockReturnValue({ where: mocks.updateWhere });
  mocks.update.mockReturnValue({ set: mocks.set });
});

describe("sendNudge server action", () => {
  it("refuses when user is not authenticated", async () => {
    mocks.getSessionContext.mockResolvedValue({ status: "logged-out" });

    const res = await sendNudge({ targetPersonId: 101, groupId: 501 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("unauthenticated");
      expect(res.error).toContain("logged in");
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("Known-Bad 4: refuses self-nudge", async () => {
    const res = await sendNudge({ targetPersonId: 100, groupId: 501 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("self-nudge");
      expect(res.error).toBe("You cannot nudge yourself.");
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("Known-Bad 5: refuses when a Regional/Cluster viewer is not in the Connect nor its Connect Leader", async () => {
    mocks.getSessionContext.mockResolvedValue(regionalLeaderSession);

    const res = await sendNudge({ targetPersonId: 101, groupId: 501 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("not-authorized");
      expect(res.error).toContain("must be a member of this Connect group");
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("allows fellow Connect member to nudge another member and creates notification", async () => {
    // No existing nudge today
    mocks.limit.mockResolvedValue([]);

    const res = await sendNudge({ targetPersonId: 101, groupId: 501 });
    expect(res.ok).toBe(true);

    // Should insert to nudges and notifications
    expect(mocks.insert).toHaveBeenCalledTimes(2);

    // First insert is nudges
    const nudgeValues = mocks.values.mock.calls[0][0];
    expect(nudgeValues.senderRockPersonId).toBe(100);
    expect(nudgeValues.recipientRockPersonId).toBe(101);
    expect(nudgeValues.groupId).toBe(501);

    // Second insert is notifications
    const notifValues = mocks.values.mock.calls[1][0];
    expect(notifValues.rockPersonId).toBe(101);
    expect(notifValues.senderRockPersonId).toBe(100);
    expect(notifValues.type).toBe("nudge");
    expect(notifValues.message).toContain("Jordan nudged you");
  });

  it("R1: refuses to nudge a target who is not a member of the requested group", async () => {
    // Recipient 987654 is not in group 501's roster -- only the sender is.
    mocks.getRoster.mockResolvedValue([{ PersonId: 100 }]);

    const res = await sendNudge({ targetPersonId: 987654, groupId: 501 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("not-authorized");
    }
    expect(mocks.getRoster).toHaveBeenCalledWith(501);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("R2: the persisted rate-limit day comes from the sender's session campus, not a forged client timezone", async () => {
    // At this UTC instant Asia/Manila (UTC+8, the memberSession's campus
    // timezone) has already rolled over to Oct 6, while Pacific/Honolulu
    // (UTC-10) is still on Oct 5.
    mocks.appNow.mockReturnValue(new Date("2026-10-05T20:00:00Z"));
    mocks.limit.mockResolvedValue([]);

    await sendNudge({
      targetPersonId: 101,
      groupId: 501,
      timezone: "Asia/Manila",
    } as unknown as Parameters<typeof sendNudge>[0]);
    const firstNudgeDate = mocks.values.mock.calls[0][0].nudgeDate;

    mocks.values.mockClear();
    mocks.insert.mockClear();

    await sendNudge({
      targetPersonId: 101,
      groupId: 501,
      timezone: "Pacific/Honolulu",
    } as unknown as Parameters<typeof sendNudge>[0]);
    const secondNudgeDate = mocks.values.mock.calls[0][0].nudgeDate;

    // A rotated, attacker-supplied timezone must not change the persisted
    // rate-limit key -- both calls land on the same server-derived day.
    expect(firstNudgeDate).toBe("2026-10-06");
    expect(secondNudgeDate).toBe("2026-10-06");
  });

  it("Known-Bad 3: refuses a second nudge on the same calendar day non-destructively", async () => {
    // Already nudged today
    mocks.limit.mockResolvedValue([{ id: 10 }]);

    const res = await sendNudge({ targetPersonId: 101, groupId: 501 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("already-nudged");
      expect(res.error).toBe("You've already nudged this member today.");
    }

    // No inserts performed
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("handles race condition where database unique constraint fires", async () => {
    mocks.limit.mockResolvedValue([]);
    mocks.values.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint nudges_sender_recipient_date_unique"));

    const res = await sendNudge({ targetPersonId: 101, groupId: 501 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("already-nudged");
      expect(res.error).toBe("You've already nudged this member today.");
    }
  });
});

describe("getNotifications server action", () => {
  it("returns notifications for the authenticated user", async () => {
    const createdAt = new Date("2026-10-05T10:00:00Z");
    mocks.limit.mockResolvedValue([
      {
        id: 1,
        type: "nudge",
        title: "Nudge",
        message: "Alex nudged you to read today!",
        senderRockPersonId: 200,
        groupId: 501,
        metadata: { senderName: "Alex" },
        createdAt,
        dismissedAt: null,
      },
    ]);

    const res = await getNotifications();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.notifications).toHaveLength(1);
      expect(res.notifications[0].title).toBe("Nudge");
      expect(res.notifications[0].senderName).toBe("Alex");
      expect(res.notifications[0].dismissedAt).toBeNull();
    }
  });
});

describe("dismissNotification server action", () => {
  it("updates dismissedAt for the given notification", async () => {
    const res = await dismissNotification({ id: 1 });
    expect(res.ok).toBe(true);
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ dismissedAt: expect.any(Date) }));
  });

  it("dismissAllNotifications updates all undismissed notifications for user", async () => {
    const res = await dismissAllNotifications();
    expect(res.ok).toBe(true);
    expect(mocks.update).toHaveBeenCalled();
  });
});
