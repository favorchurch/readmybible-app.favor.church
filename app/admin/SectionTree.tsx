/**
 * Collapsible hierarchy table: section title -> child sections -> Connect
 * Groups, columns Group / Campus / Members / Read today / Progress / Home.
 * Server component -- <details>/<summary> gives the collapse behavior for
 * free, no client JS needed here (see intent/COPY.md "Admin" columns).
 */
import type { SectionWithStats } from "@/lib/admin/stats";
import { CAMPUS_NAMES } from "@/lib/admin/campuses";

function campusLabel(campusId: number | null): string {
  if (campusId === null) return "—";
  return CAMPUS_NAMES[campusId] ?? `Campus ${campusId}`;
}

function GroupRows({ groups }: { groups: SectionWithStats["groups"] }) {
  if (groups.length === 0) return null;
  return (
    <>
      {groups.map((group) => (
        <tr key={group.id} className="admin-row-group">
          <td>{group.name}</td>
          <td>{campusLabel(group.campusId)}</td>
          <td>{group.memberCount}</td>
          <td>{group.readersToday}</td>
          <td>{Math.round(group.ratio * 100)}%</td>
          <td>
            <span className="admin-stage-pill">{group.stage}</span>
          </td>
        </tr>
      ))}
    </>
  );
}

export function SectionTree({ section, depth = 0 }: { section: SectionWithStats; depth?: number }) {
  const hasChildren = section.children.length > 0;
  const hasGroups = section.groups.length > 0;

  return (
    <details open={depth < 1} className="admin-section-details">
      <summary className="admin-section-summary">
        {section.name}
        <small>
          {section.groups.length} group{section.groups.length === 1 ? "" : "s"}
          {hasChildren ? `, ${section.children.length} sub-section${section.children.length === 1 ? "" : "s"}` : ""}
        </small>
      </summary>

      {hasGroups && (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Campus</th>
                <th>Members</th>
                <th>Read today</th>
                <th>Progress</th>
                <th>Home</th>
              </tr>
            </thead>
            <tbody>
              <GroupRows groups={section.groups} />
            </tbody>
          </table>
        </div>
      )}

      {hasChildren && (
        <ul className="admin-nested">
          {section.children.map((child) => (
            <li key={child.id}>
              <SectionTree section={child} depth={depth + 1} />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
