"use client";

/**
 * Connect-home visiting surface for wayfinder map #110, promoted out of the
 * dev-only /ladder prototype by issue #151 into the real Leader surface
 * (components/sections/section-dashboard.tsx). The dev prototype
 * (components/ladder/ladder-prototype.tsx) still renders this directly with
 * synthetic viewer fixtures for visual QA -- both paths share this file so
 * they cannot drift.
 *
 * Map #146 is the authority for scope ownership: only Connects own Homes.
 * Regional leaders land on their region's Connect-home row. Cluster and
 * Department leaders pick a region first, then enter that region's row.
 * Nothing here fabricates an upstream-owned home.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { MemberStreakDots } from "@/components/member-streak-dots";
import { StageMini } from "@/components/stage-mini";
import type { SectionWithStats } from "@/lib/admin/stats";
import { groupByLocality, UNKNOWN_LOCALITY } from "@/lib/game";
import type { LadderGroupLegend } from "@/lib/ladder/legend-contract";

import "./ladder.css";

type VisitKey = `group:${number}`;
type VisitTarget = SectionWithStats["groups"][number];
type GroupContext = {
  rootIndex: number;
  regionIndex: number;
  region: SectionWithStats;
  group: VisitTarget;
};

function scopeLabel(section: SectionWithStats, index: number, all: SectionWithStats[]): string {
  const duplicate = all.filter((candidate) => candidate.name === section.name).length > 1;
  return duplicate ? `${section.name} (${index + 1} of ${all.length})` : section.name;
}

function visitKeyFrom(value: string | undefined): VisitKey | null {
  return value && /^group:\d+$/.test(value) ? (value as VisitKey) : null;
}

function groupFromKey(groups: SectionWithStats["groups"], key: VisitKey | null): VisitTarget | null {
  if (!key) return null;
  const id = Number(key.slice("group:".length));
  return groups.find((group) => group.id === id) ?? null;
}

/**
 * A section with child sections is navigated one level down (issue #117: "a
 * cluster is navigated, not rendered as its own landscape"); a section with
 * no children but direct Connect Groups IS the region to show. This is
 * evaluated per-root, not from a fixed viewer name, so a real multi-scope
 * leader whose jurisdictions have different shapes (e.g. one region, one
 * cluster) is handled correctly without a matching prototype fixture.
 */
function regionsForRoot(root: SectionWithStats): SectionWithStats[] {
  if (root.children.length > 0) return root.children;
  return root.groups.length > 0 ? [root] : [];
}

function findGroupContext(roots: SectionWithStats[], key: VisitKey | null): GroupContext | null {
  if (!key) return null;
  for (const [rootIndex, root] of roots.entries()) {
    const regions = regionsForRoot(root);
    for (const [regionIndex, region] of regions.entries()) {
      const group = groupFromKey(region.groups, key);
      if (group) return { rootIndex, regionIndex, region, group };
    }
  }
  return null;
}

function defaultLegendsOn(viewer: string): boolean {
  return viewer === "connectMember" || viewer === "connectLeader";
}

/** Maps a region's Connect Groups into `groupByLocality`'s standing shape and back. */
function groupsByLocality(groups: readonly VisitTarget[]): { key: string; label: string; groups: VisitTarget[] }[] {
  const sections = groupByLocality(
    groups.map((g) => ({ groupId: g.id, name: g.name, ratio: g.ratio, readersToday: g.readersToday, locality: g.locality ?? null })),
  );
  return sections.map((section) => ({
    key: section.locality,
    label: section.locality === UNKNOWN_LOCALITY ? "Other" : section.locality,
    groups: section.groups.map((standing) => groups.find((g) => g.id === standing.groupId) as VisitTarget),
  }));
}

