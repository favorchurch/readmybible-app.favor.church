/**
 * The visual layer over a hierarchy section: a stage-count chart and a
 * gold/silver/bronze podium, both computed from every group *beneath* a
 * section (its own groups plus every descendant's), so the top rows of the
 * tree -- which usually own no groups themselves -- still say something.
 *
 * Both read through `collectGroups`, so a section's chart and its podium can
 * never disagree about which groups they're describing.
 *
 * Icons are `StageGlyph` (flat SVG), not `StageMini` (the 3D CSS model): a
 * single section can chart 160+ groups, which is exactly the load that made
 * the retired "Other Connects" board expensive.
 */
import type { SectionWithStats, GroupWithStats } from "@/lib/admin/stats";
import { StageGlyph, STAGE_ORDER } from "@/components/stage-glyph";
import type { Stage } from "@/lib/game";

const MEDALS = ["gold", "silver", "bronze"] as const;
const MEDAL_LABEL: Record<(typeof MEDALS)[number], string> = {
  gold: "1st",
  silver: "2nd",
  bronze: "3rd",
};

/** Every group at or below `section`, depth-first. */
export function collectGroups(section: SectionWithStats): GroupWithStats[] {
  const out: GroupWithStats[] = [...section.groups];
  for (const child of section.children) out.push(...collectGroups(child));
  return out;
}

/**
 * Stage tallies in progression order. Stages nobody has reached are dropped
 * rather than shown as x0 -- at launch every group is a Tent, so a fixed
 * six-slot row would be five zeroes and one number.
 */
export function stageCounts(groups: GroupWithStats[]): Array<{ stage: Stage; count: number }> {
  const tally = new Map<Stage, number>();
  for (const group of groups) tally.set(group.stage, (tally.get(group.stage) ?? 0) + 1);
  return STAGE_ORDER.map((stage) => ({ stage, count: tally.get(stage) ?? 0 })).filter(
    ({ count }) => count > 0,
  );
}

/** The leading groups by progress. Ties break on name so the order is stable. */
export function leadingGroups(groups: GroupWithStats[], limit = 3): GroupWithStats[] {
  return [...groups]
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function StageCountChart({ groups, label }: { groups: GroupWithStats[]; label: string }) {
  const counts = stageCounts(groups);
  if (counts.length === 0) return null;
  return (
    <ul className="stage-count-chart" data-section="stage-counts" aria-label={label}>
      {counts.map(({ stage, count }) => (
        <li key={stage} className="stage-count" title={`${count} ${stage}`}>
          <StageGlyph name={stage} size={26} />
          <span className="stage-count-value">
            <b>{count}</b>
            <small>{stage}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LeadingConnects({
  groups,
  label,
  heading,
}: {
  groups: GroupWithStats[];
  label: string;
  heading?: string;
}) {
  const leaders = leadingGroups(groups);
  // One group on its own is not a ranking -- a lone gold medal reads as an
  // award rather than a standing.
  if (leaders.length < 2) return null;
  return (
    <div className="leading-connects" data-section="leading-connects">
      {heading && <p className="eyebrow">{heading}</p>}
      <ol className="leading-connects-list" aria-label={label}>
        {leaders.map((group, index) => {
          const medal = MEDALS[index] ?? "bronze";
          return (
            <li key={group.id} className={`leading-connect medal-${medal}`}>
              <span className="leading-medal" aria-hidden="true" />
              <span className="sr-only">{MEDAL_LABEL[medal]}</span>
              <StageGlyph name={group.stage} size={28} />
              <span className="leading-connect-body">
                <strong>{group.name}</strong>
                <small>
                  {Math.round(group.ratio * 100)}% · {group.stage}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
