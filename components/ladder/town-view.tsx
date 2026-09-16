"use client";

/**
 * Connect-home visiting prototype for wayfinder map #110.
 *
 * Map #146 is the authority for scope ownership: only Connects own Homes.
 * Regional leaders land on their region's Connect-home row. Cluster and
 * Department leaders pick a region first, then enter that region's row.
 * Nothing here fabricates an upstream-owned home.
 */
import { useEffect, useState } from "react";

import { MemberStreakDots } from "@/components/member-streak-dots";
import { StageMini } from "@/components/stage-mini";
import type { SectionWithStats } from "@/lib/admin/stats";
import type { LadderGroupLegend } from "@/lib/ladder/legend-contract";

type VisitKey = `group:${number}`;
type VisitTarget = SectionWithStats["groups"][number];

const CLUSTER_VIEWERS = new Set(["clusterHead", "bigClusterHead", "departmentAsCluster", "singleRegionDepartment", "multiScope"]);

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

function defaultLegendsOn(viewer: string): boolean {
  return viewer === "connectMember" || viewer === "connectLeader";
}

export function LadderTownView({
  roots,
  unavailableGroupIds,
  viewer,
  viewers,
  onChangeViewer,
  initialVisitedKey,
}: {
  roots: SectionWithStats[];
  unavailableGroupIds: number[];
  viewer: string;
  viewers: Array<{ key: string; label: string }>;
  onChangeViewer: (next: string) => void;
  initialVisitedKey?: VisitKey | null;
}) {
  const isClusterViewer = CLUSTER_VIEWERS.has(viewer);
  const isConnectViewer = viewer === "connectMember" || viewer === "connectLeader";
  const [rootIndex, setRootIndex] = useState(0);
  const [regionIndex, setRegionIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [visitedKey, setVisitedKey] = useState<VisitKey | null>(initialVisitedKey ?? null);
  const [bonusesResolved, setBonusesResolved] = useState(false);
  const [showLegends, setShowLegends] = useState(() => defaultLegendsOn(viewer));

  useEffect(() => {
    const onPopState = () => {
      const next = visitKeyFrom(new URL(window.location.href).searchParams.get("home") ?? undefined);
      setVisitedKey(next);
      setBonusesResolved(Boolean(next));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const safeRootIndex = Math.min(rootIndex, Math.max(0, roots.length - 1));
  const root = roots[safeRootIndex];
  const regions = root
    ? root.children.length > 0
      ? root.children
      : root.groups.length > 0
        ? [root]
        : []
    : [];
  const safeRegionIndex = Math.min(regionIndex, Math.max(0, regions.length - 1));
  const region = isClusterViewer ? regions[safeRegionIndex] : root;
  const groups = region?.groups ?? [];
  const safeCursor = Math.min(cursor, Math.max(0, groups.length - 1));
  const visitedGroup = groupFromKey(groups, visitedKey);
  const ownGroup = isConnectViewer && !visitedKey ? groups[0] ?? null : null;
  const activeGroup = visitedGroup ?? ownGroup;

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
    setBonusesResolved(Boolean(next));
  }

  if (!root) {
    return (
      <div className="ladder-stage">
        <p className="ladder-empty">This viewer has no visible Connect homes.</p>
        <p className="ladder-empty-detail">Section-only viewers stay on the Leader surface.</p>
        <ViewerPicker viewer={viewer} viewers={viewers} onChangeViewer={onChangeViewer} />
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
              setRootIndex(Number(event.target.value));
              setRegionIndex(0);
              setCursor(0);
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
        {isClusterViewer && region && (
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

      {isClusterViewer && (
        <RegionPicker
          regions={regions}
          index={safeRegionIndex}
          onChange={(next) => {
            setRegionIndex(next);
            setCursor(0);
            updateVisited(null, "replace");
          }}
        />
      )}

      {activeGroup ? (
        <VisitedConnectHome
          group={activeGroup}
          unavailable={unavailableGroupIds.includes(activeGroup.id)}
          showLegends={showLegends}
          isOwnHome={ownGroup !== null}
          onToggleLegends={() => setShowLegends((visible) => !visible)}
          onReturn={() => updateVisited(null, "push")}
        />
      ) : region ? (
        <>
          <RegionTownHeading
            region={region}
            groupCount={groups.length}
            isClusterViewer={isClusterViewer}
            bonusesResolved={bonusesResolved}
          />
          <ShallowRow
            groups={groups}
            index={safeCursor}
            onStep={setCursor}
            unavailableGroupIds={unavailableGroupIds}
            onVisit={(key) => updateVisited(key, "push")}
          />
        </>
      ) : (
        <p className="ladder-empty">No regions to visit in this jurisdiction yet.</p>
      )}

      <p className="ladder-deep-link-note">
        {ownGroup
          ? "This is your Connect home. Member legends are on by default."
          : activeGroup
            ? "This Connect home is in the URL. Browser Back returns to the region town."
          : "Choose Visit home to test a shareable Connect-home URL and browser Back."}
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
        <ViewerPicker viewer={viewer} viewers={viewers} onChangeViewer={onChangeViewer} />
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
  if (regions.length === 0) return null;
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
            <small>{region.groups.length} Connect homes →</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function RegionTownHeading({
  region,
  groupCount,
  isClusterViewer,
  bonusesResolved,
}: {
  region: SectionWithStats;
  groupCount: number;
  isClusterViewer: boolean;
  bonusesResolved: boolean;
}) {
  return (
    <section className="ladder-jurisdiction" data-bonus-state={bonusesResolved ? "resolved" : "provisional"}>
      <div className="ladder-jurisdiction-copy">
        <p className="ladder-eyebrow">{isClusterViewer ? "Region town" : "Regional leader landing"}</p>
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
  const [legendError, setLegendError] = useState(false);

  useEffect(() => {
    if (!showLegends) return;
    let cancelled = false;
    const start = window.setTimeout(() => {
      if (cancelled) return;
      setLegendLoading(true);
      setLegendError(false);
      fetch(`/ladder/legend?groupId=${group.id}`, { cache: "no-store" })
        .then((response) => response.json() as Promise<LadderGroupLegend>)
        .then((result) => {
          if (cancelled) return;
          setLegendLoading(false);
          if (result.ok) setLegend(result);
          else setLegendError(true);
        })
        .catch(() => {
          if (cancelled) return;
          setLegendLoading(false);
          setLegendError(true);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [group.id, showLegends]);

  return (
    <section className="ladder-visited-home">
      <p className="ladder-visited-eyebrow">{isOwnHome ? "Your Connect home" : "Read-only visited Connect home"}</p>
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
        ) : legendError ? (
          <p>Only authorized leaders or members of this Connect can view the legend.</p>
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
