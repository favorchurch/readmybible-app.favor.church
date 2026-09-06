# Plan — Expand test mode: connect group picker + viewer simulation

Gear: **express** (auto-office). One repo, one executor, 3 tasks, one Opus review round (cap 2).
Approved by Rico 2026-09-06.

## GOAL

From the `?test=1` panel, simulate (a) viewing the app as any Connect Group at my
campus, and (b) the viewer's relationship to that group — connect member, leader,
or non-member — with writes still blocked everywhere except one designated
sandbox group.

## Decisions taken at interview

| # | Decision |
|---|---|
| D1 | Group picker lists **all Connect Groups at the reader's campus** via `getCampusGroups`, not just own memberships. Rico explicitly approved this access widening for testing. |
| D2 | Viewer control is 3-way: **member / leader / non-member**. Non-member renders the real no-group path (`SoloScreen`, join-by-code). |
| D3 | **Group 87177 is the writable sandbox.** Writes go through for it. Every other group keeps the existing no-write guarantee. |
| D4 | Sandbox id comes from `TEST_MODE_WRITABLE_GROUP_ID` in `.env.local` (set to `87177`), read server-side and passed as a prop. Unset in Vercel ⇒ the guarantee holds in production. |

## Assumptions

- **A1**: Group 87177 exists and is a GT25 Connect Group at Rico's campus.
  Unverified — the Rock MCP read was blocked by the auto-mode classifier.
  Surface an explicit panel error if its roster comes back empty; never render a
  blank group silently.
- **A2 (hard constraint)**: `checkIn` writes against the **server's** real
  `activeGroup`, not the panel's simulated one. Unblocking writes while
  simulating a group the session isn't in would persist check-ins against the
  *wrong* group. So writes unblock only when `selectedGroupId === writableGroupId`
  **and** the session's real `activeGroup.groupId === writableGroupId`. If the
  session is not actually in 87177 the panel says so and stays blocked.
- **A3**: `needsGroupChoice` returns `GroupPickerScreen` *before* the `activeGroup`
  check in `AppShell`. The `non-member` viewer must bypass that branch too, or it
  never reaches `SoloScreen`.

## Global Constraints

### Blast-radius ceiling

```
Repo: readmybible-app.favor.church, worktree
  /Users/rico/Git/readmybible-app.favor.church/.claude/worktrees/test-mode-group-viewer
Branch: feat/test-mode-group-viewer. BASE: 7d991b0.
ALLOWED:  edits under components/, app/, lib/, tests/, docs/plans/; commits to
          this branch; one push of this branch; one draft PR; the two executor
          PR comments.
FORBIDDEN: any Rock RMS write; any Supabase write outside a local dev run;
          merging; pushing to main; marking the PR ready; removing the plan;
          editing .env files other than adding TEST_MODE_WRITABLE_GROUP_ID to
          .env.local (untracked); changing remote config; touching credentials;
          any change to lib/session.ts role-resolution logic.
Reaching this ceiling is a blocking upline event, not a judgement call.
```

### Non-goals

- No change to real auth/session role resolution.
- No exposure of the panel or the campus list in a production build.
- No new Rock write path. The sandbox unblock reaches existing actions only.
- No merge or deploy. The run stops at a verified branch with a draft PR.

## Dependency graph

Wave 1: T1 (pure logic + panel UI)
Wave 2: T2 (server action + wiring) — depends on T1's `TestModeState` shape
Wave 3: T3 (verification)

Serial. Do not parallelize: T2 imports the types T1 defines.

## Tasks

### T1 — test-mode state, logic, panel UI
`Strategy: SONNET` · `Effort: high`
`Touches: components/test-mode/logic.ts, components/test-mode/TestModePanel.tsx, components/test-mode/index.ts, app/styles/*, tests/test-mode.test.ts`

- `TestModeState`: add `groupId: number | null` (null = my real active group);
  replace `role: "leader" | "member"` with `viewer: "member" | "leader" | "non-member"`.
- `initialTestModeState` defaults `groupId: null`, `viewer: "member"`.
- New pure helper:
  `writesBlocked(active: boolean, selectedGroupId: number | null, realActiveGroupId: number | null, writableGroupId: number | null): boolean`
  Returns `false` (writes allowed) only when **all** hold: `active === true`,
  `writableGroupId !== null`, `selectedGroupId === writableGroupId`,
  `realActiveGroupId === writableGroupId`. Otherwise `true`. When `active` is
  `false` the caller does not consult this at all — but the function must still
  return `false` for `active === false` so `guardWrite` stays a pass-through.
- Panel: a `<select>` for group (own active group first, then campus groups), a
  3-button viewer row, and a note that switches between
  "View-only. Writes disabled." and a visually loud "Sandbox group — writes are REAL."
- Unit tests for the new state shape, the defaults, and the full `writesBlocked`
  truth table including `writableGroupId === null` and the A2 mismatch case.

### T2 — server action + props + AppShell wiring
`Strategy: SONNET` · `Effort: high`
`Touches: app/actions/getTestGroupSnapshot.ts (new), app/page.tsx, components/app-shell.tsx, tests/*`

- New server action `getTestGroupSnapshot({ groupId })`: refuses unless
  `process.env.NODE_ENV !== "production"` **and** the caller is admin scope.
  Returns `{ groupName, campusName, roster, groupStats }`, reusing `getRoster`,
  `getGroupMembersReadingHistory`, `getGroupStats`. Returns an explicit error for
  an unknown or empty group (A1).
- `AppShellProps`: add `campusGroups: {groupId: number; groupName: string}[]`
  (empty array in production) and `testWritableGroupId: number | null`.
- `app/page.tsx`: populate both, non-production only. `campusGroups` from
  `getCampusGroups(session.campusId)` filtered to GT25.
- `AppShell`: fetch the snapshot when `groupId !== null` and override
  `groupName` / `roster` / `groupStats` / `campusName`; derive `isLeader` from
  `viewer`; `viewer === "non-member"` short-circuits to the `SoloScreen` branch
  **before** the `needsGroupChoice` check (A3); every `guardWrite` call takes
  `writesBlocked(...)` instead of `testMode.active`.

### T3 — verification
`Strategy: INLINE` · `Effort: high`
`Touches: none (read-only + evidence capture)`

- `pnpm lint`, `pnpm test`, **`pnpm build`** — the build gate is required by
  AGENTS.md before claiming done. Paste real output.
- Confirm a non-sandbox group shows the blocked note and a check-in attempt
  returns the blocked message.

## Done criteria

- **DC1** Panel offers a campus group select and a 3-way viewer control; state typed and unit-tested.
- **DC2** Non-member renders SoloScreen; leader/member flips leader tools; selecting a group swaps roster, stats, and group name.
- **DC3** Writes blocked for every group except 87177, and only when the session's real active group is also 87177; asserted in `tests/test-mode.test.ts`.
- **DC4** lint + test + build green with real output pasted.
- **DC5** Screenshots of member, leader, and non-member reviewed by the planner (ego-browser, planner-held).

## Routing

- Executor: **agy**, Flash-high (sonnet-tier), one per repo, in a Herdr pane.
- Reviewer: fresh **Claude Opus low**, adversarial, one round (express cap 2).
- Planner holds: DC5 screenshots, and all merge/deploy actions (out of scope).
