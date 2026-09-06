import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/db/schema", () => ({ profiles: { rockPersonId: "rockPersonId" } }));
vi.mock("@/db", () => ({ db: { insert: mocks.insert } }));

import { chooseGroup } from "@/app/actions/chooseGroup";

const session = {
  status: "ok" as const,
  rockPersonId: 13358,
  displayName: "Alex",
  memberships: [
    { groupId: 101, groupName: "Alpha", campusId: 1, roleId: 23, isLeader: false },
    { groupId: 202, groupName: "Beta", campusId: 2, roleId: 24, isLeader: true },
  ],
};

describe("chooseGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.mockReturnValue({ onConflictDoUpdate: mocks.onConflictDoUpdate });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.onConflictDoUpdate.mockResolvedValue(undefined);
    mocks.getSessionContext.mockResolvedValue(session);
  });

  it("persists a group only when it is in the fresh session memberships", async () => {
    await expect(chooseGroup({ groupId: 101 })).resolves.toEqual({ ok: true });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ activeGroupId: 101 }));
    expect(mocks.onConflictDoUpdate).toHaveBeenCalled();
  });

  it("rejects an unauthorized group without touching the database", async () => {
    await expect(chooseGroup({ groupId: 999 })).resolves.toEqual({ ok: false, error: "You're not a member of that group." });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("maps persistence failures to a user-safe result and logs diagnostics", async () => {
    const error = new Error("database connection details");
    mocks.onConflictDoUpdate.mockRejectedValueOnce(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(chooseGroup({ groupId: 101 })).resolves.toEqual({
      ok: false,
      error: "We couldn't save that group. Please try again.",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "chooseGroup failed while resolving the session or saving the active group",
      error,
    );
    expect(JSON.stringify(await chooseGroup({ groupId: 101 }))).not.toContain("database connection details");
    errorSpy.mockRestore();
  });

  it("maps an unexpected session-resolution rejection to the same safe result", async () => {
    const error = new Error("auth/session internals");
    mocks.getSessionContext.mockRejectedValueOnce(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(chooseGroup({ groupId: 202 })).resolves.toEqual({
      ok: false,
      error: "We couldn't save that group. Please try again.",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "chooseGroup failed while resolving the session or saving the active group",
      error,
    );
    errorSpy.mockRestore();
  });
});
