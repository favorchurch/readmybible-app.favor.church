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
import { createHash } from "node:crypto";

import { and, countDistinct, eq, gte, inArray } from "drizzle-orm";

import { appNow } from "@/lib/dev-clock";
import { groupRatio, stageFor, TOTAL_CHAPTERS, type Stage } from "@/lib/game";
import { completedAssignmentCheckinCount, completedAssignmentsCount } from "@/lib/plan";
import type { HierarchyGroupNode, HierarchySectionNode } from "@/lib/rock/hierarchy";

export const PLAN_START = "2026-10-01";
const ADMIN_TZ = "Asia/Manila";

/** Today's date (YYYY-MM-DD) in Favor's org-local timezone, for "read today" and chart range. */
export function adminToday(now: Date = appNow()): string {
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

export type DailyCheckinRow = { rockPersonId: number; chapter: number; readingDate: string };
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
 * repeats the prior cumulative total) and turns the running count of
 * *completed assignments* -- not raw check-in rows -- into a ratio against
 * `memberCount * TOTAL_ASSIGNMENTS`, the same ratio used for a group's stage
 * (see lib/game.ts groupRatio). A two-chapter assignment only increments the
 * total once its last chapter's row lands, same as completedAssignmentCheckinCount.
 */
export function buildDailyCumulativeSeries(
  rows: readonly DailyCheckinRow[],
  memberCount: number,
  fromDate: string,
  toDate: string,
): SeriesPoint[] {
  const rowsByDate = new Map<string, DailyCheckinRow[]>();
  for (const row of rows) {
    const list = rowsByDate.get(row.readingDate) ?? [];
    list.push(row);
    rowsByDate.set(row.readingDate, list);
  }

  const chaptersByMember = new Map<number, number[]>();
  let cumulativeCompleted = 0;
  return dateRange(fromDate, toDate).map((date) => {
    for (const row of rowsByDate.get(date) ?? []) {
      const chapters = chaptersByMember.get(row.rockPersonId) ?? [];
      const before = completedAssignmentsCount(chapters);
      chapters.push(row.chapter);
      chaptersByMember.set(row.rockPersonId, chapters);
      cumulativeCompleted += completedAssignmentsCount(chapters) - before;
    }
    return { date, ratio: groupRatio(cumulativeCompleted, memberCount) };
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
 * One chart series per top-level breakdown of the scope:
 * - When a root section has child sections (e.g. Org Admin -> Campuses, Cluster Head -> Regions),
 *   each direct child section is one series.
 * - When a root section has no child sections but holds leaf Connect Groups (e.g. Regional Leader),
 *   each individual Connect Group is one series so the regional leader can compare their groups.
 * - Falls back to the root itself if the root has no child sections and no groups.
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
    } else if (root.groups.length > 0) {
      for (const group of root.groups) {
        inputs.push({
          label: group.name,
          groupIds: [group.id],
          memberCount: group.memberCount,
        });
      }
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

/**
 * Completed assignments per group id, cached 5 minutes per exact group-id
 * set. Counts distinct completed assignments per member (completedAssignmentCheckinCount),
 * not raw check-in rows -- a two-chapter assignment is one row-pair, not two.
 */
export async function loadCheckinTotals(groupIds: number[]): Promise<Map<number, number>> {
  if (groupIds.length === 0) return new Map();
  const { db, checkins, cached } = await getDb();
  const key = `admin:totals:${idsHash(groupIds)}`;
  const rows = await cached(key, 300, async () =>
    db
      .select({ groupId: checkins.groupId, rockPersonId: checkins.rockPersonId, chapter: checkins.chapter })
      .from(checkins)
      .where(inArray(checkins.groupId, groupIds)),
  );
  const rowsByGroup = new Map<number, { rockPersonId: number; chapter: number }[]>();
  for (const r of rows) {
    if (r.groupId === null) continue;
    const list = rowsByGroup.get(r.groupId) ?? [];
    list.push({ rockPersonId: r.rockPersonId, chapter: r.chapter });
    rowsByGroup.set(r.groupId, list);
  }
  return new Map(groupIds.map((id) => [id, completedAssignmentCheckinCount(rowsByGroup.get(id) ?? [])]));
}

/** Distinct readers per group id for `today`, cached 5 minutes. */
export async function loadReadersToday(groupIds: number[], today: string): Promise<Map<number, number>> {
  if (groupIds.length === 0) return new Map();
  const { db, checkins, cached } = await getDb();
  const key = `admin:readerstoday:${today}:${idsHash(groupIds)}`;
  const rows = await cached(key, 300, async () =>
    db
      .select({ groupId: checkins.groupId, readers: countDistinct(checkins.rockPersonId) })
      .from(checkins)
      .where(and(inArray(checkins.groupId, groupIds), eq(checkins.readingDate, today)))
      .groupBy(checkins.groupId),
  );
  return new Map(rows.filter((r) => r.groupId !== null).map((r) => [r.groupId as number, Number(r.readers)]));
}

/** Raw check-in rows (member, chapter, date) across a set of group ids since `fromDate`, cached 5 minutes. */
export async function loadDailyCounts(groupIds: number[], fromDate: string): Promise<DailyCheckinRow[]> {
  if (groupIds.length === 0) return [];
  const { db, checkins, cached } = await getDb();
  const key = `admin:daily:${fromDate}:${idsHash(groupIds)}`;
  return cached(key, 300, async () =>
    db
      .select({ rockPersonId: checkins.rockPersonId, chapter: checkins.chapter, readingDate: checkins.readingDate })
      .from(checkins)
      .where(and(inArray(checkins.groupId, groupIds), gte(checkins.readingDate, fromDate))),
  );
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

/** Short stable digest of a group id set, so cache keys stay small under global scope. */
function idsHash(groupIds: Iterable<number>): string {
  const sorted = [...groupIds].sort((a, b) => a - b).join(",");
  return createHash("sha1").update(sorted).digest("hex").slice(0, 16);
}
