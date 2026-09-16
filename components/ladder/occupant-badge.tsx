/**
 * The occupant badge settled in issue #112: an emoji-dot fraction, `🟢 3/4`.
 *
 * The fraction is *child scopes on track over total child scopes* -- it rolls
 * up by scope, not by person, so the number matches what the viewer can
 * actually step into from that home. The dot carries the state, the fraction
 * carries the detail, and the fraction is always present so the badge never
 * depends on colour alone.
 */
import type { SectionWithStats } from "@/lib/admin/stats";

/** > 70% -- the green band. A child scope at or above this counts as on track. */
export const ON_TRACK_RATIO = 0.7;

function dotFor(ratio: number): string {
  if (ratio <= 0.2) return "🔴";
  if (ratio <= 0.5) return "🟠";
  if (ratio <= 0.7) return "🟡";
  return "🟢";
}

export type OccupantState =
  | { kind: "scope"; onTrack: number; total: number; ratio: number }
  | { kind: "zero"; total: number }
  | { kind: "unavailable" };

/**
 * Rolls a section's immediate children into the badge's fraction. A section's
 * children are its sub-sections when it has them, otherwise its connects --
 * "one rung down" either way, which is what an occupant stands for.
 */
export function occupantStateFor(
  section: SectionWithStats,
  unavailableGroupIds: readonly number[] = [],
): OccupantState {
  const childRatios = section.children.length
    ? section.children.map((child) => aggregateRatio(child, unavailableGroupIds))
    : section.groups.map((group) => (unavailableGroupIds.includes(group.id) ? null : group.ratio));

  const known = childRatios.filter((r): r is number => r !== null);
  if (known.length === 0) return { kind: "unavailable" };

  const onTrack = known.filter((r) => r > ON_TRACK_RATIO).length;
  const ratio = onTrack / known.length;
  if (onTrack === 0) return { kind: "zero", total: known.length };
  return { kind: "scope", onTrack, total: known.length, ratio };
}

/** Mean ratio of every connect beneath a section, used to judge "on track". */
export function aggregateRatio(
  section: SectionWithStats,
  unavailableGroupIds: readonly number[] = [],
): number {
  const ratios: number[] = [];
  function walk(node: SectionWithStats) {
    for (const group of node.groups) {
      if (unavailableGroupIds.includes(group.id)) continue;
      ratios.push(group.ratio);
    }
    node.children.forEach(walk);
  }
  walk(section);
  if (ratios.length === 0) return 0;
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
}

export function OccupantBadge({ state }: { state: OccupantState }) {
  if (state.kind === "unavailable") {
    // Never "locked" -- docs/scene-rewards-proposal.md is explicit that
    // unavailable data must not read as a withheld reward.
    return (
      <span className="ladder-badge" title="Data unavailable">
        ⚪ —/—
      </span>
    );
  }
  if (state.kind === "zero") {
    return <span className="ladder-badge">⚪ 0/{state.total}</span>;
  }
  return (
    <span className="ladder-badge">
      {dotFor(state.ratio)} {state.onTrack}/{state.total}
    </span>
  );
}
