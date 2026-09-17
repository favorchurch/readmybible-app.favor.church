/**
 * Resolves current Rock membership, current section leadership, and stored
 * reading facts into the `PersonContribution[]` inputs `scoreConnect` (in
 * `lib/scoring.ts`, the pinned contract) needs, then scores. See issue #150.
 *
 * Nothing here is persisted. Every call walks Rock's current roster and
 * section-leader roles plus the checkins table, so a membership or role
 * change simply produces a different answer on the next call -- there is no
 * scoring ledger and no scheduled recompute (issue #118).
 *
 * Region/Cluster/Department are resolved by fixed position in the ancestor
 * chain `resolveUpwardScope` returns (leaf Connect Group -> Region -> Cluster
 * -> Department -> Campus root -> Global root), the shape confirmed live
 * against Rock and documented in `lib/rock/hierarchy.ts`. A shorter chain
 * (fixture data, or a Connect Group missing an ancestor) simply leaves the
 * deeper roles unresolved rather than throwing.
 */
import "server-only";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { checkins } from "@/db/schema";
import { completedAssignmentsCount } from "@/lib/plan";
import {
  GROUP_TYPE_CONNECT_GROUP,
  GROUP_TYPE_SECTION,
  ROLE_GT25_ASSISTANT_LEADER,
  ROLE_GT25_LEADER,
} from "@/lib/rock/constants";
import {
  getGroupBasic,
  getRoster,
  getSectionLeaders,
  resolveUpwardScope,
  type RockGroup,
  type RockGroupMember,
} from "@/lib/rock/client";
import { scoreConnect, stageForPoints, type ConnectScore, type PersonContribution, type Stage } from "@/lib/scoring";

type AncestorSections = {
  region: RockGroup | null;
  cluster: RockGroup | null;
  department: RockGroup | null;
};

/** The three GT24 sections directly above a Connect Group, by fixed position. */
async function resolveAncestorSections(groupId: number): Promise<AncestorSections> {
  const chain = await resolveUpwardScope(groupId);
  const sections = chain.slice(1).filter((group) => group.GroupTypeId === GROUP_TYPE_SECTION);
  return {
    region: sections[0] ?? null,
    cluster: sections[1] ?? null,
    department: sections[2] ?? null,
  };
}

/** Completed-assignment counts per person, from every stored check-in regardless of which group it was recorded under -- a reading contributes to every genuine current Connect membership, not just the group active when it was checked in. */
async function completedAssignmentsByPerson(personIds: number[]): Promise<Map<number, number>> {
  if (personIds.length === 0) return new Map();
  const rows = await db
    .select({ rockPersonId: checkins.rockPersonId, chapter: checkins.chapter })
    .from(checkins)
    .where(inArray(checkins.rockPersonId, personIds));

  const chaptersByPerson = new Map<number, number[]>();
  for (const id of personIds) chaptersByPerson.set(id, []);
  for (const row of rows) {
    chaptersByPerson.get(row.rockPersonId)?.push(row.chapter);
  }

  return new Map(
    [...chaptersByPerson].map(([id, chapters]) => [id, completedAssignmentsCount(chapters)]),
  );
}

function isConnectLeaderRole(roleId: number): boolean {
  return roleId === ROLE_GT25_LEADER || roleId === ROLE_GT25_ASSISTANT_LEADER;
}

function displayNameOf(person: RockGroupMember): string {
  return person.Person?.NickName || person.Person?.FirstName || `Reader ${person.PersonId}`;
}

export type ResolvedConnectScore = {
  score: ConnectScore;
  /** Display names for regional/cluster leaders, keyed by rockPersonId -- for
   *  the upstream-only Leaders section, whose people never appear in `roster`. */
  leaderNames: Map<number, string>;
};

/**
 * Resolves and scores one Connect Group from current Rock state. Returns
 * `null` when the group doesn't exist, isn't a Connect Group, or is
 * inactive/archived -- callers treat that the same as "nothing to score."
 */
