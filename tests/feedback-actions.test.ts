import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/db/schema", () => ({
  feedback: {
    id: "id",
    rockPersonId: "rockPersonId",
    category: "category",
    textualFeedback: "textualFeedback",
    createdAt: "createdAt",
  },
}));
vi.mock("@/db", () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
  },
}));
vi.mock("drizzle-orm", () => ({ desc: (value: unknown) => value }));

import { getFeedback } from "@/app/actions/getFeedback";
import { submitFeedback } from "@/app/actions/submitFeedback";

const session = {
  status: "ok" as const,
  rockPersonId: 42,
  rockGender: null,
  displayName: "Alex",
  memberships: [],
  sectionMemberships: [],
  activeGroup: null,
  needsGroupChoice: false,
  campusId: null,
  isLeader: false,
  isAdminScope: true,
  defaultTranslation: "NIV" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("FEEDBACK_REVIEWER_PERSON_IDS", "42");
  mocks.getSessionContext.mockResolvedValue(session);
  mocks.values.mockResolvedValue(undefined);
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.orderBy.mockResolvedValue([]);
  mocks.from.mockReturnValue({ orderBy: mocks.orderBy });
  mocks.select.mockReturnValue({ from: mocks.from });
});

afterEach(() => vi.unstubAllEnvs());

describe("feedback actions", () => {
  it("rejects invalid categories before touching the database", async () => {
    await expect(submitFeedback({ category: "Read My Bible App", textualFeedback: "   " })).resolves.toEqual({
      ok: false,
      error: expect.stringContaining("Choose one of these categories"),
    });
    expect(mocks.getSessionContext).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("stores the authenticated person ID with the validated feedback", async () => {
    await expect(submitFeedback({ category: "Experience with Favor Connects", textualFeedback: "More ways to find a group." })).resolves.toEqual({ ok: true });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledWith({
      rockPersonId: 42,
      category: "Experience with Favor Connects",
      textualFeedback: "More ways to find a group.",
    });
  });

  it("rejects a non-reviewer even when they have admin scope", async () => {
    mocks.getSessionContext.mockResolvedValue({ ...session, rockPersonId: 99, isAdminScope: true });
    await expect(getFeedback()).resolves.toEqual({
      ok: false,
      error: "You don't have access to submitted feedback.",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns reviewer-only rows in a client-safe shape", async () => {
    const submittedAt = new Date("2026-09-16T08:00:00.000Z");
    mocks.orderBy.mockResolvedValue([
      {
        id: 7,
        submittedByPersonId: 99,
        category: "Read My Bible App",
        textualFeedback: "The reading view is helpful.",
        submittedAt,
      },
    ]);

    await expect(getFeedback()).resolves.toEqual({
      ok: true,
      items: [{
        id: 7,
        submittedByPersonId: 99,
        category: "Read My Bible App",
        textualFeedback: "The reading view is helpful.",
        submittedAt: submittedAt.toISOString(),
      }],
    });
  });

  it("returns a declared failure when the reviewer query cannot reach the database", async () => {
    mocks.orderBy.mockRejectedValue(new Error("database unavailable"));

    await expect(getFeedback()).resolves.toEqual({
      ok: false,
      error: "We couldn't load submitted feedback. Please try again.",
    });
  });
});