export function LadderTownView({
  roots,
  unavailableGroupIds,
  viewer,
  ownGroupId,
  viewers,
  onChangeViewer,
  initialVisitedKey,
}: {
  roots: SectionWithStats[];
  unavailableGroupIds: number[];
  viewer: string;
  ownGroupId: number | null;
  /** Dev-prototype-only viewer switcher. Omit both in production -- a real leader has one jurisdiction, not a fixture picker. */
  viewers?: Array<{ key: string; label: string }>;
  onChangeViewer?: (next: string) => void;
  /**
   * Server-computed initial visited key, for callers that already read
   * `?home=` at the page level (the dev prototype). Omit it and this reads
   * the current `?home=` param itself -- what the promoted, page-agnostic
   * Leader surface does, since it has no dedicated server page of its own.
   */
  initialVisitedKey?: VisitKey | null;
}) {
  const searchParams = useSearchParams();
  const resolvedInitialVisitedKey =
    initialVisitedKey !== undefined ? initialVisitedKey : visitKeyFrom(searchParams.get("home") ?? undefined);
  const isConnectViewer = viewer === "connectMember" || viewer === "connectLeader";
  const initialContext = findGroupContext(roots, resolvedInitialVisitedKey ?? null);
  const initialRoot = roots[initialContext?.rootIndex ?? 0] ?? null;
  const initialIsClusterViewer = initialRoot ? initialRoot.children.length > 0 : false;
  const [rootIndex, setRootIndex] = useState(initialContext?.rootIndex ?? 0);
  const [regionIndex, setRegionIndex] = useState(initialContext?.regionIndex ?? 0);
  const [cursor, setCursor] = useState(0);
  const [visitedKey, setVisitedKey] = useState<VisitKey | null>(resolvedInitialVisitedKey ?? null);
  const [visitEntryActive, setVisitEntryActive] = useState(false);
  const [bonusesResolved, setBonusesResolved] = useState(false);
  const [showLegends, setShowLegends] = useState(() => defaultLegendsOn(viewer));
  // Issue #117: a Cluster Head's landing is the plain region list itself, not
  // a pre-selected region's town view. `regionEntered` gates whether a region
  // has actually been picked (or arrived at via a deep link) yet.
  const [regionEntered, setRegionEntered] = useState(() => !initialIsClusterViewer || initialContext !== null);

  useEffect(() => {
    const onPopState = () => {
      const next = visitKeyFrom(new URL(window.location.href).searchParams.get("home") ?? undefined);
      const context = findGroupContext(roots, next);
      if (context) {
        setRootIndex(context.rootIndex);
        setRegionIndex(context.regionIndex);
        setCursor(0);
        setRegionEntered(true);
      }
      setVisitedKey(next);
      setVisitEntryActive(false);
      setBonusesResolved(Boolean(next));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [roots]);

  const safeRootIndex = Math.min(rootIndex, Math.max(0, roots.length - 1));
  const root = roots[safeRootIndex];
  const isClusterViewer = root ? root.children.length > 0 : false;
  const regions = root ? regionsForRoot(root) : [];
  const safeRegionIndex = Math.min(regionIndex, Math.max(0, regions.length - 1));
  const currentRegion = isClusterViewer ? regions[safeRegionIndex] : root;
  const visitContext = findGroupContext(roots, visitedKey);
  const region = visitContext?.region ?? currentRegion;
  const groups = region?.groups ?? [];
  const safeCursor = Math.min(cursor, Math.max(0, groups.length - 1));
  const visitedGroup = visitContext?.group ?? null;
  const ownGroup = isConnectViewer && !visitedKey ? groupFromKey(groups, ownGroupId === null ? null : `group:${ownGroupId}`) : null;
  const activeGroup = visitedGroup ?? ownGroup;
  const localitySections = groupsByLocality(groups);

  // #118's amendment: a local Connect view paints first. This timer is only a
  // prototype stand-in for the streamed scope bonus; it performs no walk and
  // cannot downgrade the base view.
  useEffect(() => {
    if (visitedKey || region?.id === undefined) return;
    const timer = window.setTimeout(() => setBonusesResolved(true), 900);
    return () => window.clearTimeout(timer);
  }, [region?.id, visitedKey]);

  function updateVisited(next: VisitKey | null, historyMode: "push" | "replace") {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("home", next);
    else url.searchParams.delete("home");
    const method = historyMode === "push" ? "pushState" : "replaceState";
    window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
    setVisitedKey(next);
    setVisitEntryActive(historyMode === "push" && next !== null);
    setBonusesResolved(Boolean(next));
  }

  function returnFromVisit() {
    if (visitEntryActive) {
      window.history.back();
      return;
    }
    updateVisited(null, "replace");
  }

  if (!root) {
    return (
      <div className="ladder-stage">
        <p className="ladder-empty">This viewer has no visible Connect homes.</p>
        <p className="ladder-empty-detail">Section-only viewers stay on the Leader surface.</p>
        {viewers && onChangeViewer && <ViewerPicker viewer={viewer} viewers={viewers} onChangeViewer={onChangeViewer} />}
      </div>
    );
  }

  const multiScope = roots.length > 1;

  return (
    <div className={`ladder-stage ${multiScope ? "has-scope-overlay" : ""}`}>
      {multiScope && (
        <div className="ladder-scope-overlay">
          <label htmlFor="ladder-scope">Jurisdiction</label>
          <select
            id="ladder-scope"
            value={safeRootIndex}
            onChange={(event) => {
              const nextIndex = Number(event.target.value);
              const nextRoot = roots[nextIndex];
              setRootIndex(nextIndex);
              setRegionIndex(0);
              setCursor(0);
              setRegionEntered(nextRoot ? nextRoot.children.length === 0 : true);
              updateVisited(null, "replace");
            }}
          >
            {roots.map((candidate, index) => (
              <option key={candidate.id} value={index}>
                {scopeLabel(candidate, index, roots)}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="ladder-breadcrumb" aria-label="Ladder location">
        <span className="ladder-crumb ladder-crumb-current">Jurisdiction · {root.name}</span>
        {isClusterViewer && regionEntered && region && (
          <>
            <span aria-hidden="true">›</span>
            <span className="ladder-crumb">Region · {region.name}</span>
          </>
        )}
        {activeGroup && (
          <>
            <span aria-hidden="true">›</span>
            <span className="ladder-crumb ladder-crumb-visited">{activeGroup.name}</span>
          </>
        )}
      </nav>

      {activeGroup ? (
        <VisitedConnectHome
          group={activeGroup}
          unavailable={unavailableGroupIds.includes(activeGroup.id)}
          showLegends={showLegends}
          isOwnHome={ownGroup !== null}
          onToggleLegends={() => setShowLegends((visible) => !visible)}
          onReturn={returnFromVisit}
        />
      ) : isClusterViewer && !regionEntered ? (
        <RegionPicker
          regions={regions}
          index={safeRegionIndex}
          onChange={(next) => {
            setRegionIndex(next);
            setCursor(0);
            setRegionEntered(true);
          }}
        />
      ) : region ? (
        <>
          {isClusterViewer && (
            <button type="button" className="ladder-return ladder-all-regions" onClick={() => setRegionEntered(false)}>
              ← All regions
            </button>
          )}
          <RegionTownHeading region={region} groupCount={groups.length} bonusesResolved={bonusesResolved} />
          {localitySections.length > 1 ? (
            <div className="locality-town-container">
              {localitySections.map((section) => (
                <LocalityRow
                  key={section.key}
                  label={section.label}
                  groups={section.groups}
                  unavailableGroupIds={unavailableGroupIds}
                  onVisit={(key) => updateVisited(key, "push")}
                />
              ))}
            </div>
          ) : (
            <ShallowRow
              groups={groups}
              index={safeCursor}
              onStep={setCursor}
              unavailableGroupIds={unavailableGroupIds}
              onVisit={(key) => updateVisited(key, "push")}
            />
          )}
        </>
      ) : (
        <p className="ladder-empty">No regions to visit in this jurisdiction yet.</p>
      )}

      <p className="ladder-deep-link-note">
        {ownGroup
          ? "This is Your Connect. Member legends are on by default."
          : activeGroup
            ? "Visiting Connect. Browser Back returns to Region Connects."
            : "Visit a Connect home below. Browser Back will bring you back here."}
      </p>

      <div className="ladder-controls">
        <details className="ladder-settings">
          <summary>View settings</summary>
          <label>
            <input type="checkbox" checked={showLegends} onChange={(event) => setShowLegends(event.target.checked)} />
            Show member legends
          </label>
          <small>{showLegends ? "Names and recent five-day streaks are visible to authorized viewers." : "Member legends are hidden."}</small>
        </details>
        {viewers && onChangeViewer && <ViewerPicker viewer={viewer} viewers={viewers} onChangeViewer={onChangeViewer} />}
      </div>
    </div>
  );
}

function ViewerPicker({
  viewer,
  viewers,
  onChangeViewer,
}: {
  viewer: string;
  viewers: Array<{ key: string; label: string }>;
  onChangeViewer: (next: string) => void;
}) {
  return (
    <select aria-label="Viewer" value={viewer} onChange={(event) => onChangeViewer(event.target.value)}>
      {viewers.map((item) => (
        <option key={item.key} value={item.key}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function RegionPicker({
  regions,
  index,
  onChange,
}: {
  regions: SectionWithStats[];
  index: number;
  onChange: (next: number) => void;
}) {
  if (regions.length === 0) {
    return <p className="ladder-empty">No regions to visit in this jurisdiction yet.</p>;
  }
  return (
    <section className="ladder-region-picker" aria-labelledby="ladder-region-picker-title">
      <div>
        <p className="ladder-eyebrow">Navigate, don&apos;t render</p>
        <h2 id="ladder-region-picker-title">Choose a region</h2>
        <p>Picking one opens its Connect-home town view.</p>
      </div>
      <label>
        <span className="ladder-sr-only">Region</span>
        <select aria-label="Region" value={index} onChange={(event) => onChange(Number(event.target.value))}>
          {regions.map((region, regionIndex) => (
            <option key={region.id} value={regionIndex}>
              {region.name}
            </option>
          ))}
        </select>
      </label>
      <div className="ladder-region-list" aria-label="Regions in this jurisdiction">
        {regions.map((region, regionIndex) => (
          <button type="button" className={regionIndex === index ? "is-selected" : ""} key={region.id} onClick={() => onChange(regionIndex)}>
            <span>{region.name}</span>
            <small>
              {region.groups.length} Connect home{region.groups.length !== 1 ? "s" : ""} →
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function RegionTownHeading({
  region,
  groupCount,
  bonusesResolved,
}: {
  region: SectionWithStats;
  groupCount: number;
  bonusesResolved: boolean;
}) {
  return (
    <section className="ladder-jurisdiction" data-bonus-state={bonusesResolved ? "resolved" : "provisional"}>
      <div className="ladder-jurisdiction-copy">
        <p className="ladder-eyebrow">Region Connects</p>
        <h2>{region.name}</h2>
        <p>{groupCount === 1 ? "1 Connect home" : `${groupCount} Connect homes`} available to visit.</p>
      </div>
      <div className="ladder-bonus-status">
        <span className="ladder-provisional-badge">{bonusesResolved ? "Resolved" : "Provisional"}</span>
        <strong>{bonusesResolved ? "Scope contributions landed" : "Base painted · scope contributions resolving"}</strong>
      </div>
    </section>
  );
}

function VisitedConnectHome({
  group,
  unavailable,
  showLegends,
  isOwnHome,
  onToggleLegends,
  onReturn,
}: {
  group: VisitTarget;
  unavailable: boolean;
  showLegends: boolean;
  isOwnHome: boolean;
  onToggleLegends: () => void;
  onReturn: () => void;
}) {
  const [legend, setLegend] = useState<LadderGroupLegend | null>(null);
  const [legendLoading, setLegendLoading] = useState(false);
  const [legendError, setLegendError] = useState<"forbidden" | "unavailable" | null>(null);

  useEffect(() => {
    if (!showLegends) return;
    let cancelled = false;
    const start = window.setTimeout(() => {
      if (cancelled) return;
      setLegendLoading(true);
      setLegendError(null);
      fetch(`/ladder/legend?groupId=${group.id}`, { cache: "no-store" })
        .then((response) => response.json().then((result) => ({ result: result as LadderGroupLegend, status: response.status })))
        .then(({ result, status }) => {
          if (cancelled) return;
          setLegendLoading(false);
          if (result.ok) setLegend(result);
          else setLegendError(status === 401 || status === 403 ? "forbidden" : "unavailable");
        })
        .catch(() => {
          if (cancelled) return;
          setLegendLoading(false);
          setLegendError("unavailable");
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [group.id, showLegends]);

  return (
    <section className="ladder-visited-home">
      <p className="ladder-visited-eyebrow">{isOwnHome ? "Your Connect" : "Visiting Connect"}</p>
      {!isOwnHome && (
        <div className="status-chips-container">
          <span className="status-chip visiting-chip" role="status">
            Visiting: {group.name}
            <button type="button" onClick={onReturn} aria-label="Stop visiting this Connect">
              ×
            </button>
          </span>
        </div>
      )}
      <StageMini name={group.stage} size={200} />
      <p className="ladder-home-label">
        {group.name} · {unavailable ? "—" : `${group.stage} · ${Math.round(group.ratio * 100)}%`}
      </p>
      <p className="ladder-meta">No interior actions. Member legend is a view setting.</p>

      <div className="ladder-member-legend" aria-live="polite">
        <div className="ladder-member-legend-heading">
          <div>
            <p className="ladder-eyebrow">Connect legend</p>
            <h3>Members + recent five-day streak</h3>
          </div>
          <button type="button" className="ladder-visit" onClick={onToggleLegends}>
            {showLegends ? "Hide legend" : "Show legend"}
          </button>
        </div>
        {!showLegends ? (
          <p>Hidden by settings. Authorized Connect viewers can turn it on.</p>
        ) : legendLoading ? (
          <p>Loading the authorized Connect legend…</p>
        ) : legendError === "forbidden" ? (
          <p>Only authorized leaders or members of this Connect can view the legend.</p>
        ) : legendError === "unavailable" ? (
          <p>The legend is temporarily unavailable. Try again shortly.</p>
        ) : legend?.ok && legend.members.length ? (
          <div className="ladder-member-list">
            {legend.members.map((member) => (
              <div className="ladder-member-row" key={member.personId}>
                <span>{member.name}</span>
                <MemberStreakDots dates={member.readingDates} todayLocal={legend.todayLocal} />
              </div>
            ))}
          </div>
        ) : (
          <p>No members in this Connect yet.</p>
        )}
      </div>

      {!isOwnHome && (
        <button type="button" className="ladder-return" onClick={onReturn}>
          ← Return to Connect homes
        </button>
      )}
    </section>
  );
}

function LocalityRow({
  label,
  groups,
  unavailableGroupIds,
  onVisit,
}: {
  label: string;
  groups: SectionWithStats["groups"];
  unavailableGroupIds: readonly number[];
  onVisit: (key: VisitKey) => void;
}) {
  const [cursor, setCursor] = useState(0);
  const safeCursor = Math.min(cursor, Math.max(0, groups.length - 1));
  return (
    <section className="ladder-locality-group" aria-label={`${label} — ${groups.length} Connect home${groups.length !== 1 ? "s" : ""}`}>
      <h3 className="ladder-locality-heading">
        {label}
        <span className="ladder-locality-count">{groups.length} Connect home{groups.length !== 1 ? "s" : ""}</span>
      </h3>
      <ShallowRow groups={groups} index={safeCursor} onStep={setCursor} unavailableGroupIds={unavailableGroupIds} onVisit={onVisit} />
    </section>
  );
}

function ShallowRow({
  groups,
  index,
  onStep,
  unavailableGroupIds,
  onVisit,
}: {
  groups: SectionWithStats["groups"];
  index: number;
  onStep: (next: number) => void;
  unavailableGroupIds: readonly number[];
  onVisit: (key: VisitKey) => void;
}) {
  if (groups.length === 0) {
    return <p className="ladder-empty">This region has no Connect homes yet.</p>;
  }

  return (
    <div className="ladder-row">
      {index > 0 ? (
        <button type="button" className="ladder-step" onClick={() => onStep(index - 1)} aria-label="Previous Connect home">
          ‹
        </button>
      ) : (
        <span className="ladder-step-gap" aria-hidden="true" />
      )}

      <div className="ladder-track-window">
        <div className="ladder-track" style={{ transform: `translateX(calc(${-index} * var(--ladder-slot)))` }}>
          {groups.map((group, groupIndex) => {
            const unavailable = unavailableGroupIds.includes(group.id);
            return (
              <div key={group.id} className={`ladder-slot ${groupIndex === index ? "is-centre" : ""}`}>
                <span className="ladder-home-art">
                  <StageMini name={group.stage} size={130} />
                </span>
                <strong className="ladder-home-label">{group.name}</strong>
                <span className="ladder-meta">
                  {unavailable ? "— data unavailable" : `${group.stage} · ${Math.round(group.ratio * 100)}%`}
                </span>
                <button type="button" className="ladder-visit" onClick={() => onVisit(`group:${group.id}`)}>
                  Visit home
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {index < groups.length - 1 ? (
        <button type="button" className="ladder-step" onClick={() => onStep(index + 1)} aria-label="Next Connect home">
          ›
        </button>
      ) : (
        <span className="ladder-step-gap" aria-hidden="true" />
      )}
    </div>
  );
}
