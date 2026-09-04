"use client";

import { useState } from "react";

import { PLAN } from "@/lib/plan";
import type { SimulatedPhase, TestModeState } from "./logic";

const PHASES: { value: SimulatedPhase; label: string }[] = [
  { value: "pre-launch", label: "Pre-launch" },
  { value: "active", label: "Active" },
  { value: "grace", label: "Grace" },
  { value: "closed", label: "Closed" },
];

export function TestModePanel({
  state,
  onChange,
}: {
  state: TestModeState;
  onChange: (next: TestModeState) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

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
          <p className="test-mode-note">View-only. Check-in and profile writes are disabled.</p>

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

          <div className="test-mode-field" role="group" aria-label="Role">
            <span>Role</span>
            <div className="test-mode-phase-row">
              <button
                type="button"
                className={state.role === "member" ? "selected" : ""}
                onClick={() => onChange({ ...state, role: "member" })}
              >
                Member
              </button>
              <button
                type="button"
                className={state.role === "leader" ? "selected" : ""}
                onClick={() => onChange({ ...state, role: "leader" })}
              >
                Leader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
