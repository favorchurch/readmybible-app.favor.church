/**
 * Dev-only Rock fixture data, frozen from a real read of Rock production on
 * 2026-09-03 (rock_ministry groupMembers + rock_entity groupmembers/people
 * for group 24077). Used ONLY when ROCK_API_KEY is empty AND
 * NODE_ENV !== "production" -- see lib/rock/client.ts. Never used to write;
 * writes against this fixture are simulated in-memory for the dev process
 * lifetime only.
 */
import "server-only";

import type { RockGroup, RockGroupMember, RockPerson } from "@/lib/rock/client";

export const FIXTURE_PERSON_ID = 152;

const FIXTURE_GROUP: RockGroup = {
  Id: 24077,
  Name: "Adults // Erwin & Jeric Presnedi",
  GroupTypeId: 25,
  CampusId: 1,
  ParentGroupId: 23870,
  IsActive: true,
  IsArchived: false,
};

// PersonId -> NickName, first names only. Frozen from Rock prod.
const FIXTURE_PEOPLE: Record<number, string> = {
  18038: "Erwin",
  194: "Jeric Anne",
  1869: "Jeffrey",
  3927: "Gonzales",
  548: "Jayson",
  3011: "Elaine",
  3150: "Michael",
  3554: "Mariah Joyce Mhikaella",
  3949: "Arneth",
  10: "Cielo",
  152: "Rico",
  112: "Alliyah",
};

// PersonId -> GroupRoleId (23 Member, 24 Leader). Frozen from Rock prod.
const FIXTURE_ROLES: Record<number, number> = {
  18038: 24,
  194: 24,
  1869: 23,
  3927: 23,
  548: 23,
  3011: 23,
  3150: 23,
  3554: 23,
  3949: 23,
  10: 23,
  152: 23,
  112: 23,
};

export function fixturePerson(personId: number): RockPerson | null {
  const nickName = FIXTURE_PEOPLE[personId];
  if (!nickName) return null;
  return {
    Id: personId,
    NickName: nickName,
    FirstName: nickName,
    LastName: "",
    PrimaryCampusId: FIXTURE_GROUP.CampusId,
  };
}

export function fixtureMemberships(personId: number): RockGroupMember[] {
  const roleId = FIXTURE_ROLES[personId];
  if (roleId === undefined) return [];
  return [
    {
      Id: 900000 + personId,
      PersonId: personId,
      GroupId: FIXTURE_GROUP.Id,
      GroupRoleId: roleId,
      GroupMemberStatus: 1,
      Group: FIXTURE_GROUP,
    },
  ];
}

/** No GT24 section memberships in the fixture -- admin scope is exercised via ADMIN_PERSON_IDS. */
export function fixtureSectionMemberships(): RockGroupMember[] {
  return [];
}

export function fixtureRoster(groupId: number): RockGroupMember[] {
  if (groupId !== FIXTURE_GROUP.Id) return [];
  return Object.entries(FIXTURE_PEOPLE).map(([id, nickName]) => {
    const personId = Number(id);
    return {
      Id: 900000 + personId,
      PersonId: personId,
      GroupId: groupId,
      GroupRoleId: FIXTURE_ROLES[personId] ?? 23,
      GroupMemberStatus: 1,
      Person: {
        Id: personId,
        NickName: nickName,
        FirstName: nickName,
        LastName: "",
        PrimaryCampusId: FIXTURE_GROUP.CampusId,
      },
    };
  });
}

export function fixtureCampusGroups(campusId: number): RockGroup[] {
  if (campusId !== FIXTURE_GROUP.CampusId) return [];
  return [FIXTURE_GROUP];
}

export function fixtureSectionSubtree(sectionGroupId: number): RockGroup[] {
  if (sectionGroupId !== FIXTURE_GROUP.ParentGroupId) return [];
  return [FIXTURE_GROUP];
}

export function fixtureCampusName(campusId: number): string | null {
  return campusId === FIXTURE_GROUP.CampusId ? "Manila" : null;
}

export function fixtureGroupBasic(groupId: number): RockGroup | null {
  return groupId === FIXTURE_GROUP.Id ? FIXTURE_GROUP : null;
}

export function isFixtureMode(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.ROCK_API_KEY;
}
