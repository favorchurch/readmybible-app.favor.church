"use client";

/**
 * Home-ladder prototype: the region town view, built to the decisions frozen
 * on wayfinder map #110.
 *
 * - #114 -- the town view is a **shallow row**: one primary home at a time,
 *   siblings perceptible either side, panned across. Not a shared-fire scene,
 *   not a card grid. It is a **toggle** against the single region home, not
 *   the default surface.
 * - #115 -- lateral movement is a **slide**. The row *is* the slide. Enter and
 *   back are a separate axis. `prefers-reduced-motion` falls back to a cut
 *   (handled in CSS). Where lateral is unavailable the control is absent,
 *   never disabled-looking.
 * - #116 -- the multi-scope chooser is a **home overlay**, top-left, present
 *   on every home rather than only the landing one. Hidden entirely for a
 *   single-scope viewer.
 * - #112 -- an occupant's aggregate reads as an emoji-dot fraction.
 *
 * Prototype only. Runs on the frozen fixture (#111); reads no Rock and no
 * database. `lib/ladder/dev-gate.ts` keeps it out of production.
 */
import { useState } from "react";

import { StageMini } from "@/components/stage-mini";
import { OccupantBadge, aggregateRatio, occupantStateFor } from "@/components/ladder/occupant-badge";
import type { SectionWithStats } from "@/lib/admin/stats";
import { stageFor } from "@/lib/game";

type Surface = "region" | "town";

/**
 * Two roots can carry the same leader name -- the real multi-scope viewer in
 * the fixture heads identically-named clusters under MNL Adults and MNL
 * Seasoned. Labelling by name alone shows the same word twice, so the chooser
 * disambiguates by position.
 */
function scopeLabel(section: SectionWithStats, index: number, all: SectionWithStats[]): string {
  const duplicate = all.filter((s) => s.name === section.name).length > 1;
  return duplicate ? `${section.name} (${index + 1} of ${all.length})` : section.name;
}

