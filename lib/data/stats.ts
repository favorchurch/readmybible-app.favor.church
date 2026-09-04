/**
 * DB-backed reading stats: personal check-in history, a group's check-in
 * count and today's readers, and the campus leaderboard. Aggregate reads
 * are cached in Redis with the same key names app/actions/checkIn.ts busts
 * on write (group:{id}:stats, campus:{id}:board).
 *
 * "Today" for group/campus aggregates uses that campus's own IANA timezone
 * (lib/campus-timezones.ts) as a single reference point per campus --
 * individual check-ins already store the reader's own local reading_date,
 * so this is an approximation for cross-member comparison within a campus,
 * not a per-row timezone conversion.
 */
import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { checkins } from "@/db/schema";
import { cached } from "@/lib/cache/redis";
import { timezoneForCampus } from "@/lib/campus-timezones";
import { appNow } from "@/lib/dev-clock";
import { getCampusGroups, getRoster } from "@/lib/rock/client";
import { groupRatio, rankGroups, type GroupStanding } from "@/lib/game";

import {
  deriveMemberReadingHistory,
  type MemberReadingHistory,
} from "@/lib/member-progress";

export function todayInTimezone(timezone: string, now: Date = appNow()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}

export type PersonReadingState = {
  chapters: number[];
  dates: string[]; // reading_date values, one per checkin row
};

/** All of a person's check-ins: which chapters, and on which local dates. Not cached -- cheap, always-fresh personal state. */
export async function getPersonReadingState(rockPersonId: number): Promise<PersonReadingState> {
  const rows = await db
    .select({ chapter: checkins.chapter, readingDate: checkins.readingDate })
    .from(checkins)
    .where(eq(checkins.rockPersonId, rockPersonId));
  return {
    chapters: rows.map((r) => r.chapter),
    dates: rows.map((r) => r.readingDate),
  };
}

/**
 * Compact per-member reading history for an array of personIds.
 * Privacy-safe: only queries rockPersonId, chapter, and readingDate.
 */
export async function getGroupMembersReadingHistory(
  personIds: number[],
): Promise<Map<number, MemberReadingHistory>> {
  if (personIds.length === 0) return new Map();
  const rows = await db
    .select({
      rockPersonId: checkins.rockPersonId,
      chapter: checkins.chapter,
      readingDate: checkins.readingDate,
    })
    .from(checkins)
    .where(inArray(checkins.rockPersonId, personIds));

  return deriveMemberReadingHistory(rows, personIds);
}

export type GroupStats = {
  checkinCount: number;
  memberCount: number;
  ratio: number;
  readersTodayIds: number[];
};

async function loadGroupStats(groupId: number, campusId: number | null): Promise<GroupStats> {
  const roster = await getRoster(groupId);
  const memberCount = roster.length;
  const today = todayInTimezone(timezoneForCampus(campusId));

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(checkins)
    .where(eq(checkins.groupId, groupId));

  const todayRows = await db
    .select({ rockPersonId: checkins.rockPersonId })
    .from(checkins)
    .where(and(eq(checkins.groupId, groupId), eq(checkins.readingDate, today)));

  const checkinCount = countRow?.count ?? 0;
  return {
    checkinCount,
    memberCount,
    ratio: groupRatio(checkinCount, memberCount),
    readersTodayIds: Array.from(new Set(todayRows.map((r) => r.rockPersonId))),
  };
}

/** A group's total check-ins, member count, ratio, and who has read today. Cached 5 minutes. */
export async function getGroupStats(groupId: number, campusId: number | null): Promise<GroupStats> {
  return cached(`group:${groupId}:stats`, 300, () => loadGroupStats(groupId, campusId));
}

/**
 * Same as getGroupStats but bypasses the Redis cache, for the instant a
 * check-in needs a true "before" count uncontaminated by up to 5 minutes of
 * cache staleness (D8: the completion flow's stage-up compares real
 * before/after state, never a cached page snapshot).
 */
export async function getGroupStatsFresh(groupId: number, campusId: number | null): Promise<GroupStats> {
  return loadGroupStats(groupId, campusId);
}

/** Ranked Connect Groups on a campus, by ratio then readers-today then name. Cached 5 minutes. */
export async function getCampusBoard(campusId: number): Promise<GroupStanding[]> {
  return cached(`campus:${campusId}:board`, 300, async () => {
    const groups = await getCampusGroups(campusId);
    if (groups.length === 0) return [];

    const groupIds = groups.map((g) => g.Id);
    const today = todayInTimezone(timezoneForCampus(campusId));

    // One grouped query for totals, one for today's distinct readers --
    // both across every group on the campus at once.
    const totals = await db
      .select({ groupId: checkins.groupId, count: sql<number>`count(*)::int` })
      .from(checkins)
      .where(inArray(checkins.groupId, groupIds))
      .groupBy(checkins.groupId);

    const todayRows = await db
      .select({ groupId: checkins.groupId, rockPersonId: checkins.rockPersonId })
      .from(checkins)
      .where(and(inArray(checkins.groupId, groupIds), eq(checkins.readingDate, today)));

    const totalsByGroup = new Map(totals.map((t) => [t.groupId, t.count]));
    const readersToday = new Map<number, Set<number>>();
    for (const row of todayRows) {
      if (row.groupId === null) continue;
      const set = readersToday.get(row.groupId) ?? new Set<number>();
      set.add(row.rockPersonId);
      readersToday.set(row.groupId, set);
    }

    // Member counts come from Rock's cached roster read, but only for
    // groups with at least one check-in -- a campus can have hundreds of
    // Connect Groups, and groupRatio(0, anyPositiveCount) is 0 regardless
    // of the exact member count, so a zero-checkin group doesn't need a
    // roster fetch to rank correctly (ratio 0, tie-broken by name).
    const groupsWithActivity = groups.filter((g) => (totalsByGroup.get(g.Id) ?? 0) > 0);
    const rosters = await Promise.all(groupsWithActivity.map((g) => getRoster(g.Id)));
    const memberCountByGroup = new Map(groupsWithActivity.map((g, index) => [g.Id, rosters[index].length]));

    const standings: GroupStanding[] = groups.map((group) => {
      const checkinCount = totalsByGroup.get(group.Id) ?? 0;
      const memberCount = memberCountByGroup.get(group.Id) ?? 1;
      return {
        groupId: group.Id,
        name: group.Name,
        ratio: groupRatio(checkinCount, memberCount),
        readersToday: readersToday.get(group.Id)?.size ?? 0,
      };
    });

    return rankGroups(standings);
  });
}
