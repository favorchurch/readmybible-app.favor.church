/**
 * Flattens a stats-attached section tree into rows for the CSV export and
 * anywhere else a flat list (rather than the nested table) is useful. Pure,
 * no imports beyond types -- unit-tested alongside the rest of lib/admin.
 */
import type { SectionWithStats } from "@/lib/admin/stats";
import { CAMPUS_NAMES } from "@/lib/admin/campuses";

export type GroupRow = {
  groupId: number;
  groupName: string;
  campus: string;
  sectionPath: string;
  members: number;
  readersToday: number;
  checkins: number;
  ratioPct: number;
  stage: string;
  leaders: string;
};

export function flattenStatsRows(sections: SectionWithStats[]): GroupRow[] {
  const rows: GroupRow[] = [];

  function walk(node: SectionWithStats, path: string[]) {
    const nextPath = [...path, node.name];
    for (const group of node.groups) {
      rows.push({
        groupId: group.id,
        groupName: group.name,
        campus: CAMPUS_NAMES[group.campusId ?? -1] ?? (group.campusId != null ? `Campus ${group.campusId}` : ""),
        sectionPath: nextPath.join(" / "),
        members: group.memberCount,
        readersToday: group.readersToday,
        checkins: group.checkins,
        ratioPct: Math.round(group.ratio * 100),
        stage: group.stage,
        leaders: group.leaders.join(", "),
      });
    }
    for (const child of node.children) walk(child, nextPath);
  }

  for (const section of sections) walk(section, []);
  return rows;
}

/** Quotes a CSV field only when it needs it (contains comma, quote, or newline). */
export function csvField(value: string | number): string {
  let str = String(value);
  // Neutralize spreadsheet formula injection from Rock-sourced names.
  if (typeof value === "string" && /^[=+@\t\r-]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const CSV_HEADERS = [
  "Group",
  "Campus",
  "Section",
  "Members",
  "Read today",
  "Total checkins",
  "Progress %",
  "Home",
  "Leaders",
] as const;

export function rowsToCsv(rows: GroupRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.groupName,
        row.campus,
        row.sectionPath,
        row.members,
        row.readersToday,
        row.checkins,
        row.ratioPct,
        row.stage,
        row.leaders,
      ]
        .map(csvField)
        .join(","),
    );
  }
  return lines.join("\r\n") + "\r\n";
}
