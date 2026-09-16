/**
 * Admin dashboard access resolution. See intent/SPEC.md "Admin dashboard"
 * and intent/FLOWS.md "Admin dashboard".
 *
 * No "server-only" here on purpose: this module only reads plain data
 * (SessionContext, env) with no secrets or DB/Rock calls of its own, and
 * keeping it free of that import lets tests exercise it directly, the same
 * way lib/checkin-validation.ts stays free of "server-only" so it's
 * testable apart from app/actions/checkIn.ts.
 */
import type { SessionContext } from "@/lib/session";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";

export type AdminScope =
  | { kind: "global"; rootIds: [typeof GLOBAL_ROOT_SECTION_ID] }
  | { kind: "sections"; rootIds: number[] };

export type TestScopeName = "global" | "cluster" | "region";

export type TestScopeResolution = {
  scope: AdminScope | null;
  simulatedScope: TestScopeName | undefined;
};

/**
 * Applies the legacy admin test scope only where the real caller can already
 * see the whole tree. A section-scoped viewer keeps their server-resolved
 * roots, even when a URL asks for `scope=global` (issue #92).
 */
export function resolveTestScope(
  realScope: AdminScope | null,
  options: { isDev: boolean; testRequested: boolean; scopeParam?: string },
): TestScopeResolution {
  if (!realScope) return { scope: null, simulatedScope: undefined };
  if (realScope.kind !== "global") return { scope: realScope, simulatedScope: undefined };

  const shouldSimulate = options.isDev
    ? options.testRequested || options.scopeParam !== undefined
    : options.testRequested;
  if (!shouldSimulate) return { scope: realScope, simulatedScope: undefined };

  switch (options.scopeParam ?? "global") {
    case "global":
      return { scope: { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] }, simulatedScope: "global" };
    case "cluster":
      return { scope: { kind: "sections", rootIds: [23869] }, simulatedScope: "cluster" };
    case "region":
      return { scope: { kind: "sections", rootIds: [23870] }, simulatedScope: "region" };
    default:
      return { scope: realScope, simulatedScope: undefined };
  }
}

function getAdminPersonIds(): number[] {
  return (process.env.ADMIN_PERSON_IDS ?? "")
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

/**
 * `{ kind: "global" }` for an allowlisted person (`ADMIN_PERSON_IDS`) --
 * they see the whole Connect Groups tree. `{ kind: "sections" }` for anyone
 * with at least one active GT24 section membership -- they see just those
 * subtrees. `null` otherwise, which the caller renders as a 403.
 */
export function resolveAdminScope(session: SessionContext): AdminScope | null {
  if (session.status !== "ok") return null;

  if (getAdminPersonIds().includes(session.rockPersonId)) {
    return { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] };
  }

  if (session.sectionMemberships.length > 0) {
    const rootIds = Array.from(new Set(session.sectionMemberships.map((m) => m.GroupId)));
    return { kind: "sections", rootIds };
  }

  return null;
}

export type ScopeRole = "Global Admin" | "Cluster Head" | "Regional Leader" | "Section Leader";

/**
 * Derives a human-readable role title for the viewer's active admin scope:
 * - "Global Admin" for global root access.
 * - "Cluster Head" if any visible section has child sections (regions) or has "cluster" in its name.
 * - "Regional Leader" if sections are direct parents of leaf Connect Groups or have "region" in their name.
 * - "Section Leader" as fallback.
 */
export function resolveScopeRole(
  scope: AdminScope,
  sections: Array<{ name: string; children?: unknown[] }> = [],
): ScopeRole {
  if (scope.kind === "global") return "Global Admin";

  const hasSubSections = sections.some((s) => Array.isArray(s.children) && s.children.length > 0);
  const anyClusterName = sections.some((s) => s.name.toLowerCase().includes("cluster"));
  if (hasSubSections || anyClusterName) return "Cluster Head";

  const anyRegionName = sections.some((s) => s.name.toLowerCase().includes("region"));
  if (anyRegionName || sections.every((s) => !s.children || (Array.isArray(s.children) && s.children.length === 0))) {
    return "Regional Leader";
  }

  return "Section Leader";
}
