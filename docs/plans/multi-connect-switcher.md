# Multi-Connect Picker Recovery and Switcher

Plan path: `docs/plans/multi-connect-switcher.md`
Tracking issue: [#70](https://github.com/favorchurch/readmybible-app.favor.church/issues/70)
Approved BASE: `e56135e3538f59e625d9761d0aa1c4b7cc42e393`
Worktree: `/Users/rico/Git/readmybible-app.favor.church/.worktrees/multi-connect-switcher`
Branch: `fix/multi-connect-switcher`
Status: DRAFT — pending independent plan review and user approval

## Context

Aeriel Cruz's production login exposes the existing multi-Connect flow: the server resolves multiple active GT25 memberships, defaults the active group to a leader membership, and renders the group picker when no saved choice exists. The picker calls `chooseGroup`, which persists `profiles.active_group_id` after re-checking membership.

The current client handler awaits the action but discards its `{ ok: true } | { ok: false, error }` result and refreshes regardless. It has no `try/catch` for an action rejection, and the picker has no error surface. That makes a failed persistence/auth/session request appear as a generic application error or a refresh that leaves the user stranded. The live Rock read confirmed the reported shape: the person has two active GT25 memberships with leader/member role IDs 24 and 23; no Rock or database write was performed during investigation.

The existing copy already promises, “You can switch later,” but once a choice is saved there is no switcher. The fix therefore covers both recovery from the first selection and a durable switcher for anyone with two or more active memberships, including leaders.

## Global Constraints

- Framework/runtime: Next.js `16.3.4`, React `19.2.8`, TypeScript `5.9.3`, App Router, Server Actions.
- Data authority: active Connect memberships come from Rock; the selected group is persisted in `readmybible.profiles.active_group_id`; server-side membership authorization remains mandatory.
- Preserve current behavior: a saved valid group remains active; a missing/invalid saved group falls back to leader membership then first membership and presents the initial picker; one membership and solo mode are unchanged.
- Preserve current styling vocabulary and 44px interactive-target/accessibility requirements. Reuse the existing `Sheet` modal shell where a modal is needed.
- Protected paths: the primary checkout’s pre-existing dirty paths are `app/styles/avatar.css`, `app/styles/leader.css`, `app/styles/nav.css`, `components/app-shell.tsx`, `components/screens/leader-screen.tsx`, `components/test-mode/logic.ts`, `tests/leader-tools-ui.test.ts`, `components/leader-tools/`, and `scratch/`. The executor worktree is isolated; do not modify or reset those primary-checkout files.
- Bootstrap-only ignored artifacts may be written under `.office/` for the PR body, approval/execution comments, handoff, and review state; they are not implementation scope and must not be committed.
- Validation commands: `pnpm lint`; `pnpm test`; `DATABASE_URL=postgres://postgres:postgres@localhost:5432/readmybible pnpm build`; `git diff --check`.

### Blast-radius ceiling

This run may modify only the repository source, tests, and tracked plan file listed in the numbered tasks below, inside `/Users/rico/Git/readmybible-app.favor.church/.worktrees/multi-connect-switcher` on branch `fix/multi-connect-switcher`. It may read the repository, GitHub metadata, and the production Rock membership records needed to confirm the bug. It must not modify the primary checkout or its protected paths, write to Rock, Auth0, Supabase data, Redis, Vercel configuration, DNS, or any production configuration, run migrations, or send email/SMS/chat/public outreach. The planner is authorized to merge this reviewed PR into GitHub `main`; the normal GitHub-to-Vercel production deployment that the merge triggers is allowed as a consequence, but no direct deploy command or Vercel configuration change is authorized. The executor may perform only the required plan-only commit, named branch push, one draft PR, and the three allowed GitHub bookkeeping comments named below; ready-for-review, merge, and deployment remain planner-held.

## Numbered tasks

### Wave 1 — action and selection contract

#### T1. Make group selection failure-safe and reusable

Strategy: one Codex executor, high; delegation buys isolated implementation plus lower planner writing cost.

Depends on: none.

Touches: `app/actions/chooseGroup.ts`, `components/app-shell.tsx`, `components/screens/group-picker-screen.tsx`.

Behavior:

- Keep the existing Zod validation and server-side membership check.
- Make unexpected session-resolution or persistence failures return a short user-safe error result after logging diagnostic detail server-side; do not expose database/API error text or submitted identifiers in the returned message.
- Change the client selection flow to clear the prior error, show pending state, inspect the action result, refresh only after `{ ok: true }`, and render a recoverable `role="alert"` message for structured failures or rejected calls.
- Use one selection callback contract for the first-choice picker and the later switcher. A failed selection leaves the current group/screen intact and permits retry; a successful selection re-reads the server-authoritative page state.

Verification:

- Unit-test valid membership selection, invalid membership rejection, database persistence failure mapping, and unexpected `getSessionContext()` rejection mapping/logging for `chooseGroup`.
- Exercise the client handler with `{ ok: false }` and a rejected promise; assert no refresh on failure and a visible alert with retry-capable controls.

Milestone: M1.

Out of scope: changing the profile schema, changing membership roles, changing the initial default-group algorithm, or changing any server action other than `chooseGroup`.

### Wave 2 — multi-Connect switcher UX

#### T2. Add an always-discoverable switcher for multi-membership users

Strategy: same Codex executor, high; dependent on the stable T1 result contract and buys one coherent cross-screen UX.

Depends on: T1.

Touches: `components/connect-switcher.tsx` (new), `components/screens/header.tsx`, `components/app-shell.tsx`, `lib/session.ts`, `components/screens/today-screen.tsx`, `components/screens/connect-screen.tsx`, `components/screens/rewards-screen.tsx`, `components/screens/progress-screen.tsx`, `components/screens/leader-screen.tsx`, `app/styles/base.css`, `app/styles/onboarding.css`.

Behavior:

- Add a shared `ConnectSwitcher` surface, opened from the shared header, only when `memberships.length > 1`.
- Show every currently authorized membership with group name and role context; mark the server-provided `activeGroup` as selected. Do not invent campus labels from numeric IDs.
- Selecting another group invokes the same guarded server action, displays pending/error state, closes only after success, and refreshes the route so roster, stats, group name, campus, leader tools, and check-in destination all come from the selected server state.
- Keep the initial `GroupPickerScreen` focused on the required first choice, while reusing the same option semantics and accessible error treatment.
- Keep leaders’ switcher behavior safe: leader tools and join codes must follow the selected group after refresh. Derive the `isLeader` navigation flag from the active membership, not from any membership, so a person who leads one group but is only a member of another sees leader tools only while the leader group is selected.
- Map existing role IDs through the existing Rock constants: role 24 displays “Leader,” role 81 displays “Assistant leader,” and role 23 displays “Member.” The switcher must not use unexplained numeric labels.
- In `?test=1`, keep the switcher visible for multi-membership fixtures so the surface is testable, but route its selection through the existing write guard. A blocked selection shows the existing “Test mode: writes are disabled.” message, does not call the real action, and does not refresh or change the simulated/current group.
- Preserve mobile layout, keyboard/focus behavior, Escape/backdrop dismissal through `Sheet`, reduced-motion behavior, and the project’s 44px target floor.

Verification:

- Add UI coverage for hidden-on-one-membership, visible-on-two-memberships, active selection, Leader/Assistant leader/Member labels, pending/failed selection, and successful refresh callback.
- Add a wiring assertion that the selected group ID reaches the existing server action and that no selection is possible for an unauthorized membership.
- Add an AppShell test for the test-mode switcher: the surface is visible, `chooseGroup` is not called, the blocked alert appears, and refresh is not called.
- Run the full validation commands and inspect the rendered switcher markup for both leader and non-leader cases.

Milestone: M2.

Out of scope: cross-campus discovery for normal users, changing Rock group membership, changing leader permissions, replacing the bottom navigation, or adding a separate group-management backend.

### Wave 3 — integrated regression coverage

#### T3. Lock the end-to-end state contract

Strategy: same Codex executor, high; dependent on both implementation waves and buys regression protection at the exact reported boundary.

Depends on: T1, T2.

Touches: `tests/choose-group.test.ts` (new), `tests/connect-switcher-ui.test.ts` (new or nearest existing UI test file), `tests/session-context.test.ts` (new), `tests/test-mode-bindings.test.ts` only if shared action wiring requires its existing mocks to be updated.

Behavior:

- Cover the reported sequence: multiple memberships → initial picker → select group → successful persisted choice → refreshed active group.
- Cover the follow-up sequence: active group already persisted → open shared switcher → select a different still-authorized group → refreshed group-specific data.
- Cover active-role navigation: a leader membership selected shows leader tools; a member-only active membership hides them even when another membership is led by the same person.
- Cover negative paths: server action error, thrown action, stale/unauthorized group ID, session-resolution rejection, database rejection, rapid duplicate selection, and test-mode write guard remaining intact.

Verification:

- `pnpm lint`
- `pnpm test`
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/readmybible pnpm build`
- `git diff --check`
- Review the test output for the new failure and switcher cases; a successful process exit without the named assertions is insufficient evidence.

Milestone: M2.

Out of scope: production browser login as a real person, changing live data to manufacture a fixture, and deployment-time smoke testing.

## Dependency graph

```text
Wave 1: T1 (action + initial picker failure handling)
            |
Wave 2: T2 (shared switcher + header wiring)
            |
Wave 3: T3 (integrated regression coverage)
```

There is one implementation writer in one worktree. Dispatch form is `herdr` because `HERDR_ENV=1`; no tasks are parallelized because the client action contract and shared header wiring are dependent and overlapping.

## Milestones

### M1 — safe selection contract

T1 is committed with action/client failure handling green, while the first-choice picker remains usable for successful selections.

Done criteria: T1 verification passes; `pnpm lint`; `pnpm test`; `git diff --check`.

### M2 — shippable multi-Connect experience

T2 and T3 are committed as one shippable range. Landing T2 without T3 leaves the reported flow under-tested, so they are one milestone.

Done criteria: all T1–T3 verification passes; build passes with the placeholder database URL; no production or external mutation occurred.

## named_actions

- Executor bootstrap — after explicit plan approval, in the run worktree only: `git add docs/plans/multi-connect-switcher.md && git commit -m "docs(plan): multi-connect switcher"`; precondition: only the approved plan is newly staged; revert target: the pre-bootstrap `BASE` SHA; read-back: `git show --stat --oneline -1` and `git status --short`.
- Executor bootstrap push — `git push --set-upstream origin fix/multi-connect-switcher`; precondition: plan-only commit exists and staged-path audit names only the plan; revert target: delete the unmerged branch/close the draft PR if the bootstrap is abandoned; read-back: `git ls-remote --heads origin fix/multi-connect-switcher`.
- Executor bootstrap PR body artifact — after the plan-only commit, write ignored `.office/multi-connect-switcher-pr.md` containing the exact title/scope, `Tracking issue: #70`, and `[docs/plans/multi-connect-switcher.md](https://github.com/favorchurch/readmybible-app.favor.church/blob/<full-plan-commit-sha>/docs/plans/multi-connect-switcher.md)`; precondition: full SHA is read from `git rev-parse HEAD` and the file is outside the staged path audit; revert target: remove the ignored artifact; read-back: `test -s .office/multi-connect-switcher-pr.md && rg -q '#70|blob/[0-9a-f]{40}/docs/plans/multi-connect-switcher\.md' .office/multi-connect-switcher-pr.md`.
- Executor bootstrap draft PR — `gh pr create --draft --base main --head fix/multi-connect-switcher --title "fix: recover multi-Connect selection and add switcher" --body-file .office/multi-connect-switcher-pr.md`; precondition: pushed plan-only commit and the body-artifact read-back passes with the immutable plan blob deeplink anchored to that commit plus `Tracking issue: #70`; revert target: planner closes the draft PR without merging; read-back: `gh pr view --json number,state,isDraft,headRefName,body`.
- Allowed GitHub bookkeeping comments — executor may run the exact `gh pr comment <pr-url> --body-file <approved-plan-execution-comment>`, `gh pr comment <pr-url> --body-file <first-completion-comment>`, and planner may run the final approved-review summary comment; precondition: the named PR exists and the comment content is limited to office bookkeeping; revert target: none (comments are durable history); read-back: `gh pr view <pr-url> --json comments`.
- Planner closeout plan removal — in the run worktree only: `git rm docs/plans/multi-connect-switcher.md && git commit -m "docs: remove approved multi-connect plan"`; precondition: final reviewer is `APPROVED`, all gates are green, and the diff contains only intended implementation/tests plus the tracked plan; revert target: the preceding implementation commit range; read-back: `git show --stat --oneline -1` and `git status --short`.
- Planner closeout push — `git push origin fix/multi-connect-switcher`; precondition: the plan-removal commit is the branch tip and its staged-path audit contains only the plan deletion; revert target: branch remains available for recovery; read-back: `git ls-remote origin refs/heads/fix/multi-connect-switcher` and `gh pr view <pr-url> --json headRefOid`.
- Planner ready-for-review — `gh pr ready <pr-url>`; precondition: final reviewer `APPROVED`, plan-removal commit pushed, and all required PR checks green; revert target: planner may leave the PR open without merging; read-back: `gh pr view <pr-url> --json isDraft,state`.
- Planner merge to main — `gh pr merge <pr-url> --merge --delete-branch=false`; target environment: GitHub `main` and its configured production Vercel integration; precondition: deploy-guardian pre-flight confirms `https://readmybible-app.favor.church/` is production, required build/env checks are known, the final PR is ready, and the user-authorized merge is the only remaining mutation; revert target: GitHub revert commit for the merge; read-back: `gh pr view <pr-url> --json state,mergedAt,mergeCommit,baseRefName` plus `git fetch origin main && git show --no-patch origin/main`.
- Post-merge production smoke — after the merge-triggered Vercel deployment completes, verify `https://readmybible-app.favor.church/` and the affected authenticated flow with the deploy-guardian live read-back; precondition: deployment URL/commit is reported by the GitHub/Vercel integration; revert target: the named GitHub revert commit; read-back: final HTTP/rendered behavior and runtime error check, with any unexercised authenticated principal scope explicitly reported.
- No Rock, Auth0, Supabase, Redis, DNS, migration, direct Vercel configuration, or unrelated outbound communication action is named for this run.

## Out of scope

- Directly deploying or promoting a Vercel artifact, changing Vercel configuration, or deploying any commit other than the approved PR merge.
- Changing Rock memberships, group structure, roles, group names, or leader permissions.
- Changing Auth0 post-login claims or login configuration.
- Moving reading history between groups; past check-ins remain attached to their recorded group.
- Adding a second reading plan, cross-campus group discovery for normal users, reminders, messaging, or individual rankings.
- Reworking the existing test-mode panel or its production exposure; preserve its current guard behavior.
- Changing profile/avatar/translation persistence except where the existing profile row is used to store the selected `activeGroupId`.
