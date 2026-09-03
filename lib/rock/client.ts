/**
 * Rock RMS REST v1 client for Read My Bible.
 *
 * All calls go through here with `Authorization-Token: ROCK_API_KEY` against
 * `ROCK_API_URL` (https://rock.favor.church/api). ROCK_API_KEY is empty until
 * Rico provisions a dedicated RestUser -- calls throw a clear error rather
 * than hitting Rock unauthenticated.
 */
import "server-only";

import { cached, redisGet, redisSetEx } from "@/lib/cache/redis";
import {
  GROUP_MEMBER_STATUS_ACTIVE,
  GROUP_TYPE_CONNECT_GROUP,
  GROUP_TYPE_SECTION,
  GT25_ACTIVE_ROLE_IDS,
} from "@/lib/rock/constants";
import {
  fixtureCampusGroups,
  fixtureCampusName,
  fixtureGroupBasic,
  fixtureMemberships,
  fixturePerson,
  fixtureRoster,
  fixtureSectionMemberships,
  fixtureSectionSubtree,
  isFixtureMode,
} from "@/lib/rock/fixtures";

const ROCK_API_URL = process.env.ROCK_API_URL ?? "https://rock.favor.church/api";

export class RockConfigError extends Error {}
export class RockApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function requireApiKey(): string {
  const key = process.env.ROCK_API_KEY;
  if (!key) {
    throw new RockConfigError(
      "ROCK_API_KEY is not set. Rock reads and writes are unavailable until it is provisioned.",
    );
  }
  return key;
}

/** Rock REST v1 doesn't cap page size by default, but paging defensively
 * avoids ever pulling an unbounded result set for a busy group/section. */
const PAGE_SIZE = 100;

/** Groups?$filter batch size for attachGroupData -- keeps the filter string well under Rock's URL length limits. */
const GROUP_BATCH_SIZE = 15;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Fetches every page of a $filter query via $top/$skip until a short page signals the end. */
async function rockFetchAllPages<T>(entity: string, filter: string, extraQuery = ""): Promise<T[]> {
  const results: T[] = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await rockFetch<T[]>(
      `${entity}?$filter=${encodeURIComponent(filter)}${extraQuery}&$top=${PAGE_SIZE}&$skip=${skip}`,
    );
    results.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return results;
}

