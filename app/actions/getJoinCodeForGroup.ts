"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { joinCodes } from "@/db/schema";
import { resolveAdminScope } from "@/lib/admin/access";
import { flattenGroupNodes } from "@/lib/admin/stats";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { getSessionContext } from "@/lib/session";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
});

export type JoinCodeForGroupResult = { ok: true; code: string | null } | { ok: false; error: string };

/**
 * Returns the existing join code for a Connect Group, for test-mode
 * simulation -- never creates one (see getOrCreateJoinCode.ts for that).
 * Read-only: allowed for an admin-scope viewer (resolveAdminScope) or a
 * leader/assistant leader of `groupId` itself. Everyone else gets
 * `{ ok: false }`, including an unauthenticated caller.
 */
export async function getJoinCodeForGroup(groupId: number): Promise<JoinCodeForGroupResult> {
  const parsed = inputSchema.safeParse({ groupId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid group ID." };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in." };
  }

  const scope = resolveAdminScope(session);
  const leadsGroup = session.memberships.some((m) => m.groupId === parsed.data.groupId && m.isLeader);

  let authorized = leadsGroup;
  if (!authorized && scope !== null) {
    if (scope.kind === "global") {
      authorized = true;
    } else {
      const subtree = await loadSectionSubtree(scope.rootIds);
      const groupsInScope = flattenGroupNodes(subtree);
      authorized = groupsInScope.some((g) => g.id === parsed.data.groupId);
    }
  }

  if (!authorized) {
    return { ok: false, error: "You don't have access to this group's join code." };
  }

  const [existing] = await db.select().from(joinCodes).where(eq(joinCodes.groupId, parsed.data.groupId)).limit(1);
  return { ok: true, code: existing?.code ?? null };
}
