import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { AUTH0_CLAIM_NAMESPACE, auth0 } from "@/lib/auth0";
import {
  getMemberships,
  getPerson,
  getSectionMemberships,
  type RockGroupMember,
} from "@/lib/rock/client";
import { ROLE_GT25_LEADER, ROLE_GT25_ASSISTANT_LEADER } from "@/lib/rock/constants";

const AUTH0_NAMESPACE = AUTH0_CLAIM_NAMESPACE;

export type GroupMembership = {
  groupId: number;
  groupName: string;
  campusId: number | null;
  roleId: number;
  isLeader: boolean;
};

export type SessionContext =
  | { status: "logged-out" }
  | { status: "not-found-in-rock" }
  | {
      status: "ok";
      rockPersonId: number;
      displayName: string;
      memberships: GroupMembership[];
      sectionMemberships: RockGroupMember[];
      activeGroup: GroupMembership | null;
      /** True when the reader has 2+ Connect Group memberships and hasn't picked one yet. */
      needsGroupChoice: boolean;
      campusId: number | null;
      isLeader: boolean;
      isAdminScope: boolean;
    };

function getAdminPersonIds(): number[] {
  return (process.env.ADMIN_PERSON_IDS ?? "")
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

/**
 * Resolves the current request's Rock identity and Connect Group context.
 *
 * `DEV_MOCK_PERSON_ID` bypasses Auth0 entirely and impersonates that Rock
 * production PersonId, but only when NODE_ENV !== "production" -- it must
 * never be honored on Vercel, where preview/prod both run production builds.
 */
export async function getSessionContext(): Promise<SessionContext> {
  let rockPersonId: number | null = null;

  if (process.env.NODE_ENV !== "production" && process.env.DEV_MOCK_PERSON_ID) {
    rockPersonId = Number.parseInt(process.env.DEV_MOCK_PERSON_ID, 10);
  } else {
    const session = await auth0.getSession();
    if (!session) return { status: "logged-out" };

    const claims = session.user as Record<string, unknown>;
    const foundClaim = claims[`${AUTH0_NAMESPACE}rock_person_found`];
    const found = foundClaim === true || foundClaim === "true";
    const idClaim = claims[`${AUTH0_NAMESPACE}rock_person_id`];

    if (!found || idClaim === undefined || idClaim === null) {
      return { status: "not-found-in-rock" };
    }
    rockPersonId = typeof idClaim === "number" ? idClaim : Number.parseInt(String(idClaim), 10);
  }

  if (!rockPersonId || Number.isNaN(rockPersonId)) {
    return { status: "not-found-in-rock" };
  }

  const [person, rawMemberships, sectionMemberships, profileRow] = await Promise.all([
    getPerson(rockPersonId),
    getMemberships(rockPersonId),
    getSectionMemberships(rockPersonId),
    db.select().from(profiles).where(eq(profiles.rockPersonId, rockPersonId)).limit(1),
  ]);

  if (!person) {
    return { status: "not-found-in-rock" };
  }

  const memberships: GroupMembership[] = rawMemberships.map((m) => ({
    groupId: m.GroupId,
    groupName: m.Group?.Name ?? `Group ${m.GroupId}`,
    campusId: m.Group?.CampusId ?? null,
    roleId: m.GroupRoleId,
    isLeader: m.GroupRoleId === ROLE_GT25_LEADER || m.GroupRoleId === ROLE_GT25_ASSISTANT_LEADER,
  }));

  // A person who has explicitly chosen a group (chooseGroup action) keeps
  // that choice even if it isn't their leader group. Otherwise default to a
  // leader membership, then the first membership, per intent/FLOWS.md.
  const chosenGroupId = profileRow[0]?.activeGroupId ?? null;
  const chosenGroup = chosenGroupId ? memberships.find((m) => m.groupId === chosenGroupId) : undefined;
  const activeGroup = chosenGroup ?? memberships.find((m) => m.isLeader) ?? memberships[0] ?? null;
  const needsGroupChoice = memberships.length > 1 && !chosenGroup;

  const campusId = activeGroup?.campusId ?? person.PrimaryCampusId ?? null;
  const adminIds = getAdminPersonIds();
  const isAdminScope = adminIds.includes(rockPersonId) || sectionMemberships.length > 0;

  return {
    status: "ok",
    rockPersonId,
    displayName: profileRow[0]?.displayName || person.NickName || person.FirstName,
    memberships,
    sectionMemberships,
    activeGroup,
    needsGroupChoice,
    campusId,
    isLeader: memberships.some((m) => m.isLeader),
    isAdminScope,
  };
}
