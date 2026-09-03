/**
 * Admin dashboard stats: per-group ratio/stage and the daily cumulative
 * ratio series for the chart. See intent/SPEC.md "Admin dashboard" and
 * intent/GAME.md "Group scoring".
 *
 * Pure math (`buildDailyCumulativeSeries`, `statForGroup`, `flattenGroups`,
 * `collectTopLevelSeriesInputs`) has no "server-only" import and no DB
 * dependency, on purpose, so it's directly unit-testable (see
 * tests/admin-stats.test.ts) the same way tests/game.test.ts covers
 * lib/game.ts.
 */
import { and, count, countDistinct, eq, gte, inArray } from "drizzle-orm";

import { groupRatio, stageFor, TOTAL_CHAPTERS, type Stage } from "@/lib/game";
import type { HierarchyGroupNode, HierarchySectionNode } from "@/lib/rock/hierarchy";

export const PLAN_START = "2026-10-01";
const ADMIN_TZ = "Asia/Manila";

/** Today's date (YYYY-MM-DD) in Favor's org-local timezone, for "read today" and chart range. */
export function adminToday(now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: ADMIN_TZ }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export type GroupWithStats = HierarchyGroupNode & {
  checkins: number;
  readersToday: number;
  ratio: number;
  stage: Stage;
};

export type SectionWithStats = {
  id: number;
  name: string;
  campusId: number | null;
  children: SectionWithStats[];
  groups: GroupWithStats[];
};

export type DailyCount = { date: string; count: number };
export type SeriesPoint = { date: string; ratio: number };
export type TopLevelSeries = { label: string; points: SeriesPoint[] };

/** Ratio + stage for one group given its raw checkin/readers-today counts. */
export function statForGroup(
  group: HierarchyGroupNode,
  checkins: number,
  readersToday: number,
): GroupWithStats {
  const ratio = groupRatio(checkins, group.memberCount);
  return { ...group, checkins, readersToday, ratio, stage: stageFor(ratio) };
}

/**
 * Every date from `fromDate` to `toDate` inclusive (YYYY-MM-DD, UTC-safe
 * date-only arithmetic -- no timezone conversion, these are already plain
 * calendar dates).
 */
function dateRange(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Fills in every day from `fromDate` to `toDate` (a day with no checkins
 * repeats the prior cumulative count) and turns the running total into a
 * ratio against a fixed denominator of `memberCount * TOTAL_CHAPTERS`, the
 * same ratio used for a group's stage (see lib/game.ts groupRatio).
 */
export function buildDailyCumulativeSeries(
  dailyCounts: DailyCount[],
  memberCount: number,
  fromDate: string,
  toDate: string,
): SeriesPoint[] {
  const countByDate = new Map(dailyCounts.map((d) => [d.date, d.count]));
  let cumulative = 0;
  return dateRange(fromDate, toDate).map((date) => {
    cumulative += countByDate.get(date) ?? 0;
    return { date, ratio: groupRatio(cumulative, memberCount) };
  });
}

/** Depth-first list of every GT25 group under a section tree. */
export function flattenGroupNodes(sections: HierarchySectionNode[]): HierarchyGroupNode[] {
  const out: HierarchyGroupNode[] = [];
  function walk(node: HierarchySectionNode) {
    out.push(...node.groups);
    for (const child of node.children) walk(child);
  }
  for (const section of sections) walk(section);
  return out;
}

export type TopLevelSeriesInput = { label: string; groupIds: number[]; memberCount: number };

/**
 * One chart series per top-level child of the scope: the direct children of
 * each root section, or (when a root has no child sections -- it directly
 * holds GT25 groups) the root itself.
 */
export function collectTopLevelSeriesInputs(sections: HierarchySectionNode[]): TopLevelSeriesInput[] {
  function summarize(node: HierarchySectionNode): TopLevelSeriesInput {
    const groups = flattenGroupNodes([node]);
    return {
      label: node.name,
      groupIds: groups.map((g) => g.id),
      memberCount: groups.reduce((sum, g) => sum + g.memberCount, 0),
    };
  }
  const inputs: TopLevelSeriesInput[] = [];
  for (const root of sections) {
    if (root.children.length > 0) {
      for (const child of root.children) inputs.push(summarize(child));
    } else {
      inputs.push(summarize(root));
    }
  }
  return inputs;
}

/** Attaches ratio/stage to every group in the tree, given per-group raw counts. */
export function attachGroupStats(
  sections: HierarchySectionNode[],
  totals: Map<number, number>,
  readersToday: Map<number, number>,
): SectionWithStats[] {
  function walk(node: HierarchySectionNode): SectionWithStats {
    return {
      id: node.id,
      name: node.name,
      campusId: node.campusId,
      groups: node.groups.map((g) => statForGroup(g, totals.get(g.id) ?? 0, readersToday.get(g.id) ?? 0)),
      children: node.children.map(walk),
    };
  }
  return sections.map(walk);
}

// --- DB-backed loaders -----------------------------------------------------
// Only these touch Postgres/Redis; everything above is pure and unit-tested
// directly.

async function getDb() {
  const [{ db }, { checkins }, { cached }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("@/lib/cache/redis"),
  ]);
  return { db, checkins, cached };
}