export async function resolveConnectScore(groupId: number): Promise<ResolvedConnectScore | null> {
  const groupBasic = await getGroupBasic(groupId);
  if (!groupBasic || groupBasic.GroupTypeId !== GROUP_TYPE_CONNECT_GROUP) return null;
  if (!groupBasic.IsActive || groupBasic.IsArchived) return null;

  const [roster, ancestors] = await Promise.all([getRoster(groupId), resolveAncestorSections(groupId)]);

  const [regionalLeaderRows, clusterHeadRows, departmentHeadRows] = await Promise.all([
    ancestors.region ? getSectionLeaders(ancestors.region.Id) : Promise.resolve([]),
    ancestors.cluster ? getSectionLeaders(ancestors.cluster.Id) : Promise.resolve([]),
    ancestors.department ? getSectionLeaders(ancestors.department.Id) : Promise.resolve([]),
  ]);

  const regionalLeaderIds = new Set(regionalLeaderRows.map((row) => row.PersonId));
  const clusterHeadIds = new Set(clusterHeadRows.map((row) => row.PersonId));
  const departmentHeadIds = new Set(departmentHeadRows.map((row) => row.PersonId));

  const allPersonIds = Array.from(
    new Set([...roster.map((row) => row.PersonId), ...regionalLeaderIds, ...clusterHeadIds, ...departmentHeadIds]),
  );
  const progressByPerson = await completedAssignmentsByPerson(allPersonIds);

  function contribution(personId: number, extra: Partial<PersonContribution>): PersonContribution {
    return {
      rockPersonId: personId,
      completedAssignments: progressByPerson.get(personId) ?? 0,
      isConnectMember: false,
      isConnectLeader: false,
      isRegionalLeader: regionalLeaderIds.has(personId),
      isClusterHead: clusterHeadIds.has(personId),
      isDepartmentHead: departmentHeadIds.has(personId),
      ...extra,
    };
  }

  const members: PersonContribution[] = roster.map((member) =>
    contribution(member.PersonId, {
      isConnectMember: true,
      isConnectLeader: isConnectLeaderRole(member.GroupRoleId),
    }),
  );
  const regionalLeaders: PersonContribution[] = regionalLeaderRows.map((leader) =>
    contribution(leader.PersonId, { isRegionalLeader: true }),
  );
  const clusterHeads: PersonContribution[] = clusterHeadRows.map((head) =>
    contribution(head.PersonId, { isClusterHead: true }),
  );

  const score = scoreConnect({ groupId, members, regionalLeaders, clusterHeads });

  const leaderNames = new Map<number, string>();
  for (const row of [...regionalLeaderRows, ...clusterHeadRows]) {
    leaderNames.set(row.PersonId, displayNameOf(row));
  }

  return { score, leaderNames };
}

/**
 * Fast path for base points only: current Connect roster and stored reading
 * facts, no ancestor walk and no section-leader fetch. Lets a caller paint
 * the base contribution immediately while the (slower, upstream) bonus pools
 * are still resolving -- see `combineStageUpward` for how the later, fuller
 * total is applied without ever visibly dropping the stage.
 */
export async function resolveConnectBasePoints(
  groupId: number,
): Promise<{ basePoints: number; stage: Stage } | null> {
  const groupBasic = await getGroupBasic(groupId);
  if (!groupBasic || groupBasic.GroupTypeId !== GROUP_TYPE_CONNECT_GROUP) return null;
  if (!groupBasic.IsActive || groupBasic.IsArchived) return null;

  const roster = await getRoster(groupId);
  const progressByPerson = await completedAssignmentsByPerson(roster.map((row) => row.PersonId));

  const members: PersonContribution[] = roster.map((member) => ({
    rockPersonId: member.PersonId,
    completedAssignments: progressByPerson.get(member.PersonId) ?? 0,
    isConnectMember: true,
    isConnectLeader: isConnectLeaderRole(member.GroupRoleId),
    isRegionalLeader: false,
    isClusterHead: false,
    isDepartmentHead: false,
  }));

  const score = scoreConnect({ groupId, members, regionalLeaders: [], clusterHeads: [] });
  return { basePoints: score.basePoints, stage: score.stage };
}

/**
 * The stage to display once a later, more complete total arrives. Never
 * drops below what's already on screen -- issue #146: "Base points paint
 * optimistically; the two bonus pools stream in and may only move a stage
 * UPWARD, never downward."
 */
export function combineStageUpward(displayed: Stage, incoming: Stage): Stage {
  return stageForPoints(Math.max(stagePoints(displayed), stagePoints(incoming)));
}

const STAGE_FLOOR: Record<Stage, number> = {
  Tent: 0,
  Trailer: 100,
  Cabin: 200,
  Condo: 300,
  House: 400,
  Mansion: 500,
};

function stagePoints(stage: Stage): number {
  return STAGE_FLOOR[stage];
}
