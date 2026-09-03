import { describe, expect, it } from "vitest";

import { resolveAdminScope } from "@/lib/admin/access";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import type { SessionContext } from "@/lib/session";

function okSession(overrides: Partial<Extract<SessionContext, { status: "ok" }>>): SessionContext {
  return {
    status: "ok",
    rockPersonId: 999,
    displayName: "Test",
    memberships: [],
    sectionMemberships: [],
    activeGroup: null,
    campusId: null,
    isLeader: false,
    isAdminScope: false,
    ...overrides,
  };
}

describe("resolveAdminScope", () => {
  it("returns null for logged-out or not-found sessions", () => {
    expect(resolveAdminScope({ status: "logged-out" })).toBeNull();
    expect(resolveAdminScope({ status: "not-found-in-rock" })).toBeNull();
  });

  it("returns null when neither allowlisted nor a section member", () => {
    process.env.ADMIN_PERSON_IDS = "152";
    expect(resolveAdminScope(okSession({ rockPersonId: 42, sectionMemberships: [] }))).toBeNull();
  });

  it("gives the global root to an allowlisted person id", () => {
    process.env.ADMIN_PERSON_IDS = "152, 200";
    const scope = resolveAdminScope(okSession({ rockPersonId: 152 }));
    expect(scope).toEqual({ kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] });
  });

  it("gives section scope to an active GT24 member who isn't allowlisted", () => {
    process.env.ADMIN_PERSON_IDS = "152";
    const scope = resolveAdminScope(
      okSession({
        rockPersonId: 7821,
        sectionMemberships: [
          { Id: 1, PersonId: 7821, GroupId: 23870, GroupRoleId: 22, GroupMemberStatus: 1 },
          { Id: 2, PersonId: 7821, GroupId: 23870, GroupRoleId: 22, GroupMemberStatus: 1 },
          { Id: 3, PersonId: 7821, GroupId: 39, GroupRoleId: 68, GroupMemberStatus: 1 },
        ],
      }),
    );
    expect(scope).toEqual({ kind: "sections", rootIds: [23870, 39] });
  });

  it("de-duplicates repeated section group ids", () => {
    process.env.ADMIN_PERSON_IDS = "";
    const scope = resolveAdminScope(
      okSession({
        rockPersonId: 1,
        sectionMemberships: [
          { Id: 1, PersonId: 1, GroupId: 100, GroupRoleId: 22, GroupMemberStatus: 1 },
          { Id: 2, PersonId: 1, GroupId: 100, GroupRoleId: 68, GroupMemberStatus: 1 },
        ],
      }),
    );
    expect(scope).toEqual({ kind: "sections", rootIds: [100] });
  });
});
