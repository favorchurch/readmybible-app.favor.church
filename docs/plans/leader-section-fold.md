# Plan v1 — leader/section fold

Run `461556f6-b060-4439-8c8e-c0162985ae6a` · base `ef393bd` · playbook Restructure
· gear `direct` (independent code review forced by access-control risk; browser
verification forced by acceptance criteria) · size class **M**.

## model_assignments

| role | invocation id | model_id | effort | harness | inline/routed | rationale |
|---|---|---|---|---|---|---|
| orchestrator | `claude-opus-5[1m]` | claude-opus-5 | high | claude-code 2.1.270 | inline | entry session; `roles.orchestrator.router_selects: false` |
| planner | `claude-opus-5[1m]` | claude-opus-5 | high | claude-code 2.1.270 | inline | gear `direct` sets `dedicated_planner: false`; no separate planner funded |
| executor | `claude-sonnet-5` | claude-sonnet-5 | medium | claude-cli 2.1.270 | routed | decision `sha256:0cf55d06…`; agy hard-excluded (Gemini pool at 0%), codex rejected at stage 2 (adapter not proven; 5-hour quota also at 3%, below the 20% reserve); claude-cli is the only proven adapter with quota headroom (63% weekly) and carries a prior successful executor dispatch |
| code_reviewer | `claude-opus-5` | claude-opus-5 | low | claude-cli 2.1.270 | routed | decision `sha256:cea1b230…`; `luna@xhigh` seed unavailable (codex quota + trust), Opus low is the standing local convention for code review |
| browser_verifier | `claude-opus-5[1m]` | claude-opus-5 | high | claude-code 2.1.270 | inline | ego-browser screenshots reviewed by the orchestrator per repo policy |

## Evidence reconciled before planning

- `components/app-shell.tsx:428` — `effectiveHasGroup` short-circuits to
  `SoloScreen` on `!props.activeGroup`, ignoring `isAdminScope`. **Root cause of
  the reported symptom.**
- `components/app-shell.tsx:262` — `activeTab = isLeader || tab !== "leader" ? tab : "today"`
  and `BottomNav isLeader={isLeader}` (L519): the Leader tab is hidden from
  anyone who isn't a Connect Group leader, so a section head has no tab to land on.
- `lib/session.ts:114` — `isAdminScope` already exists on the session
  (`ADMIN_PERSON_IDS` ∪ non-empty `sectionMemberships`). No new access logic needed.
- `app/admin/page.tsx:26-166` — owns scope resolution, test-mode simulation bar,
  `loadSectionSubtree` + `loadAdminStats`, `HierarchyChart`, `SectionTree`, CSV link.
- `lib/rock/hierarchy.ts:257` + `lib/admin/stats.ts:225` — the section loaders are
  slow enough that `app/admin/loading.tsx` exists. They must stay behind a
  Suspense boundary; they must not block the home render.
- `app/actions/getOrCreateJoinCode.ts` — authorizes off `session.activeGroup.isLeader`
  and inserts into the app's own Postgres `join_codes`. It cannot serve a
  *simulated* group, and `guardWrite` (`components/app-shell.tsx:128`) blocks it
  under test mode. Hence the read-only lookup in T3.
- Local dispatch history (`runs.db`) shows `claude-cli@2.1.270/claude-sonnet-5@medium`
  succeeding as executor and reviewer on this repo.

## Protected paths

`lib/admin/access.ts` scope resolution (`resolveAdminScope`) is **read-only for
this run** — it may be imported and re-exported, never loosened. Any diff that
changes who qualifies for a scope is a hard stop.
`app/admin/export.csv/route.ts` must keep working byte-for-byte.
`intent/SPEC.md` and `intent/FLOWS.md` are updated, never contradicted silently.

## Pinned interfaces (Task 0 — serial, lands before any wave)

Executors receive these verbatim; none may invent a variant.

```ts
// components/sections/section-dashboard.tsx  (server component)
export type SectionDashboardProps = { scope: AdminScope; simulatedScope?: "global" | "cluster" | "region" };
export default async function SectionDashboard(props: SectionDashboardProps): Promise<JSX.Element>;

// components/app-shell.tsx — AppShellProps additions
sectionSlot: React.ReactNode | null;   // null when the viewer has no admin scope
isAdminScope: boolean;                 // already present, now also drives tab + shell gating

// components/screens/leader-screen.tsx — LeaderScreenProps additions
sectionSlot?: React.ReactNode;         // rendered stacked BELOW the group view
hasGroupView: boolean;                 // false ⇒ skip group roster/cheer/join-code blocks entirely

// app/actions/getJoinCodeForGroup.ts   (new, READ-ONLY, never inserts)
export async function getJoinCodeForGroup(groupId: number):
  Promise<{ ok: true; code: string | null } | { ok: false; error: string }>;
// authorized when: resolveAdminScope(session) !== null, OR the caller leads groupId.

// components/test-mode/TestModeEntry.tsx  (new)
export function TestModeEntry(props: { visible: boolean }): JSX.Element | null;
```

