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
 * Region/Cluster/Department are resolved by position counting backward from
 * the campus/global roots in the ancestor chain `resolveUpwardScope` returns
 * (leaf Connect Group -> Region -> Cluster -> Department -> Campus root ->
 * Global root), the shape confirmed live against Rock and documented in
 * `lib/rock/hierarchy.ts`. The two roots are excluded by id first, so anchoring
 * from the leaf end (fixed position 0/1/2) would misfile a shorter chain --
 * e.g. a Connect Group sitting directly under Department, with no Region or
 * Cluster between it and the campus root, would otherwise score the
 * Department's leaders as Regional Leaders. Counting backward from the roots
 * instead means a shorter chain correctly leaves the missing shallower
 * roles (Region and/or Cluster) unresolved rather than throwing or misfiling.
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
import { CAMPUS_ROOT_SECTION_IDS, GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
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

const ROOT_SECTION_IDS: readonly number[] = [GLOBAL_ROOT_SECTION_ID, ...CAMPUS_ROOT_SECTION_IDS];

/** The nth section counting backward from the end of `sections` (1 = last), or null if `sections` isn't that deep. */
function nthFromEnd(sections: RockGroup[], n: number): RockGroup | null {
  return sections[sections.length - n] ?? null;
}

/**
 * The GT24 sections between a Connect Group and the roots, excluding the
 * roots themselves, identified by position counting backward from the root
 * end -- Department is always the deepest, then Cluster, then Region -- so a
 * chain missing shallower ancestors resolves what does exist correctly
 * instead of shifting deeper roles into shallower pools.
 */
async function resolveAncestorSections(groupId: number): Promise<AncestorSections> {
  const chain = await resolveUpwardScope(groupId);
  const sections = chain
    .slice(1)
    .filter((group) => group.GroupTypeId === GROUP_TYPE_SECTION && !ROOT_SECTION_IDS.includes(group.Id));
  return {
    region: nthFromEnd(sections, 3),
    cluster: nthFromEnd(sections, 2),
    department: nthFromEnd(sections, 1),
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