async function rockFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = requireApiKey();
  const res = await fetch(`${ROCK_API_URL}/${path}`, {
    ...init,
    headers: {
      "Authorization-Token": key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new RockApiError(`Rock API ${path} failed: ${res.status} ${body}`.slice(0, 500), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type RockPerson = {
  Id: number;
  NickName: string;
  FirstName: string;
  LastName: string;
  PrimaryCampusId: number | null;
};

export type RockGroup = {
  Id: number;
  Name: string;
  GroupTypeId: number;
  CampusId: number | null;
  ParentGroupId: number | null;
  IsActive: boolean;
  IsArchived: boolean;
};

export type RockGroupMember = {
  Id: number;
  PersonId: number;
  GroupId: number;
  GroupRoleId: number;
  GroupMemberStatus: number;
  Group?: RockGroup;
  Person?: RockPerson;
};

/** People/{id} -- selected fields only. Cached 5 minutes. */
export async function getPerson(personId: number): Promise<RockPerson | null> {
  if (isFixtureMode()) return fixturePerson(personId);
  return cached(`rock:person:${personId}`, 300, async () => {
    try {
      return await rockFetch<RockPerson>(
        `People/${personId}?$select=Id,NickName,FirstName,LastName,PrimaryCampusId`,
      );
    } catch (error) {
      if (error instanceof RockApiError && error.status === 404) return null;
      throw error;
    }
  });
}

/**
 * Rock's GroupMember entity has no navigable "Group" property over REST v1
 * ($expand=Group and a `Group/GroupTypeId eq ...` $filter both 400 with
 * "Could not find a property named 'Group'", verified live against
 * rock.favor.church) -- only Person, GroupRole, etc. are expandable. So
 * group data is fetched separately and attached here: cache-hit groups are
 * read individually, and every cache-miss group is fetched in one batched
 * `Groups?$filter=Id eq a or Id eq b` call per chunk of 15 (instead of one
 * Groups/{id} call per distinct GroupId), sharing the same 15-minute cache
 * key (`rock:group:{id}`) that getGroupBasic reads and writes.
 */
async function attachGroupData(rows: RockGroupMember[]): Promise<RockGroupMember[]> {
  const uniqueGroupIds = Array.from(new Set(rows.map((r) => r.GroupId)));
  const groupById = await getGroupsBasicBatch(uniqueGroupIds);
  return rows.map((row) => ({ ...row, Group: groupById.get(row.GroupId) ?? undefined }));
}

async function getGroupsBasicBatch(groupIds: number[]): Promise<Map<number, RockGroup | undefined>> {
  const result = new Map<number, RockGroup | undefined>();
  const uncached: number[] = [];

  await Promise.all(
    groupIds.map(async (id) => {
      const hit = await redisGet(`rock:group:${id}`);
      if (hit === null) {
        uncached.push(id);
        return;
      }
      try {
        result.set(id, (JSON.parse(hit) as RockGroup | null) ?? undefined);
      } catch {
        uncached.push(id);
      }
    }),
  );

  for (const batch of chunk(uncached, GROUP_BATCH_SIZE)) {
    const filter = batch.map((id) => `Id eq ${id}`).join(" or ");
    const groups = await rockFetch<RockGroup[]>(
      `Groups?$filter=${encodeURIComponent(filter)}&$select=Id,Name,GroupTypeId,CampusId,ParentGroupId,IsActive,IsArchived`,
    );
    const foundById = new Map(groups.map((g) => [g.Id, g]));
    for (const id of batch) {
      const group = foundById.get(id) ?? null;
      result.set(id, group ?? undefined);
      void redisSetEx(`rock:group:${id}`, 900, JSON.stringify(group));
    }
  }

  return result;
}

/** Active Connect Group (GT25) memberships for a person, roles Member/Leader/Assistant Leader. Cached 5 minutes. */
export async function getMemberships(personId: number): Promise<RockGroupMember[]> {
  if (isFixtureMode()) return fixtureMemberships(personId);
  return cached(`rock:memberships:${personId}`, 300, async () => {
    const roleFilter = GT25_ACTIVE_ROLE_IDS.map((id) => `GroupRoleId eq ${id}`).join(" or ");
    const filter = `PersonId eq ${personId} and GroupMemberStatus eq 'Active' and (${roleFilter})`;
    const rows = await rockFetchAllPages<RockGroupMember>("GroupMembers", filter);
    const enriched = await attachGroupData(rows);
    return enriched.filter(
      (m) =>
        m.Group?.GroupTypeId === GROUP_TYPE_CONNECT_GROUP &&
        m.Group.IsActive &&
        !m.Group.IsArchived,
    );
  });
}

/**
 * Active Connect section (GT24) memberships for a person. GroupTypeId isn't
 * filterable on GroupMembers over REST v1 (see attachGroupData), so this
 * still filters client-side after fetching every active membership row.
 * Cached 5 minutes.
 */
export async function getSectionMemberships(personId: number): Promise<RockGroupMember[]> {
  if (isFixtureMode()) return fixtureSectionMemberships();
  return cached(`rock:sections:${personId}`, 300, async () => {
    const filter = `PersonId eq ${personId} and GroupMemberStatus eq 'Active'`;
    const rows = await rockFetchAllPages<RockGroupMember>("GroupMembers", filter);
    const enriched = await attachGroupData(rows);
    return enriched.filter((m) => m.Group?.GroupTypeId === GROUP_TYPE_SECTION);
  });
}

/** Active roster of a Connect Group, with person data expanded. Cached 5 minutes. */
export async function getRoster(groupId: number): Promise<RockGroupMember[]> {
  if (isFixtureMode()) return fixtureRoster(groupId);
  return cached(`rock:roster:${groupId}`, 300, async () => {
    const filter = `GroupId eq ${groupId} and GroupMemberStatus eq 'Active'`;
    return rockFetchAllPages<RockGroupMember>("GroupMembers", filter, "&$expand=Person");
  });
}

/** A single Connect Group's basic fields (name, campus). Cached 15 minutes. */
export async function getGroupBasic(groupId: number): Promise<RockGroup | null> {
  if (isFixtureMode()) return fixtureGroupBasic(groupId);
  return cached(`rock:group:${groupId}`, 900, async () => {
    try {
      return await rockFetch<RockGroup>(
        `Groups/${groupId}?$select=Id,Name,GroupTypeId,CampusId,ParentGroupId,IsActive,IsArchived`,
      );
    } catch (error) {
      if (error instanceof RockApiError && error.status === 404) return null;
      throw error;
    }
  });
}

/** Active, non-archived Connect Groups for a campus. Cached 15 minutes. */
export async function getCampusGroups(campusId: number): Promise<RockGroup[]> {
  if (isFixtureMode()) return fixtureCampusGroups(campusId);
  return cached(`rock:campusgroups:${campusId}`, 900, async () => {
    const filter = `GroupTypeId eq ${GROUP_TYPE_CONNECT_GROUP} and CampusId eq ${campusId} and IsActive eq true and IsArchived eq false`;
    return rockFetch<RockGroup[]>(`Groups?$filter=${encodeURIComponent(filter)}`);
  });
}

/** All descendant groups of a section, recursively, down to GT25 Connect Groups. Cached 15 minutes. */
export async function getSectionSubtree(sectionGroupId: number): Promise<RockGroup[]> {
  if (isFixtureMode()) return fixtureSectionSubtree(sectionGroupId);
  return cached(`rock:subtree:${sectionGroupId}`, 900, async () => {
    const result: RockGroup[] = [];
    async function walk(parentId: number) {
      const children = await rockFetch<RockGroup[]>(
        `Groups?$filter=${encodeURIComponent(`ParentGroupId eq ${parentId}`)}`,
      );
      for (const child of children) {
        result.push(child);
        if (child.GroupTypeId !== GROUP_TYPE_CONNECT_GROUP) {
          await walk(child.Id);
        }
      }
    }
    await walk(sectionGroupId);
    return result;
  });
}

type RockCampus = { Id: number; Name: string };

/** Campuses/{id} -- just the display name. Cached 15 minutes (campuses rarely change). */
export async function getCampusName(campusId: number): Promise<string | null> {
  if (isFixtureMode()) return fixtureCampusName(campusId);
  return cached(`rock:campus:${campusId}`, 900, async () => {
    try {
      const campus = await rockFetch<RockCampus>(`Campuses/${campusId}?$select=Id,Name`);
      return campus.Name;
    } catch (error) {
      if (error instanceof RockApiError && error.status === 404) return null;
      throw error;
    }
  });
}

/**
 * Join a Connect Group by writing a GroupMembers row (or reactivating an
 * inactive one), then bust the person's cached memberships. Logged by the
 * caller to join_events. Never called with a mock key -- throws via
 * requireApiKey if ROCK_API_KEY is unset.
 */
export async function joinGroup(groupId: number, personId: number): Promise<{ outcome: "joined" | "reactivated" | "already_member" }> {
  const filter = `PersonId eq ${personId} and GroupId eq ${groupId}`;
  const existing = await rockFetch<RockGroupMember[]>(`GroupMembers?$filter=${encodeURIComponent(filter)}`);
  // Several rows (e.g. an old inactive row plus a newer one) can come back --
  // prefer an active one over existing[0], which may not be it.
  const existingRow =
    existing.find((row) => row.GroupMemberStatus === GROUP_MEMBER_STATUS_ACTIVE) ?? existing[0];

  if (existingRow && existingRow.GroupMemberStatus === GROUP_MEMBER_STATUS_ACTIVE) {
    await bustPersonCache(personId, groupId);
    return { outcome: "already_member" };
  }

  if (existingRow) {
    await rockFetch(`GroupMembers/${existingRow.Id}`, {
      method: "PATCH",
      body: JSON.stringify({ GroupMemberStatus: GROUP_MEMBER_STATUS_ACTIVE }),
    });
    await bustPersonCache(personId, groupId);
    return { outcome: "reactivated" };
  }

  try {
    await rockFetch(`GroupMembers`, {
      method: "POST",
      body: JSON.stringify({
        GroupId: groupId,
        PersonId: personId,
        GroupRoleId: GT25_ACTIVE_ROLE_IDS[0],
        GroupMemberStatus: GROUP_MEMBER_STATUS_ACTIVE,
      }),
    });
  } catch (error) {
    // Rock rejects a duplicate GroupMembers row (person already has one for
    // this group) rather than returning it from the lookup above in some
    // cases -- re-fetch and reactivate instead of failing the join.
    if (error instanceof RockApiError && /duplicate|already/i.test(error.message)) {
      const retry = await rockFetch<RockGroupMember[]>(`GroupMembers?$filter=${encodeURIComponent(filter)}`);
      const [retryRow] = retry;
      if (retryRow) {
        await rockFetch(`GroupMembers/${retryRow.Id}`, {
          method: "PATCH",
          body: JSON.stringify({ GroupMemberStatus: GROUP_MEMBER_STATUS_ACTIVE }),
        });
        await bustPersonCache(personId, groupId);
        return { outcome: "reactivated" };
      }
    }
    throw error;
  }
  await bustPersonCache(personId, groupId);
  return { outcome: "joined" };
}

async function bustPersonCache(personId: number, groupId: number): Promise<void> {
  const { redisDel } = await import("@/lib/cache/redis");
  await redisDel(
    `rock:memberships:${personId}`,
    `rock:sections:${personId}`,
    `rock:person:${personId}`,
    `rock:roster:${groupId}`,
  );
}
