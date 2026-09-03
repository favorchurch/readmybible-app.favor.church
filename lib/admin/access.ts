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
