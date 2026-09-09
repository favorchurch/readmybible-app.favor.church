# Issue #79 — Realign the top bar brand and profile controls

- **Plan path:** `docs/plans/issue-79-topbar.md`
- **Tracking issue:** [#79](https://github.com/favorchurch/readmybible-app.favor.church/issues/79)
- **Repository:** `favorchurch/readmybible-app.favor.church`
- **Approved BASE:** `f8f90cd902dac1253f18217db739a95c68ec92a0`
- **Branch/worktree:** `fix/issue-79-topbar` / `/Users/favormac2/Git/readmybible-app.favor.church/.worktrees/issue-79-topbar`
- **Plan approval:** auto-approved by the user request to run `/luna-office` end to end and merge the PR to `main`, subject to the mandatory independent plan and implementation review gates.

## Context

Issue #79 reports that the shared Read My Bible brand sits lower than the profile block (`Hey, <name>!`, `Edit profile`, and avatar) in the top bar. The current shared CSS gives `.topbar`, `.header-actions`, `.header-person`, and the Connect switcher 44px-centered row sizing, while `.brand` retains `min-height: 44px` but uses `align-items: end`, placing its visible text at the bottom of its touch target. The shared `Header` is used by Today, Connect, Progress, Rewards, and Leader screens, so the correction belongs in the shared header styles.

## Global Constraints

- Change only the shared top-bar alignment and its regression coverage; do not alter profile behavior, avatar data, Connect group behavior, routing, or screen-specific layout.
- Preserve the `.brand` link, its existing 44px minimum touch target, typography, colors, and responsive behavior.
- Preserve the `.topbar` and `.header-actions` flex layout, the `.header-person` 44px touch floor, and the Connect switcher's ability to share the row.
- Protected paths: all pre-existing dirty paths (none observed at plan time), credentials, `.env*`, deployment/configuration files, database/schema/migration files, and unrelated screen styles.
- Environment: local repository and GitHub PR only; no production reads/writes, no deployment, no migrations, no external service configuration, and no credential access.
- Validation commands: `npm exec -- vitest run tests/header-ui.test.ts tests/css-rules.test.ts`, `npm exec -- eslint components/screens/header.tsx app/styles/base.css tests/css-rules.test.ts`, `npm test`, `npm run lint`, and `npm run build`.

### Blast-radius ceiling

The run may modify only `app/styles/base.css`, `tests/css-rules.test.ts`, and the tracked plan file `docs/plans/issue-79-topbar.md` in the named worktree; it may create local ignored run-state files under the worktree scratch area. It may read the repository and GitHub issue/PR metadata, push the named feature branch, create one draft PR, and post only the required PR bookkeeping comments. It may not modify `main` directly, force-push, deploy, migrate, change remote/DNS/configuration, access or create credentials, write production data, send email/chat/public outreach, or touch any path outside the named files and ignored run-state.

## Acceptance criteria and verification

1. The shared brand and profile block are vertically centered as one top-bar row at desktop/tablet widths. Verify `.brand` uses centered alignment inside its preserved 44px target and `.topbar`/profile controls retain centered row alignment; inspect the final diff and run the CSS regression test.
2. Avatar, greeting, and `Edit profile` remain one profile control. Verify `tests/header-ui.test.ts` passes unchanged and inspect the existing `.header-person`/avatar markup and CSS.
3. The Connect switcher still fits in the same header row. Verify the existing Connect switcher/header tests pass and inspect the unchanged `.header-actions` and `.connect-switcher-trigger` rules.
4. Mobile/narrow layouts do not regress or overflow. Verify responsive CSS remains unchanged except the shared brand alignment declaration, run the full test/lint/build gates, and confirm no percentage max-width or wrapping regression is introduced.
5. All screens using `Header` inherit the shared fix. Verify all eight JSX `Header` call sites across five screens (Today has four) remain unchanged and the final diff contains no screen-specific alignment patch.

## Numbered tasks

### Task 1 — Center shared brand contents and add a regression guard

- **Depends on:** None.
- **Touches:** `app/styles/base.css`, `tests/css-rules.test.ts`.
- **Strategy:** `gpt-5.6-luna` executor, implementation-first; this is a low-blast-radius CSS change with a focused structural regression test.
- **Work:** Change only `.brand`'s cross-axis alignment from `end` to `center`; retain `min-height: 44px`, display, typography, and all other declarations. Add a focused CSS-rules assertion that the live `.brand` rule contains `align-items: center` and does not use `align-items: end`. Run the new assertion against BASE first and record its expected failure, then implement and run it green.
- **Verification:** `npm exec -- vitest run tests/header-ui.test.ts tests/connect-switcher-ui.test.ts tests/css-rules.test.ts`; `npm exec -- eslint components/screens/header.tsx app/styles/base.css tests/css-rules.test.ts`; `npm test`; `npm run lint`; `npm run build`; inspect `git diff BASE..HEAD` for scope containment.

## Dependency graph and waves

- **Wave 1:** Task 1 (`Depends on: None`; its implementation and regression test are coupled and touch disjoint concerns within the same shared CSS/test task, so they remain one task and one milestone).

## Milestones

- **M1 — Shared alignment correction shippable:** the plan-only bootstrap commit plus Task 1 implementation/test commits; focused tests, full tests, lint, build, and scope inspection are green.

## Named actions

1. **Executor bootstrap:** In `/Users/favormac2/Git/readmybible-app.favor.church/.worktrees/issue-79-topbar` on `fix/issue-79-topbar`, commit only this plan file as the first branch commit, push `fix/issue-79-topbar` to `origin`, create exactly one draft PR targeting `main` with title `fix: realign top bar brand and profile controls` and a body containing the issue reference, summary, tests, risk/exclusions, and the immutable plan blob link anchored to the plan-only commit, then read back branch/PR number/base/head/body and post the approved-plan/execution-begins bookkeeping comment with a read-back. Preconditions: clean protected paths and plan file present; backup/revert target: `BASE` and the plan-only commit; postcondition: named branch and draft PR exist with matching SHA and plan link.
2. **Final planner closeout:** After a fresh implementation reviewer returns `APPROVED` for the final `HEAD` with real gate output, remove only `docs/plans/issue-79-topbar.md`, commit the final pre-merge change, push `fix/issue-79-topbar`, and read back the PR head/body. Preconditions: reviewer approval, full local gate green, intended-only final diff; backup/revert target: the feature branch commits and PR head; postcondition: PR head contains the plan removal and intended implementation only.
3. **Final approval bookkeeping:** Run `gh pr comment <PR> --body-file <approval-summary-file>` with reviewer id, final `HEAD`, review-round count, and change summary, then read the comment back. Preconditions: final `APPROVED`; postcondition: exactly the allowed final approval summary is visible on the PR.
4. **Ready and merge:** Run `gh pr ready <PR>` and read back `isDraft=false`; then run `gh pr merge <PR> --auto --squash --delete-branch` (retry without `--delete-branch` only if Git reports a local worktree branch-deletion conflict). Do not use `--admin` or direct pushes to `main`. Preconditions: final PR head read back, required checks available/green or GitHub accepts auto-merge; backup/revert target: merged PR and source commits; postcondition: read back PR `state`, `mergedAt`, `mergeCommit`, and auto-merge state.
5. **Local main synchronization:** If the PR is merged, from the repository checkout (not the feature worktree) run `git checkout main && git pull --ff-only origin main`, then read back `git rev-parse main`, `git rev-parse origin/main`, and `gh api repos/favorchurch/readmybible-app.favor.church/branches/main --jq .commit.sha` to confirm equality. If checks remain pending, leave the worktree intact and report that local-main sync is not yet verified.

## Out of scope

- Any changes to `components/screens/header.tsx`, `components/brand.tsx`, avatar markup/data, Connect switcher logic, screen-specific CSS, typography values, breakpoints, or unrelated tests.
- New visual design, spacing/size changes, or changes to the profile interaction and accessibility labels.
- Production UAT, deployment, database/cache changes, migrations, remote configuration, credentials, or non-PR outreach.
- Bypassing required checks, using `--admin`, force-pushing, direct pushes to `main`, or merging with unresolved review findings.

## Planner self-review

**SELF-REVIEW APPROVED.** I reread the complete plan contract, roles/authority rules, review-state rules, and the Luna Office hub before dispatch. Scope is limited to the shared `.brand` declaration and its structural test; the issue, BASE, branch/worktree, protected paths, task dependency, validation commands, named outward actions, read-backs, and out-of-scope boundaries are explicit. The plan’s factual code claims were checked against `components/screens/header.tsx`, `components/brand.tsx`, `app/styles/base.css`, `app/styles/typography.css`, `app/styles/frame.css`, the Connect switcher, all eight JSX Header call sites across five screens (Today has four), and the existing header/CSS tests. The focused test is designed to fail on BASE because `.brand` currently declares `align-items: end`; no external mutation or production access is authorized. No findings remain unresolved.

## Plan-review gate

- **Reviewer:** fresh independent `gpt-5.6-luna` read-only session `sa-0-c9e6bd28`, separate from planner and later executor.
- **Context/base:** `/Users/favormac2/Git/readmybible-app.favor.church/.worktrees/issue-79-topbar`, BASE `f8f90cd902dac1253f18217db739a95c68ec92a0`.
- **Initial verdict:** `CHANGES REQUIRED`.
- **Evidence:** the reviewer identified two factual/coverage corrections: eight JSX `Header` call sites across five screens rather than five total, and the focused validation needed explicit Connect switcher coverage.
- **Disposition:** planner verified both findings against the repository, amended the acceptance/verification/self-review text and focused command, and retained the bounded implementation scope. The user’s request to auto-approve the plan authorizes proceeding with this corrected plan; no second plan-review pass is dispatched because Luna Office requires a later pass only on explicit request.
- **Final plan status:** `SELF-REVIEW APPROVED — CHANGES RESOLVED`.