## Wave 1 — three parallel executors, disjoint `Touches:`

### T1 — access gating (unblocks the app for section heads)
Depends on: Task 0.
Touches: `components/app-shell.tsx`, `components/screens/bottom-nav.tsx`.
Outcome:
- `effectiveHasGroup` no longer decides the shell alone. New rule: render
  `SoloScreen` only when `!effectiveHasGroup && !isAdminScope`. A group-less
  admin-scope viewer reaches the full shell.
- Leader tab visible when `isLeader || isAdminScope`; `activeTab` fallback at
  L262 updated to match, and `BottomNav isLeader={isLeader || isAdminScope}`.
- Group-dependent panels (`connect` tab roster, group stats, cheer, join code)
  render an empty/omitted state rather than crashing when `activeGroup` is null.
  Pass `hasGroupView={!!activeGroup}` down.
- Mounts `<TestModeEntry visible={isAdminScope} />` and `sectionSlot`.
Known-bad test: a session with `activeGroup: null, isAdminScope: false` must
still land on `SoloScreen`. This test must fail if T1 over-widens.

### T2 — move the admin dashboard into shared components; `/admin` redirects
Depends on: Task 0.
Touches: `app/admin/page.tsx`, `app/admin/HierarchyChart.tsx`,
`app/admin/SectionTree.tsx`, `app/admin/admin.css`, `app/admin/loading.tsx`,
`components/sections/*`.
Outcome:
- `HierarchyChart`, `SectionTree`, the scope-role indicator, the CSV link and the
  stats loading move to `components/sections/`, behind `SectionDashboard`.
- `app/admin/page.tsx` becomes `redirect("/?tab=leader")` — the existing URL
  bootstrap at `components/app-shell.tsx:193-199` already honours `?tab=leader`.
- `app/admin/export.csv/route.ts` keeps its imports working unchanged.
- The test-mode scope simulation bar currently inside `app/admin/page.tsx` moves
  into `SectionDashboard` behind `simulatedScope`.

### T3 — read-only join code + test-mode panel
Depends on: Task 0.
Touches: `app/actions/getJoinCodeForGroup.ts` (new), `components/test-mode/*`.
Outcome:
- `getJoinCodeForGroup` implemented exactly as pinned: selects from `join_codes`
  by group id, returns `code: null` when absent, **never inserts**.
- `TestModePanel` shows the simulated group's join code, or "No join code yet"
  when null. Writes stay blocked by `guardWrite`.
- `TestModeEntry` is a visible control (not URL-only) rendering for
  `isAdminScope` viewers in production as well as dev.

## Wave 2 — one executor, serial

### T4 — stack the section view into the Leader page
Depends on: T1, T2, T3.
Touches: `components/home-data.tsx`, `components/app-shell.tsx`,
`components/screens/leader-screen.tsx`, `app/page.tsx` if needed.
Outcome:
- `HomeData` resolves `resolveAdminScope(session)`; when non-null it builds
  `sectionSlot = <Suspense fallback={<SectionSkeleton/>}><SectionDashboard scope={scope}/></Suspense>`
  and passes it into `AppShell`. When null, `sectionSlot` is `null`.
  The section loaders stay off the critical path of the home render.
- `LeaderScreen` renders group view first (when `hasGroupView`), then
  `sectionSlot` below it. Group-less head sees section content only.

## Wave 3 — verification and review

### T5 — tests (orchestrator, inline)
Touches: `tests/*`. Cases per done_criteria 2, including the known-bad case in T1.

### T6 — independent code review
`claude-cli@2.1.270/claude-opus-5@low`, reviewing the full branch diff. No
executor reviews its own wave. Blocking findings return to a wave-2 executor.

### T7 — browser verification
ego-browser, four screenshots per done_criteria 5, reviewed by the orchestrator.

## Validation strategy

`pnpm lint` after each wave; `pnpm vitest run` after waves 1 and 2;
`pnpm build` once before the PR (repo build gate — lint and typecheck do not
catch Next.js route/runtime failures). `pnpm install` runs in the new worktree,
never a copied or symlinked `node_modules`.

## Rollback

`git worktree remove .worktrees/leader-section-fold && git branch -D feat/leader-section-fold`.
Nothing lands on `main` in this run.
