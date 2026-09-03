/**
 * Rock GT24 section hierarchy for the admin dashboard. See intent/SPEC.md
 * "Admin dashboard" and intent/FLOWS.md "Admin dashboard".
 *
 * Root section discovered live on 2026-09-03 via `rock_entity` (Rock MCP,
 * read-only) by walking ParentGroupId up from Connect Group 24077
 * ("Adults // Erwin & Jeric Presnedi", GT25), which sits inside section
 * 23870:
 *
 *   24077 (GT25 group)
 *     -> 23870 "Region // Arnel Guiron & Belle Guiron"      (GT24)
 *     -> 23869 "Cluster // Cielo Pabalan & Peejay Pabalan"  (GT24)
 *     -> 78    "MNL Adults"                                 (GT24, department, CampusId 1)
 *     -> 39    "MNL Connect Groups"                         (GT24, campus root, CampusId 1)
 *     -> 22464 "Connect Groups"  ParentGroupId: null         (GT24, GLOBAL ROOT)
 *
 * Siblings of 39 directly under 22464 are the other campus roots:
 *   39    "MNL Connect Groups" (CampusId 1)
 *   22863 "BNE Connect Groups" (CampusId 2)
 *   22864 "SEL Connect Groups" (CampusId 3)
 *
 * Never write to Rock from this module.
 */
import "server-only";

import { cached } from "@/lib/cache/redis";
import {
  GROUP_MEMBER_STATUS_ACTIVE,
  GROUP_TYPE_CONNECT_GROUP,
  GROUP_TYPE_SECTION,
  GT25_ACTIVE_ROLE_IDS,
  ROLE_GT25_ASSISTANT_LEADER,
  ROLE_GT25_LEADER,
} from "@/lib/rock/constants";
import { RockApiError, RockConfigError } from "@/lib/rock/client";

export { GLOBAL_ROOT_SECTION_ID, CAMPUS_ROOT_SECTION_IDS } from "@/lib/rock/hierarchy-constants";

const ROCK_API_URL = process.env.ROCK_API_URL ?? "https://rock.favor.church/api";

function requireApiKey(): string {
  const key = process.env.ROCK_API_KEY;
  if (!key) {
    throw new RockConfigError(
      "ROCK_API_KEY is not set. Rock reads are unavailable until it is provisioned.",
    );
  }
  return key;
}

