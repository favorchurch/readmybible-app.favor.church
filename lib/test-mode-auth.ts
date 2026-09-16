import "server-only";

import { resolveAdminScope } from "@/lib/admin/access";
import { flattenGroupNodes } from "@/lib/admin/stats";
import type { SessionContext } from "@/lib/session";
import { getAllCampusNames, getAllConnectGroups } from "@/lib/rock/client";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";

export type AuthorizedTestGroupOption = {
  groupId: number;
  groupName: string;
};

type GroupLike = {
  id: number;
  name: string;
  campusId: number | null;
};

/** Test Mode is an admin-scope tool, never a client-controlled role switch. */
export function isTestModeAuthorized(session: SessionContext): boolean {
  return session.status === "ok" && session.isAdminScope;
}

function addOption(
  options: Map<number, GroupLike>,
  group: GroupLike,
): void {
  if (!options.has(group.id)) options.set(group.id, group);
}

/**
 * Returns only real Connect Groups inside the caller's genuine admin scope.
 * Global admins may read the complete Connect tree; section admins get only
 * their loaded section subtrees plus Connect Groups they themselves belong to.
 */
export async function getAuthorizedTestGroupOptions(
  session: SessionContext,
): Promise<AuthorizedTestGroupOption[]> {
  if (session.status !== "ok") return [];
  const scope = resolveAdminScope(session);
  if (!scope) return [];

  const options = new Map<number, GroupLike>();
  for (const membership of session.memberships) {
    addOption(options, {
      id: membership.groupId,
      name: membership.groupName,
      campusId: membership.campusId,
    });
  }

  if (scope.kind === "global") {
    const groups = await getAllConnectGroups();
    for (const group of groups) {
      addOption(options, { id: group.Id, name: group.Name, campusId: group.CampusId });
    }
  } else {
    const sections = await loadSectionSubtree(scope.rootIds);
    for (const group of flattenGroupNodes(sections)) {
      addOption(options, { id: group.id, name: group.name, campusId: group.campusId });
    }
  }

  const campusNames = await getAllCampusNames();
  return [...options.values()]
    .map((group) => {
      const campus = group.campusId === null ? null : (campusNames.get(group.campusId) ?? null);
      return {
        groupId: group.id,
        groupName: campus ? `${group.name} — ${campus}` : group.name,
      };
    })
    .sort((a, b) => a.groupName.localeCompare(b.groupName));
}

/**
 * Authorizes a real group ID without probing an out-of-scope group's details.
 * The action calls this before getGroupBasic/getRoster, so a forged selector
 * cannot turn a denied scenario into a Rock data lookup.
 */
export async function canAccessRealTestGroup(
  session: SessionContext,
  groupId: number,
): Promise<boolean> {
  if (session.status !== "ok") return false;
  const scope = resolveAdminScope(session);
  if (!scope) return false;
  if (scope.kind === "global") return true;
  if (session.memberships.some((membership) => membership.groupId === groupId)) return true;

  const sections = await loadSectionSubtree(scope.rootIds);
  return flattenGroupNodes(sections).some((group) => group.id === groupId);
}
