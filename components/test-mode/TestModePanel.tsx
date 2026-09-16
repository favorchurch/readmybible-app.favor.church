"use client";

import React, { Suspense, use, useEffect, useMemo, useState } from "react";

import { getJoinCodeForGroup } from "@/app/actions/getJoinCodeForGroup";
import { PLAN } from "@/lib/plan";
import {
  STAGE_PRESETS,
  TEST_MODE_CAMPUSES,
  TEST_MODE_SCENARIOS,
  writesBlocked,
  type SimulatedPhase,
  type TestModeRole,
  type TestModeScenario,
  type TestModeState,
} from "./logic";

const PHASES: { value: SimulatedPhase; label: string }[] = [
  { value: "pre-launch", label: "Pre-launch" },
  { value: "active", label: "Active" },
  { value: "grace", label: "Grace" },
  { value: "closed", label: "Closed" },
];

/** Ordered narrowest-to-widest, so the row reads like the org chart. */
const ROLES: { value: TestModeRole; label: string }[] = [
  { value: "new", label: "New" },
  { value: "member", label: "Member" },
  { value: "connect-leader", label: "Connect Leader" },
  { value: "regional", label: "Regional" },
  { value: "cluster", label: "Cluster" },
  { value: "department", label: "Department" },
];

function scenarioFromValue(value: string): TestModeScenario | null {
  return TEST_MODE_SCENARIOS.find((scenario) => scenario.value === value)?.value ?? null;
}

export type CampusGroupOption = {
  groupId: number;
  groupName: string;
};

/**
 * The group picker, split out so it can sit behind its own Suspense boundary.
 * Everything above it in the panel (role, campus, phase, the sliders) renders
 * and is usable while the org-wide group list is still arriving.
 *
 * Reads `promise` with `use()` when the server streamed one, and falls back to
 * the already-resolved `groups` array otherwise -- which is how every test and
 * every non-streaming caller constructs it.
 */
function GroupPicker({
  groups,
  promise,
  realActiveGroup,
  realActiveGroupId,
  campus,
  selectedGroupId,
  onSelect,
}: {
  groups: CampusGroupOption[];
  promise?: Promise<CampusGroupOption[]>;
  realActiveGroup?: { groupId: number; groupName: string } | null;
  realActiveGroupId: number | null;
  campus: TestModeState["campus"];
  selectedGroupId: number | null;
  onSelect: (groupId: number | null) => void;
}) {
  const safePromise = useMemo(
    () => promise?.then((value) => ({ value }), (error: unknown) => ({ error })),
    [promise],
  );
  const result = safePromise ? use(safePromise) : { value: groups };
  if ("error" in result) throw result.error;
  const resolved = result.value;
  const [groupFilter, setGroupFilter] = useState("");

  // The real active group is offered only as the "(my group)" option, so it is
  // filtered out here to avoid listing it twice. `writesBlocked` depends on that
  // -- a null groupId is the ONLY way to select it.
  const selectableGroups = useMemo(
    () => resolved.filter((g) => g.groupId !== realActiveGroupId),
    [resolved, realActiveGroupId],
  );

  const visibleGroups = useMemo(() => {
    const campusName = TEST_MODE_CAMPUSES.find((c) => c.id === campus)?.name ?? "";
    // `home-data.tsx` labels each option "Name — Campus" precisely because group
    // names repeat across campuses. A group whose label carries NO recognised
    // campus suffix cannot be attributed to a campus, so it is always shown
    // rather than silently hidden from every campus.
    const knownCampusNames = TEST_MODE_CAMPUSES.map((c) => c.name);
    const byCampus = selectableGroups.filter((g) => {
      const suffix = knownCampusNames.find((name) => g.groupName.endsWith(`— ${name}`));
      return suffix === undefined || suffix === campusName;
    });
    const needle = groupFilter.trim().toLowerCase();
    if (needle === "") return byCampus;
    return byCampus.filter((g) => g.groupName.toLowerCase().includes(needle));
  }, [selectableGroups, campus, groupFilter]);

  return (
    <label className="test-mode-field">
      <span>
        Group
        {visibleGroups.length !== selectableGroups.length
          ? ` (${visibleGroups.length} of ${selectableGroups.length})`
          : selectableGroups.length > 0
            ? ` (${selectableGroups.length})`
            : ""}
      </span>
      {/*
        A plain <select> of several hundred Manila groups is unusable, so the
        list is narrowed twice before it is rendered: by the Campus pills above,
        and by this free-text filter. The filter is pure client-side over an
        already-loaded array -- no fetch, so it is instant.
      */}
      <input
        type="search"
        className="test-mode-group-filter"
        placeholder="Filter groups…"
        aria-label="Filter groups"
        value={groupFilter}
        onChange={(event) => setGroupFilter(event.target.value)}
      />
      <select
        aria-label="Group"
        value={selectedGroupId !== null ? String(selectedGroupId) : ""}
        onChange={(event) => onSelect(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">
          {realActiveGroup ? `${realActiveGroup.groupName} (my group)` : "(No active group)"}
        </option>
        {visibleGroups.map((g) => (
          <option key={g.groupId} value={String(g.groupId)}>
            {g.groupName}
          </option>
        ))}
      </select>
      {selectableGroups.length > 0 && visibleGroups.length === 0 && (
        <span className="test-mode-note">No group matches that filter.</span>
      )}
    </label>
  );
}

/** Keeps the panel's layout stable while the group list streams in. */
function GroupPickerSkeleton() {
  return (
    // A div, not a label: there is no control to associate one with yet.
    <div className="test-mode-field" aria-busy="true">
      <span>Group</span>
      <div className="test-mode-skeleton" data-testid="test-mode-group-skeleton" />
    </div>
  );
}

class GroupPickerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="test-mode-note test-mode-note-error" role="alert">
          Group list is unavailable right now. You can still use the other test controls.
        </p>
      );
    }
    return this.props.children;
  }
}

