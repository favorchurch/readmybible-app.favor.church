"use client";

import { useState } from "react";

import { PLAN } from "@/lib/plan";
import { writesBlocked, type SimulatedPhase, type TestModeState, type TestModeViewer } from "./logic";

const PHASES: { value: SimulatedPhase; label: string }[] = [
  { value: "pre-launch", label: "Pre-launch" },
  { value: "active", label: "Active" },
  { value: "grace", label: "Grace" },
  { value: "closed", label: "Closed" },
];

const VIEWERS: { value: TestModeViewer; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "leader", label: "Leader" },
  { value: "non-member", label: "Non-member" },
];

export type CampusGroupOption = {
  groupId: number;
  groupName: string;
};

export function TestModePanel({
  state,
  onChange,
  realActiveGroup,
  campusGroups = [],
  writableGroupId = null,
  error = null,
}: {
  state: TestModeState;
  onChange: (next: TestModeState) => void;
  realActiveGroup?: { groupId: number; groupName: string } | null;
  campusGroups?: CampusGroupOption[];
  writableGroupId?: number | null;
  error?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(true);

  const realActiveGroupId = realActiveGroup?.groupId ?? null;
  const isBlocked = writesBlocked(true, state.groupId, realActiveGroupId, writableGroupId);
  const isA2Mismatch =
    writableGroupId !== null && state.groupId === writableGroupId && realActiveGroupId !== writableGroupId;

  return (
    <div className="test-mode-panel" data-section="test-mode-panel" role="region" aria-label="Test mode">
      <div className="test-mode-header">
        <span className="test-mode-badge">Test mode</span>
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>
      {!collapsed && (
        <div className="test-mode-body">
          {error && (
            <p className="test-mode-note test-mode-note-error" role="alert">
              {error}
            </p>
          )}
          {!isBlocked ? (
            <p className="test-mode-note test-mode-note-sandbox">Sandbox group — writes are REAL.</p>
          ) : isA2Mismatch ? (
            <p className="test-mode-note">View-only. Writes disabled (session not in group {writableGroupId}).</p>
          ) : (
            <p className="test-mode-note">View-only. Writes disabled.</p>
          )}

          <label className="test-mode-field">
            <span>Group</span>
            <select
              value={state.groupId !== null ? String(state.groupId) : ""}
              onChange={(event) =>
                onChange({
                  ...state,
                  groupId: event.target.value ? Number(event.target.value) : null,
                })
              }
            >
              <option value="">
                {realActiveGroup ? `${realActiveGroup.groupName} (my group)` : "(No active group)"}
              </option>
              {campusGroups
                .filter((g) => g.groupId !== realActiveGroup?.groupId)
                .map((g) => (
                  <option key={g.groupId} value={String(g.groupId)}>
                    {g.groupName}
                  </option>
                ))}
            </select>
          </label>

          <div className="test-mode-field" role="group" aria-label="Viewer">
            <span>Viewer</span>
            <div className="test-mode-phase-row">
              {VIEWERS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  className={state.viewer === v.value ? "selected" : ""}
                  onClick={() => onChange({ ...state, viewer: v.value })}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="test-mode-field" role="group" aria-label="Phase">
            <span>Phase</span>
            <div className="test-mode-phase-row">
              {PHASES.map((phase) => (
                <button
                  key={phase.value}
                  type="button"
                  className={phase.value === state.phase ? "selected" : ""}
                  onClick={() => onChange({ ...state, phase: phase.value })}
                >
                  {phase.label}
                </button>
              ))}
            </div>
          </div>

          <label className="test-mode-field">
            <span>
              Day {state.day} of {PLAN.length}
            </span>
            <input
              type="range"
              min={1}
              max={PLAN.length}
              value={state.day}
              disabled={state.phase !== "active"}
              onChange={(event) => onChange({ ...state, day: Number(event.target.value) })}
            />
          </label>

          <label className="test-mode-field">
            <span>Completion {state.completionPct}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={state.completionPct}
              onChange={(event) => onChange({ ...state, completionPct: Number(event.target.value) })}
            />
          </label>

          <label className="test-mode-field">
            <span>Group {state.groupPct}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={state.groupPct}
              onChange={(event) => onChange({ ...state, groupPct: Number(event.target.value) })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
