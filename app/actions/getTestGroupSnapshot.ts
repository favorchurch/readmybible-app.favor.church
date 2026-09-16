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
import { canAccessRealTestGroup, isTestModeAuthorized } from "@/lib/test-mode-auth";
import { syntheticTestModeView } from "@/components/test-mode/synthetic-fixtures";
import { SYNTHETIC_TEST_MODE_SCENARIOS } from "@/components/test-mode/logic";

const inputSchema = z.object({
  groupId: z.number().int().positive().optional(),
  scenario: z.enum(SYNTHETIC_TEST_MODE_SCENARIOS).optional(),
}).refine(
  ({ groupId, scenario }) => (groupId === undefined) !== (scenario === undefined),
  "Choose either a real group or a synthetic scenario.",
);

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
 * Returns a real snapshot only inside the caller's genuine admin scope. A
 * synthetic scenario is resolved locally and never reaches Rock or the DB.
 */
export async function getTestGroupSnapshot(input: GetTestGroupSnapshotInput): Promise<TestGroupSnapshotResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid group ID." };
  }
  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in." };
  }

  if (parsed.data.scenario !== undefined) {
    if (!isTestModeAuthorized(session)) {
      return { ok: false, error: "You don't have access to Test Mode." };
    }
    const view = syntheticTestModeView(parsed.data.scenario, 1);
    const groupStats: GroupStats = view.groupStats ?? {
      checkinCount: 0,
      memberCount: 0,
      ratio: 0,
      readersTodayIds: [],
    };
    return {
      ok: true,
      groupName: view.groupName ?? "Synthetic scenario",
      campusName: view.campusName,
      roster: view.roster,
      groupStats,
    };
  }

  const groupId = parsed.data.groupId;
  if (groupId === undefined || !await canAccessRealTestGroup(session, groupId)) {
    return { ok: false, error: "You don't have access to this Connect Group." };
  }

  const groupBasic = await getGroupBasic(groupId);
  if (!groupBasic) {
    return { ok: false, error: `Group ${groupId} not found.` };
  }

  if (groupBasic.GroupTypeId !== GROUP_TYPE_CONNECT_GROUP) {
    return { ok: false, error: `Group ${groupId} is not a Connect Group.` };
  }
  if (!groupBasic.IsActive || groupBasic.IsArchived) {
    return { ok: false, error: `Group ${groupId} is not available.` };
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