function GroupPickerFailure({ error }: { error: Error }): never {
  throw error;
}

export function TestModePanel({
  state,
  onChange,
  realActiveGroup,
  campusGroups = [],
  campusGroupsPromise,
  writableGroupId = null,
  loading = false,
  error = null,
}: {
  state: TestModeState;
  onChange: (next: TestModeState) => void;
  realActiveGroup?: { groupId: number; groupName: string } | null;
  campusGroups?: CampusGroupOption[];
  campusGroupsPromise?: Promise<CampusGroupOption[]>;
  writableGroupId?: number | null;
  loading?: boolean;
  error?: string | null;
}) {
  // Expanded by default: ?test=1 is an explicit opt-in, so the tester has
  // already asked for these controls. The Show/Hide toggle stays for
  // getting them out of the way mid-session.
  const [collapsed, setCollapsed] = useState(false);
  // Separate from `collapsed` on purpose. `collapsed` is the desktop Show/Hide
  // toggle for the body; `mobileOpen` is whether the mobile sheet is up at all.
  // Below the 759px breakpoint the CSS hides `.test-mode-panel` unless it also
  // has `--open`, and hides `.test-mode-fab` above it -- so one state each,
  // with no `matchMedia` read during render to desync hydration.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null | undefined>(undefined);
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [groupPickerError, setGroupPickerError] = useState<Error | null>(null);
  const realActiveGroupId = realActiveGroup?.groupId ?? null;
  const isSynthetic = state.scenario !== "real";
  const isBlocked = isSynthetic || writesBlocked(true, state.groupId, realActiveGroupId, writableGroupId);
  const isA2Mismatch =
    !isSynthetic && writableGroupId !== null && state.groupId === writableGroupId && realActiveGroupId !== writableGroupId;
  const simulatedGroupId = !isSynthetic ? (state.groupId ?? realActiveGroupId) : null;

  useEffect(() => {
    if (simulatedGroupId === null) return;
    let cancelled = false;
    getJoinCodeForGroup(simulatedGroupId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setJoinCode(result.code);
        setJoinCodeError(null);
      } else {
        setJoinCode(null);
        setJoinCodeError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [simulatedGroupId]);

  useEffect(() => {
    if (!campusGroupsPromise) return;
    let cancelled = false;
    campusGroupsPromise.catch((error: unknown) => {
      if (!cancelled) {
        setGroupPickerError(error instanceof Error ? error : new Error("Group list unavailable"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campusGroupsPromise]);

  return (
    <>
      {/*
        Mobile entry point. A 220px panel docked to the right covers most of a
        phone screen, so on mobile the panel is hidden until this opens it;
        `.test-mode-fab` is display:none above the breakpoint. It reuses the
        same `collapsed` state as the desktop Show/Hide button so there is only
        one notion of "is the panel open".
      */}
      <button
        type="button"
        className="test-mode-fab"
        data-testid="test-mode-fab"
        aria-expanded={mobileOpen}
        aria-controls="test-mode-panel"
        aria-label={mobileOpen ? "Close test mode controls" : "Open test mode controls"}
        onClick={() => setMobileOpen((value) => !value)}
      >
        {mobileOpen ? "Close" : "Test"}
      </button>
      <div
        id="test-mode-panel"
        className={`test-mode-panel${mobileOpen ? " test-mode-panel--open" : ""}`}
        data-section="test-mode-panel"
        role="region"
        aria-label="Test mode"
      >
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

          <div className="test-mode-field" role="group" aria-label="Scenario">
            <span>Scenario</span>
            <select
              aria-label="Scenario"
              value={state.scenario}
              onChange={(event) => {
                const scenario = scenarioFromValue(event.target.value);
                if (scenario === null) return;
                const definition = TEST_MODE_SCENARIOS.find((candidate) => candidate.value === scenario);
                onChange({
                  ...state,
                  scenario,
                  groupId: null,
                  role: definition?.defaultRole ?? state.role,
                });
              }}
            >
              {TEST_MODE_SCENARIOS.map((scenario) => (
                <option key={scenario.value} value={scenario.value}>
                  {scenario.label}
                </option>
              ))}
            </select>
            <span className="test-mode-note">
              {TEST_MODE_SCENARIOS.find((scenario) => scenario.value === state.scenario)?.description}
            </span>
          </div>

          {isSynthetic ? (
            <p className="test-mode-note test-mode-synthetic-note" data-testid="test-mode-synthetic-note" role="status">
              Synthetic scenario — no real group, roster, or scope data is loaded.
            </p>
          ) : (
            <GroupPickerErrorBoundary key={campusGroupsPromise ? "streamed" : "resolved"}>
              {groupPickerError ? (
                <GroupPickerFailure error={groupPickerError} />
              ) : (
                <Suspense fallback={<GroupPickerSkeleton />}>
                  <GroupPicker
                    groups={campusGroups}
                    promise={campusGroupsPromise}
                    realActiveGroup={realActiveGroup}
                    realActiveGroupId={realActiveGroupId}
                    campus={state.campus}
                    selectedGroupId={state.groupId}
                    onSelect={(groupId) => onChange({ ...state, scenario: "real", groupId })}
                  />
                </Suspense>
              )}
            </GroupPickerErrorBoundary>
          )}

          {loading && (
            <p className="test-mode-note" role="status" aria-busy="true" data-testid="test-mode-snapshot-loading">
              Loading selected group…
            </p>
          )}

          {simulatedGroupId !== null && (
            <p className="test-mode-note test-mode-join-code" data-testid="test-mode-join-code">
              {joinCode === undefined
                ? "Loading join code…"
                : joinCode !== null
                  ? `Join code: ${joinCode}`
                  : joinCodeError ?? "No join code yet"}
            </p>
          )}

          <div className="test-mode-field" role="group" aria-label="Campus">
            <span>Campus</span>
            <div className="test-mode-phase-row">
              {TEST_MODE_CAMPUSES.map((campus) => (
                <button
                  key={campus.id}
                  type="button"
                  title={campus.name}
                  aria-pressed={state.campus === campus.id}
                  className={state.campus === campus.id ? "selected" : ""}
                  // Changing campus clears the simulated group: a group from the
                  // old campus is not in the new campus's list, and leaving it
                  // selected would show a Manila group under a Seoul scope.
                  onClick={() => onChange({ ...state, campus: campus.id, groupId: null })}
                >
                  {campus.code}
                </button>
              ))}
            </div>
          </div>

          <div className="test-mode-field" role="group" aria-label="Role">
            <span>Role</span>
            <div className="test-mode-phase-row">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  aria-pressed={state.role === role.value}
                  className={state.role === role.value ? "selected" : ""}
                  onClick={() => onChange({ ...state, role: role.value })}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="test-mode-field" role="group" aria-label="House stage">
            <span>House</span>
            <div className="test-mode-phase-row">
              {STAGE_PRESETS.map((preset) => (
                <button
                  key={preset.stage}
                  type="button"
                  // Plain click lands mid-band; alt/option-click sits exactly on
                  // the threshold, which is where `stageTransition` fires.
                  title={`${preset.pct}% — alt-click for the ${preset.threshold}% threshold`}
                  aria-pressed={state.groupPct === preset.pct}
                  className={state.groupPct === preset.pct ? "selected" : ""}
                  onClick={(event) =>
                    onChange({ ...state, groupPct: event.altKey ? preset.threshold : preset.pct })
                  }
                >
                  {preset.stage}
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
    </>
  );
}
