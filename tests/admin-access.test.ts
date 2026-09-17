import { describe, expect, it } from "vitest";

import { resolveAdminScope, resolveScopeRole, resolveTestScope } from "@/lib/admin/access";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import type { SessionContext } from "@/lib/session";

function okSession(overrides: Partial<Extract<SessionContext, { status: "ok" }>>): SessionContext {
  return {
    status: "ok",
    rockGender: null,
    rockPersonId: 999,
    displayName: "Test",
    memberships: [],
    sectionMemberships: [],
    activeGroup: null,
    needsGroupChoice: false,
    campusId: null,
    isLeader: false,
    isAdminScope: false,
    defaultTranslation: "NET",
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

describe("resolveScopeRole", () => {
  it("identifies global scope as Global Admin", () => {
    expect(resolveScopeRole({ kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] })).toBe("Global Admin");
  });

  it("identifies sections with child sub-sections as Cluster Head", () => {
    const role = resolveScopeRole(
      { kind: "sections", rootIds: [23869] },
      [{ name: "MNL Adults", children: [{ name: "Region A" }] }],
    );
    expect(role).toBe("Cluster Head");
  });

  it("identifies sections with Cluster in name as Cluster Head even if empty children", () => {
    const role = resolveScopeRole(
      { kind: "sections", rootIds: [23869] },
      [{ name: "Cluster // Grace & Miguel", children: [] }],
    );
    expect(role).toBe("Cluster Head");
  });

  it("identifies leaf sections as Regional Leader", () => {
    const role = resolveScopeRole(
      { kind: "sections", rootIds: [23870] },
      [{ name: "Region // Carlo & Bianca", children: [] }],
    );
    expect(role).toBe("Regional Leader");
  });

  it("identifies sections with no child sections as Regional Leader", () => {
    const role = resolveScopeRole(
      { kind: "sections", rootIds: [555] },
      [{ name: "Young Adults East", children: [] }],
    );
    expect(role).toBe("Regional Leader");
  });
});

describe("resolveTestScope", () => {
  it("keeps a section admin on their real roots despite scope=global", () => {
    const realScope = { kind: "sections" as const, rootIds: [100] };
    expect(resolveTestScope(realScope, { isDev: false, testRequested: true, scopeParam: "global" })).toEqual({
      scope: realScope,
      simulatedScope: undefined,
    });
  });

  it("allows a global admin to simulate a narrower scope", () => {
    expect(resolveTestScope(
      { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] },
      { isDev: false, testRequested: true, scopeParam: "region" },
    )).toEqual({
      scope: { kind: "sections", rootIds: [23870] },
      simulatedScope: "region",
    });
  });

  it("never creates a scope for an unauthorised session", () => {
    expect(resolveTestScope(null, { isDev: true, testRequested: true, scopeParam: "global" })).toEqual({
      scope: null,
      simulatedScope: undefined,
    });
  });
});
