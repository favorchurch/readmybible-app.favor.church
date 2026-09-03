/**
 * Rock RMS REST v1 client for Read My Bible.
 *
 * All calls go through here with `Authorization-Token: ROCK_API_KEY` against
 * `ROCK_API_URL` (https://rock.favor.church/api). ROCK_API_KEY is empty until
 * Rico provisions a dedicated RestUser -- calls throw a clear error rather
 * than hitting Rock unauthenticated.
 */
import "server-only";

import { cached } from "@/lib/cache/redis";
import {
  GROUP_MEMBER_STATUS_ACTIVE,
  GROUP_TYPE_CONNECT_GROUP,
  GROUP_TYPE_SECTION,
  GT25_ACTIVE_ROLE_IDS,
} from "@/lib/rock/constants";

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

/** Active Connect Group (GT25) memberships for a person, roles Member/Leader/Assistant Leader. Cached 5 minutes. */
export async function getMemberships(personId: number): Promise<RockGroupMember[]> {
  return cached(`rock:memberships:${personId}`, 300, async () => {
    const roleFilter = GT25_ACTIVE_ROLE_IDS.map((id) => `GroupRoleId eq ${id}`).join(" or ");
    const filter = `PersonId eq ${personId} and GroupMemberStatus eq 'Active' and (${roleFilter})`;
    const rows = await rockFetch<RockGroupMember[]>(
      `GroupMembers?$filter=${encodeURIComponent(filter)}&$expand=Group`,
    );
    return rows.filter(
      (m) =>
        m.Group?.GroupTypeId === GROUP_TYPE_CONNECT_GROUP &&
        m.Group.IsActive &&
        !m.Group.IsArchived,
    );
  });
}

/** Active Connect section (GT24) memberships for a person. Cached 5 minutes. */
export async function getSectionMemberships(personId: number): Promise<RockGroupMember[]> {
  return cached(`rock:sections:${personId}`, 300, async () => {
    const filter = `PersonId eq ${personId} and GroupMemberStatus eq 'Active'`;
    const rows = await rockFetch<RockGroupMember[]>(
      `GroupMembers?$filter=${encodeURIComponent(filter)}&$expand=Group`,
    );
    return rows.filter((m) => m.Group?.GroupTypeId === GROUP_TYPE_SECTION);
  });
}

/** Active roster of a Connect Group, with person data expanded. Cached 5 minutes. */
export async function getRoster(groupId: number): Promise<RockGroupMember[]> {
  return cached(`rock:roster:${groupId}`, 300, async () => {
    const filter = `GroupId eq ${groupId} and GroupMemberStatus eq 'Active'`;
    return rockFetch<RockGroupMember[]>(
      `GroupMembers?$filter=${encodeURIComponent(filter)}&$expand=Person`,
    );
  });
}

/** Active, non-archived Connect Groups for a campus. Cached 15 minutes. */
export async function getCampusGroups(campusId: number): Promise<RockGroup[]> {
  return cached(`rock:campusgroups:${campusId}`, 900, async () => {
    const filter = `GroupTypeId eq ${GROUP_TYPE_CONNECT_GROUP} and CampusId eq ${campusId} and IsActive eq true and IsArchived eq false`;
    return rockFetch<RockGroup[]>(`Groups?$filter=${encodeURIComponent(filter)}`);
  });
}

/** All descendant groups of a section, recursively, down to GT25 Connect Groups. Cached 15 minutes. */
export async function getSectionSubtree(sectionGroupId: number): Promise<RockGroup[]> {
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

/**
 * Join a Connect Group by writing a GroupMembers row (or reactivating an
 * inactive one), then bust the person's cached memberships. Logged by the
 * caller to join_events. Never called with a mock key -- throws via
 * requireApiKey if ROCK_API_KEY is unset.
 */
export async function joinGroup(groupId: number, personId: number): Promise<{ outcome: "joined" | "reactivated" | "already_member" }> {
  const filter = `PersonId eq ${personId} and GroupId eq ${groupId}`;
  const existing = await rockFetch<RockGroupMember[]>(`GroupMembers?$filter=${encodeURIComponent(filter)}`);
  const [existingRow] = existing;

  if (existingRow && existingRow.GroupMemberStatus === GROUP_MEMBER_STATUS_ACTIVE) {
    await bustPersonCache(personId);
    return { outcome: "already_member" };
  }

  if (existingRow) {
    await rockFetch(`GroupMembers/${existingRow.Id}`, {
      method: "PATCH",
      body: JSON.stringify({ GroupMemberStatus: GROUP_MEMBER_STATUS_ACTIVE }),
    });
    await bustPersonCache(personId);
    return { outcome: "reactivated" };
  }

  await rockFetch(`GroupMembers`, {
    method: "POST",
    body: JSON.stringify({
      GroupId: groupId,
      PersonId: personId,
      GroupRoleId: GT25_ACTIVE_ROLE_IDS[0],
      GroupMemberStatus: GROUP_MEMBER_STATUS_ACTIVE,
    }),
  });
  await bustPersonCache(personId);
  return { outcome: "joined" };
}

async function bustPersonCache(personId: number): Promise<void> {
  const { redisDel } = await import("@/lib/cache/redis");
  await redisDel(`rock:memberships:${personId}`, `rock:sections:${personId}`, `rock:person:${personId}`);
}
