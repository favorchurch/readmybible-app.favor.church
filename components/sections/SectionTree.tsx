/**
 * Collapsible hierarchy table: section title -> child sections -> Connect
 * Groups, columns Group / Campus / Members / Read today / Progress / Home,
 * with a stage-count chart and a podium above each section's table.
 * <details>/<summary> still gives the collapse behavior for free -- this
 * component holds no state of its own. `forceOpen` exists so the quick
 * filter in `hierarchy-view.tsx` can reveal a match buried three levels
 * down without the leader clicking through to it.
 *
 * Below tablet width the same groups render as stacked cards instead of a
 * horizontally scrolling table; both presentations read through
 * formatGroupRow so they cannot drift from each other.
 */
import type { SectionWithStats } from "@/lib/admin/stats";
import { CAMPUS_NAMES } from "@/lib/admin/campuses";
import {
  collectGroups,
  LeadingConnects,
  StageCountChart,
} from "@/components/sections/hierarchy-overview";

function campusLabel(campusId: number | null): string {
  if (campusId === null) return "Unknown";
  return CAMPUS_NAMES[campusId] ?? `Campus ${campusId}`;
}

type GroupRow = {
  id: number;
  name: string;
  campus: string;
  members: number;
  readToday: number;
  progress: string;
  stage: string;
};

function formatGroupRow(group: SectionWithStats["groups"][number]): GroupRow {
  return {
    id: group.id,
    name: group.name,
    campus: campusLabel(group.campusId),
    members: group.memberCount,
    readToday: group.readersToday,
    progress: `${Math.round(group.ratio * 100)}%`,
    stage: group.stage,
  };
}

function GroupRows({ groups }: { groups: SectionWithStats["groups"] }) {
  if (groups.length === 0) return null;
  return (
    <>
      {groups.map((group) => {
        const row = formatGroupRow(group);
        return (
          <tr key={row.id} className="admin-row-group">
            <td>{row.name}</td>
            <td>{row.campus}</td>
            <td>{row.members}</td>
            <td>{row.readToday}</td>
            <td>{row.progress}</td>
            <td>
              <span className="admin-stage-pill">{row.stage}</span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function GroupCards({ groups }: { groups: SectionWithStats["groups"] }) {
  if (groups.length === 0) return null;
  return (
    <div className="admin-group-cards">
      {groups.map((group) => {
        const row = formatGroupRow(group);
        return (
          <div key={row.id} className="admin-group-card">
            <strong className="admin-group-card-name">{row.name}</strong>
            <dl>
              <div>
                <dt>Campus</dt>
                <dd>{row.campus}</dd>
              </div>
              <div>
                <dt>Members</dt>
                <dd>{row.members}</dd>
              </div>
              <div>
                <dt>Read today</dt>
                <dd>{row.readToday}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>{row.progress}</dd>
              </div>
              <div>
                <dt>Home</dt>
                <dd>
                  <span className="admin-stage-pill">{row.stage}</span>
                </dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

export function SectionTree({
  section,
  depth = 0,
  forceOpen = false,
  showPodium = true,
}: {
  section: SectionWithStats;
  depth?: number;
  forceOpen?: boolean;
  /** False on a lone root, whose podium would just repeat the one above it. */
  showPodium?: boolean;
}) {
  const hasChildren = section.children.length > 0;
  const hasGroups = section.groups.length > 0;
  // Rollup, not own-groups: the upper rows of the tree carry no groups of
  // their own, so charting only `section.groups` would leave exactly the rows
  // a cluster head cares about blank.
  const rollup = collectGroups(section);

  return (
    <details open={forceOpen || depth < 1} className="admin-section-details">
      <summary className="admin-section-summary">
        {section.name}
        <small>
          {section.groups.length} group{section.groups.length === 1 ? "" : "s"}
          {hasChildren ? `, ${section.children.length} sub-section${section.children.length === 1 ? "" : "s"}` : ""}
        </small>
      </summary>

      <StageCountChart groups={rollup} label={`${section.name} — homes reached`} />
      {showPodium && (
        <LeadingConnects
          groups={rollup}
          heading="LEADING HERE"
          label={`Leading Connect Groups in ${section.name}`}
        />
      )}

      {hasGroups && (
        <>
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
          <GroupCards groups={section.groups} />
        </>
      )}

      {hasChildren && (
        <ul className="admin-nested">
          {section.children.map((child) => (
            <li key={child.id}>
              <SectionTree section={child} depth={depth + 1} forceOpen={forceOpen} />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