/** Total checkins per group id, cached 5 minutes per exact group-id set. */
export async function loadCheckinTotals(groupIds: number[]): Promise<Map<number, number>> {
  if (groupIds.length === 0) return new Map();
  const { db, checkins, cached } = await getDb();
  const key = `admin:totals:${[...groupIds].sort((a, b) => a - b).join(",")}`;
  const rows = await cached(key, 300, async () =>
    db
      .select({ groupId: checkins.groupId, total: count() })
      .from(checkins)
      .where(inArray(checkins.groupId, groupIds))
      .groupBy(checkins.groupId),
  );
  return new Map(rows.filter((r) => r.groupId !== null).map((r) => [r.groupId as number, Number(r.total)]));
}

/** Distinct readers per group id for `today`, cached 5 minutes. */
export async function loadReadersToday(groupIds: number[], today: string): Promise<Map<number, number>> {
  if (groupIds.length === 0) return new Map();
  const { db, checkins, cached } = await getDb();
  const key = `admin:readerstoday:${today}:${[...groupIds].sort((a, b) => a - b).join(",")}`;
  const rows = await cached(key, 300, async () =>
    db
      .select({ groupId: checkins.groupId, readers: countDistinct(checkins.rockPersonId) })
      .from(checkins)
      .where(and(inArray(checkins.groupId, groupIds), eq(checkins.readingDate, today)))
      .groupBy(checkins.groupId),
  );
  return new Map(rows.filter((r) => r.groupId !== null).map((r) => [r.groupId as number, Number(r.readers)]));
}

/** Checkins grouped by reading_date across a set of group ids since `fromDate`, cached 5 minutes. */
export async function loadDailyCounts(groupIds: number[], fromDate: string): Promise<DailyCount[]> {
  if (groupIds.length === 0) return [];
  const { db, checkins, cached } = await getDb();
  const key = `admin:daily:${fromDate}:${[...groupIds].sort((a, b) => a - b).join(",")}`;
  const rows = await cached(key, 300, async () =>
    db
      .select({ readingDate: checkins.readingDate, total: count() })
      .from(checkins)
      .where(and(inArray(checkins.groupId, groupIds), gte(checkins.readingDate, fromDate)))
      .groupBy(checkins.readingDate),
  );
  return rows.map((r) => ({ date: r.readingDate, count: Number(r.total) }));
}

/** Full stats pass over a scope's hierarchy: stats-attached tree + per-top-level-child chart series. */
export async function loadAdminStats(
  sections: HierarchySectionNode[],
): Promise<{ sections: SectionWithStats[]; series: TopLevelSeries[] }> {
  const allGroups = flattenGroupNodes(sections);
  const allGroupIds = allGroups.map((g) => g.id);
  const today = adminToday();

  const [totals, readersToday] = await Promise.all([
    loadCheckinTotals(allGroupIds),
    loadReadersToday(allGroupIds, today),
  ]);
  const statsSections = attachGroupStats(sections, totals, readersToday);

  const topLevelInputs = collectTopLevelSeriesInputs(sections);
  const series = await Promise.all(
    topLevelInputs.map(async (input) => {
      const daily = await loadDailyCounts(input.groupIds, PLAN_START);
      return {
        label: input.label,
        points: buildDailyCumulativeSeries(daily, input.memberCount, PLAN_START, today),
      };
    }),
  );

  return { sections: statsSections, series };
}

export { TOTAL_CHAPTERS };