export function LadderTownView({
  roots,
  unavailableGroupIds,
  viewer,
  viewers,
  onChangeViewer,
}: {
  roots: SectionWithStats[];
  unavailableGroupIds: number[];
  viewer: string;
  viewers: Array<{ key: string; label: string }>;
  onChangeViewer: (next: string) => void;
}) {
  const [rootIndex, setRootIndex] = useState(0);
  const [surface, setSurface] = useState<Surface>("region");
  const [cursor, setCursor] = useState(0);

  const root = roots[rootIndex];
  if (!root) return <p className="ladder-empty">This viewer has no visible scope.</p>;

  // A section's steppable siblings are its sub-sections when it has them,
  // otherwise its connects -- one rung down either way.
  const children = root.children.length > 0 ? root.children : [];
  const connects = root.groups;
  const townItems = children.length > 0 ? children : null;

  const multiScope = roots.length > 1;
  const index = Math.min(cursor, Math.max(0, (townItems?.length ?? connects.length) - 1));

  return (
    <div className={`ladder-stage ${multiScope ? "has-scope-overlay" : ""}`}>
      {/* #116: the scope overlay sits on the scene itself and renders on every
          home, not only the landing one. Single-scope viewers get nothing. */}
      {multiScope && (
        <div className="ladder-scope-overlay">
          <label htmlFor="ladder-scope">Scope</label>
          <select
            id="ladder-scope"
            value={rootIndex}
            onChange={(event) => {
              setRootIndex(Number(event.target.value));
              setCursor(0);
            }}
          >
            {roots.map((candidate, i) => (
              <option key={candidate.id} value={i}>
                {scopeLabel(candidate, i, roots)}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="ladder-breadcrumb" aria-label="Scope">
        <span className="ladder-crumb ladder-crumb-current">{root.name}</span>
        {surface === "town" && townItems && (
          <>
            <span aria-hidden="true">›</span>
            <span className="ladder-crumb">{townItems[index]?.name}</span>
          </>
        )}
      </nav>

      {surface === "region" ? (
        <RegionHome section={root} connects={connects} unavailableGroupIds={unavailableGroupIds} />
      ) : (
        <ShallowRow
          items={townItems ?? []}
          connects={connects}
          index={index}
          onStep={setCursor}
          unavailableGroupIds={unavailableGroupIds}
        />
      )}

      <div className="ladder-controls">
        <button
          type="button"
          className="ladder-toggle"
          aria-pressed={surface === "town"}
          onClick={() => setSurface(surface === "region" ? "town" : "region")}
        >
          {surface === "region" ? "Show town view" : "Show single home"}
        </button>

        <select
          aria-label="Viewer"
          value={viewer}
          onChange={(event) => onChangeViewer(event.target.value)}
        >
          {viewers.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** The single aggregate home -- the default surface the town view toggles against. */
function RegionHome({
  section,
  connects,
  unavailableGroupIds,
}: {
  section: SectionWithStats;
  connects: SectionWithStats["groups"];
  unavailableGroupIds: number[];
}) {
  const ratio = aggregateRatio(section, unavailableGroupIds);
  const stage = stageFor(ratio);

  return (
    <div className="ladder-single">
      <StageMini name={stage} size={200} />
      <p className="ladder-home-label">
        {section.name} · {stage} · {Math.round(ratio * 100)}%
      </p>
      <OccupantBadge state={occupantStateFor(section, unavailableGroupIds)} />
      <p className="ladder-meta">
        {section.children.length > 0
          ? `${section.children.length} region${section.children.length === 1 ? "" : "s"}`
          : `${connects.length} connect${connects.length === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

/**
 * #114's shallow row. Three slots are rendered -- previous, centre, next --
 * and stepping slides the strip by one. The prev/next controls are **absent**
 * at the ends rather than disabled (#115): a greyed arrow reads as broken, a
 * missing one reads as "not a thing here".
 */
function ShallowRow({
  items,
  connects,
  index,
  onStep,
  unavailableGroupIds,
}: {
  items: SectionWithStats[];
  connects: SectionWithStats["groups"];
  index: number;
  onStep: (next: number) => void;
  unavailableGroupIds: number[];
}) {
  // A leaf region steps between its connects; a cluster steps between regions.
  const entries = items.length
    ? items.map((section) => {
        const ratio = aggregateRatio(section, unavailableGroupIds);
        return { key: section.id, name: section.name, ratio, stage: stageFor(ratio), section };
      })
    : connects.map((group) => ({
        key: group.id,
        name: group.name,
        ratio: unavailableGroupIds.includes(group.id) ? null : group.ratio,
        stage: group.stage,
        section: null,
      }));

  if (entries.length === 0) {
    return <p className="ladder-empty">This scope has nothing beneath it yet.</p>;
  }

  return (
    <div className="ladder-row">
      {index > 0 ? (
        <button type="button" className="ladder-step" onClick={() => onStep(index - 1)} aria-label="Previous">
          ‹
        </button>
      ) : (
        <span className="ladder-step-gap" aria-hidden="true" />
      )}

      <div className="ladder-track-window">
        <div
          className="ladder-track"
          style={{ transform: `translateX(calc(${-index} * var(--ladder-slot)))` }}
        >
          {entries.map((entry, i) => (
            <div key={entry.key} className={`ladder-slot ${i === index ? "is-centre" : ""}`}>
              {/* One size for every slot, emphasised by a bottom-anchored
                  scale in CSS -- sizing each StageMini differently floats the
                  models at different heights, because each centres inside its
                  own square box. A shared ground line is what makes the row
                  read as a street. */}
              <span className="ladder-home-art">
                <StageMini name={entry.stage} size={130} />
              </span>
              <strong className="ladder-home-label">{entry.name}</strong>
              <span className="ladder-meta">
                {entry.ratio === null ? "— data unavailable" : `${entry.stage} · ${Math.round(entry.ratio * 100)}%`}
              </span>
              {entry.section && <OccupantBadge state={occupantStateFor(entry.section, unavailableGroupIds)} />}
            </div>
          ))}
        </div>
      </div>

      {index < entries.length - 1 ? (
        <button type="button" className="ladder-step" onClick={() => onStep(index + 1)} aria-label="Next">
          ›
        </button>
      ) : (
        <span className="ladder-step-gap" aria-hidden="true" />
      )}
    </div>
  );
}
