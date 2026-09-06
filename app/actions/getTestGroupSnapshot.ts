"use server";

import { inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { resolveAvatar } from "@/components/avatar";
import type { RosterMemberView } from "@/components/app-shell";
import { getCampusName, getGroupBasic, getRoster } from "@/lib/rock/client";
import { GROUP_TYPE_CONNECT_GROUP, ROLE_GT25_LEADER, ROLE_GT25_ASSISTANT_LEADER } from "@/lib/rock/constants";
import { getGroupMembersReadingHistory, getGroupStats, type GroupStats } from "@/lib/data/stats";
import { getSessionContext } from "@/lib/session";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
});

export type GetTestGroupSnapshotInput = z.infer<typeof inputSchema>;

export type TestGroupSnapshotResult =
  | {
      ok: true;
      groupName: string;
      campusName: string | null;
      roster: RosterMemberView[];
      groupStats: GroupStats;
    }
  | { ok: false; error: string };

/**
 * Returns snapshot data (roster, stats, campus name) for any Connect Group,
 * allowing test-mode simulation of that group.
 * Refuses unless NODE_ENV !== "production" AND caller has admin scope.
 */
export async function getTestGroupSnapshot(input: GetTestGroupSnapshotInput): Promise<TestGroupSnapshotResult> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Test mode is not available in production." };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid group ID." };
  }
  const { groupId } = parsed.data;

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in." };
  }
  if (!session.isAdminScope) {
    return { ok: false, error: "Admin scope required to view test groups." };
  }

  const groupBasic = await getGroupBasic(groupId);
  if (!groupBasic) {
    return { ok: false, error: `Group ${groupId} not found.` };
  }

  // A server action is a directly callable HTTP endpoint, so it enforces scope
  // itself rather than trusting the picker that displays it.
  //
  // The campus fence is deliberately GONE: test mode simulates any Connect
  // Group org-wide. What still bounds this is the pair of checks above -- it
  // refuses entirely in production, and requires admin scope otherwise -- plus
  // the group type check below. A non-admin, or anyone at all in production,
  // reaches nothing.
  if (groupBasic.GroupTypeId !== GROUP_TYPE_CONNECT_GROUP) {
    return { ok: false, error: `Group ${groupId} is not a Connect Group.` };
  }

  const rockRoster = await getRoster(groupId);
  if (rockRoster.length === 0) {
    return { ok: false, error: `Group ${groupId} has an empty roster.` };
  }

  const personIds = rockRoster.map((m) => m.PersonId);

  const [campusName, memberReadingMap, groupStats, rosterProfiles] = await Promise.all([
    groupBasic.CampusId ? getCampusName(groupBasic.CampusId) : Promise.resolve(null),
    getGroupMembersReadingHistory(groupId, personIds),
    getGroupStats(groupId, groupBasic.CampusId ?? null),
    personIds.length > 0
      ? db
          .select({ personId: profiles.rockPersonId, avatar: profiles.avatar })
          .from(profiles)
          .where(inArray(profiles.rockPersonId, personIds))
      : Promise.resolve([]),
  ]);

  const savedAvatars = new Map(rosterProfiles.map((row) => [row.personId, row.avatar]));
  const roster: RosterMemberView[] = rockRoster.map((m) => {
    const history = memberReadingMap.get(m.PersonId);
    return {
      personId: m.PersonId,
      avatar: resolveAvatar(m.PersonId, m.Person?.Gender, savedAvatars.get(m.PersonId)),
      isSelf: m.PersonId === session.rockPersonId,
      name: m.Person?.NickName || m.Person?.FirstName || `Reader ${m.PersonId}`,
      isLeader:
        m.GroupRoleId !== undefined &&
        m.GroupRoleId !== null &&
        [ROLE_GT25_LEADER, ROLE_GT25_ASSISTANT_LEADER].includes(m.GroupRoleId),
      readToday: groupStats.readersTodayIds.includes(m.PersonId),
      chapters: history?.chapters ?? [],
      readingDates: history?.dates ?? [],
    };
  });

  return {
    ok: true,
    groupName: groupBasic.Name,
    campusName,
    roster,
    groupStats,
  };
}