async function rockFetch<T>(path: string): Promise<T> {
  const key = requireApiKey();
  const res = await fetch(`${ROCK_API_URL}/${path}`, {
    headers: { "Authorization-Token": key, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new RockApiError(`Rock API ${path} failed: ${res.status} ${body}`.slice(0, 500), res.status);
  }
  return (await res.json()) as T;
}

type RawGroup = {
  Id: number;
  Name: string;
  GroupTypeId: number;
  CampusId: number | null;
  ParentGroupId: number | null;
  IsActive: boolean;
  IsArchived: boolean;
};

type RawGroupMember = {
  GroupId: number;
  GroupRoleId: number;
  GroupMemberStatus: number;
  Person?: { FirstName: string | null; NickName: string | null } | null;
};

/** A leaf Connect Group (GT25) inside the hierarchy, with roster summary. */
export type HierarchyGroupNode = {
  id: number;
  name: string;
  campusId: number | null;
  memberCount: number;
  leaders: string[];
};

/** A GT24 section, with its GT25 groups and any child sections. */
export type HierarchySectionNode = {
  id: number;
  name: string;
  campusId: number | null;
  children: HierarchySectionNode[];
  groups: HierarchyGroupNode[];
};

// Rock (IIS) rejects very long OData $filter query strings with a plain
// 400 -- chunking at 40 ids reliably triggered that with long "or" chains
// of ParentGroupId/GroupId/Id clauses, so this stays modest.
const CHUNK_SIZE = 15;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Batched `Groups?$filter=Id eq a or Id eq b or ...` across chunks of ids. */
async function fetchGroupsByIds(ids: number[]): Promise<RawGroup[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    chunk(ids, CHUNK_SIZE).map((batch) => {
      const filter = batch.map((id) => `Id eq ${id}`).join(" or ");
      return rockFetch<RawGroup[]>(
        `Groups?$filter=${encodeURIComponent(filter)}&$select=Id,Name,GroupTypeId,CampusId,ParentGroupId,IsActive,IsArchived`,
      );
    }),
  );
  return results.flat();
}

/** Batched `Groups?$filter=ParentGroupId eq a or ParentGroupId eq b or ...` across chunks of parent ids. */
async function fetchGroupsByParentIds(parentIds: number[]): Promise<RawGroup[]> {
  if (parentIds.length === 0) return [];
  const results = await Promise.all(
    chunk(parentIds, CHUNK_SIZE).map((batch) => {
      const filter = batch.map((id) => `ParentGroupId eq ${id}`).join(" or ");
      return rockFetch<RawGroup[]>(
        `Groups?$filter=${encodeURIComponent(filter)}&$select=Id,Name,GroupTypeId,CampusId,ParentGroupId,IsActive,IsArchived`,
      );
    }),
  );
  return results.flat();
}

/** Batched active GroupMembers, expanded with Person, for a set of GT25 group ids. */
async function fetchActiveMembersByGroupIds(groupIds: number[]): Promise<RawGroupMember[]> {
  if (groupIds.length === 0) return [];
  const results = await Promise.all(
    chunk(groupIds, CHUNK_SIZE).map((batch) => {
      const groupFilter = batch.map((id) => `GroupId eq ${id}`).join(" or ");
      const filter = `(${groupFilter}) and GroupMemberStatus eq 'Active'`;
      return rockFetch<RawGroupMember[]>(
        `GroupMembers?$filter=${encodeURIComponent(filter)}&$expand=Person&$select=GroupId,GroupRoleId,GroupMemberStatus,Person`,
      );
    }),
  );
  return results.flat();
}

function isLiveSection(g: RawGroup): boolean {
  return g.GroupTypeId === GROUP_TYPE_SECTION && g.IsActive && !g.IsArchived;
}
function isLiveGroup(g: RawGroup): boolean {
  return g.GroupTypeId === GROUP_TYPE_CONNECT_GROUP && g.IsActive && !g.IsArchived;
}

/**
 * Walks the subtree under a single root GT24 section, breadth-first, and
 * returns the assembled tree with every GT25 group's roster summary
 * attached. Not cached itself -- callers cache per root via
 * `loadSectionSubtree`.
 */
async function buildSubtreeForRoot(rootId: number): Promise<HierarchySectionNode | null> {
  const [rootGroup] = await fetchGroupsByIds([rootId]);
  if (!rootGroup) return null;

  const nodesById = new Map<number, HierarchySectionNode>();
  const root: HierarchySectionNode = {
    id: rootGroup.Id,
    name: rootGroup.Name,
    campusId: rootGroup.CampusId,
    children: [],
    groups: [],
  };
  nodesById.set(root.id, root);

  const allLeafGroupIds: number[] = [];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await fetchGroupsByParentIds(frontier);
    const nextFrontier: number[] = [];

    for (const child of children) {
      const parent = child.ParentGroupId !== null ? nodesById.get(child.ParentGroupId) : undefined;
      if (!parent) continue;

      if (isLiveSection(child)) {
        const node: HierarchySectionNode = {
          id: child.Id,
          name: child.Name,
          campusId: child.CampusId,
          children: [],
          groups: [],
        };
        nodesById.set(child.Id, node);
        parent.children.push(node);
        nextFrontier.push(child.Id);
      } else if (isLiveGroup(child)) {
        parent.groups.push({
          id: child.Id,
          name: child.Name,
          campusId: child.CampusId,
          memberCount: 0,
          leaders: [],
        });
        allLeafGroupIds.push(child.Id);
      }
    }

    frontier = nextFrontier;
  }

  const members = await fetchActiveMembersByGroupIds(allLeafGroupIds);
  const countByGroup = new Map<number, number>();
  const leadersByGroup = new Map<number, string[]>();
  for (const member of members) {
    if (!GT25_ACTIVE_ROLE_IDS.includes(member.GroupRoleId as (typeof GT25_ACTIVE_ROLE_IDS)[number])) {
      continue;
    }
    if (member.GroupMemberStatus !== GROUP_MEMBER_STATUS_ACTIVE) continue;
    countByGroup.set(member.GroupId, (countByGroup.get(member.GroupId) ?? 0) + 1);
    if (member.GroupRoleId === ROLE_GT25_LEADER || member.GroupRoleId === ROLE_GT25_ASSISTANT_LEADER) {
      const firstName = member.Person?.NickName || member.Person?.FirstName;
      if (firstName) {
        const list = leadersByGroup.get(member.GroupId) ?? [];
        list.push(firstName);
        leadersByGroup.set(member.GroupId, list);
      }
    }
  }

  function attachCounts(node: HierarchySectionNode) {
    for (const group of node.groups) {
      group.memberCount = countByGroup.get(group.id) ?? 0;
      group.leaders = leadersByGroup.get(group.id) ?? [];
    }
    for (const child of node.children) attachCounts(child);
  }
  attachCounts(root);

  return root;
}

/**
 * Loads the section subtree(s) rooted at each of `rootIds`, each cached
 * independently for 15 minutes under `rock:hierarchy:{rootId}`. Returns one
 * tree per root id that resolved to a live GT24 section (a stale/removed id
 * is silently dropped rather than throwing).
 */
export async function loadSectionSubtree(rootIds: number[]): Promise<HierarchySectionNode[]> {
  const trees = await Promise.all(
    rootIds.map((rootId) =>
      cached(`rock:hierarchy:${rootId}`, 900, () => buildSubtreeForRoot(rootId)),
    ),
  );
  return trees.filter((tree): tree is HierarchySectionNode => tree !== null);
}
