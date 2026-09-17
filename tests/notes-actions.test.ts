import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  getMemberships: vi.fn(),
  loadSectionSubtree: vi.fn(),
  flattenGroupNodes: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  returningInsert: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/lib/rock/client", () => ({ getMemberships: mocks.getMemberships }));
vi.mock("@/lib/rock/hierarchy", () => ({ loadSectionSubtree: mocks.loadSectionSubtree }));
vi.mock("@/lib/admin/stats", () => ({ flattenGroupNodes: mocks.flattenGroupNodes }));
vi.mock("@/db/schema", () => ({
  notes: {
    id: "id",
    rockPersonId: "rockPersonId",
    groupId: "groupId",
    page: "page",
    content: "content",
    isShared: "isShared",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  profiles: { rockPersonId: "rockPersonId", activeGroupId: "activeGroupId", displayName: "displayName" },
}));
vi.mock("@/db", () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
  },
}));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (a: unknown, b: unknown) => [a, b],
}));

import { canReadSharedNote, getNote, saveNote } from "@/app/actions/notes";
import type { SessionContext } from "@/lib/session";

function okSession(overrides: Partial<SessionContext & { status: "ok" }> = {}): SessionContext {
  return {
    status: "ok",
    rockPersonId: 2,
    rockGender: null,
    displayName: "Reader",
    memberships: [],
    sectionMemberships: [],
    activeGroup: null,
    needsGroupChoice: false,
    campusId: null,
    isLeader: false,
    isAdminScope: false,
    defaultTranslation: "NIV",
    ...overrides,
  } as SessionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ onConflictDoUpdate: mocks.onConflictDoUpdate });
  mocks.onConflictDoUpdate.mockReturnValue({ returning: mocks.returningInsert });
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ limit: mocks.limit });
});

describe("saveNote: campaign calendar boundary", () => {
  /** Known-bad behavior (issue #148): no notebook page for a date outside the campaign calendar. */
  it("rejects a page outside the campaign calendar before touching the session or the database", async () => {
    const result = await saveNote({ page: "2026-11-03", content: "test", isShared: false });

    expect(result.ok).toBe(false);
    expect(mocks.getSessionContext).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("accepts General and in-range calendar dates", async () => {
    mocks.getSessionContext.mockResolvedValue(okSession({ rockPersonId: 1 }));
    mocks.returningInsert.mockResolvedValue([
      { id: 9, page: "general", content: "hi", isShared: false, updatedAt: new Date("2026-10-05T00:00:00Z") },
    ]);

    const result = await saveNote({ page: "general", content: "hi", isShared: false });
    expect(result.ok).toBe(true);
  });
});

describe("getNote: private note exposure", () => {
  it("shows the owner their own content", async () => {
    mocks.getSessionContext.mockResolvedValue(okSession({ rockPersonId: 1 }));
    mocks.limit.mockResolvedValueOnce([
      {
        id: 7,
        rockPersonId: 1,
        groupId: 500,
        page: "general",
        content: "a private reflection",
        isShared: false,
        updatedAt: new Date("2026-10-05T00:00:00Z"),
      },
    ]);

    const result = await getNote({ page: "general" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.note.content).toBe("a private reflection");
      expect(result.note.isOwner).toBe(true);
    }
  });

  /** Known-bad behavior (issue #148): existence only, never content, for someone else's private note. */
  it("exposes only existence, never content, for someone else's private note", async () => {
    mocks.getSessionContext.mockResolvedValue(okSession({ rockPersonId: 2 }));
    mocks.limit.mockResolvedValueOnce([
      {
        id: 7,
        rockPersonId: 1,
        groupId: 500,
        page: "general",
        content: "a private reflection",
        isShared: false,
        updatedAt: new Date("2026-10-05T00:00:00Z"),
      },
    ]);

    const result = await getNote({ page: "general", authorPersonId: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.note.exists).toBe(true);
      expect(result.note.isShared).toBe(false);
      expect(result.note.content).toBeNull();
    }
  });

  /** Known-bad behavior (issue #148): admin capability alone does not grant shared-note access. */
  it("denies a shared note to an admin with no Connect relationship to the author", async () => {
    mocks.getSessionContext.mockResolvedValue(
      okSession({ rockPersonId: 2, sectionMemberships: [{ GroupId: 900 } as never], isAdminScope: true }),
    );
    mocks.limit.mockResolvedValueOnce([
      {
        id: 7,
        rockPersonId: 1,
        groupId: 500,
        page: "general",
        content: "shared with my connect",
        isShared: true,
        updatedAt: new Date("2026-10-05T00:00:00Z"),
      },
    ]);
    mocks.loadSectionSubtree.mockResolvedValue([{ id: 900 }]);
    mocks.flattenGroupNodes.mockReturnValue([{ id: 999 }]); // does not include the note's group (500)

    const result = await getNote({ page: "general", authorPersonId: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exists).toBe(true);
    }
  });
});

describe("canReadSharedNote: admin capability alone does not grant access", () => {
  it("allows a current fellow Connect member", async () => {
    const session = okSession({ rockPersonId: 2, memberships: [{ groupId: 500, isLeader: false } as never] });
    await expect(canReadSharedNote(session, 1, 500)).resolves.toBe(true);
  });

  it("allows a direct Leader over that Connect", async () => {
    const session = okSession({ rockPersonId: 2, memberships: [{ groupId: 500, isLeader: true } as never] });
    await expect(canReadSharedNote(session, 1, 500)).resolves.toBe(true);
  });

  it("allows an upstream Leader whose section subtree genuinely contains the Connect", async () => {
    mocks.loadSectionSubtree.mockResolvedValue([{ id: 900 }]);
    mocks.flattenGroupNodes.mockReturnValue([{ id: 500 }]);
    const session = okSession({ rockPersonId: 2, sectionMemberships: [{ GroupId: 900 } as never] });

    await expect(canReadSharedNote(session, 1, 500)).resolves.toBe(true);
  });

  it("denies an upstream viewer whose section subtree does not actually include the Connect", async () => {
    mocks.loadSectionSubtree.mockResolvedValue([{ id: 900 }]);
    mocks.flattenGroupNodes.mockReturnValue([{ id: 777 }]);
    const session = okSession({ rockPersonId: 2, sectionMemberships: [{ GroupId: 900 } as never], isAdminScope: true });

    await expect(canReadSharedNote(session, 1, 500)).resolves.toBe(false);
  });

  it("denies a viewer with no membership and no section relationship at all", async () => {
    const session = okSession({ rockPersonId: 2 });
    await expect(canReadSharedNote(session, 1, 500)).resolves.toBe(false);
    expect(mocks.loadSectionSubtree).not.toHaveBeenCalled();
  });
});
