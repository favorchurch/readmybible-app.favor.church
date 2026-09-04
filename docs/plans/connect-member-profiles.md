# Connect member profiles and shared group progress

## Context

The existing Connect view shows first-name roster avatars and the shared home, but a person cannot inspect another member's compact reading progress, the home scene cannot optionally carry the group around the tent, and the campus group list is visually subordinate to the Progress rail. This change keeps reading visibility lightweight and group-focused while making the social progress surfaces easier to scan.

## Global Constraints

- Repository/worktree: `/Users/rico/Git/readmybible-app.favor.church-connect-profile`; branch: `feat/connect-profile-calendar-v3`; base: `46ebecd` from `issue-35-scripture-and-debug`.
- Stack: Next.js 16.3.4, React 19.2.8, TypeScript 5.9.3, Vitest 4.1.11, CSS modules-by-import under `app/styles`.
- Protected paths: no authentication, Rock permissions, database schema migrations, Bible plan, check-in rules, group scoring formula, or leader tools behavior; no production deployment.
- Required validation: `pnpm test`, `pnpm lint`, `pnpm build`, `git diff --check`, and authenticated desktop/mobile browser captures for Home, Connect, member modal, and Progress.
- Blast-radius ceiling: one repository/worktree, local development, and the GitHub review branch only; no production environment or external data writes.

## Visual thesis

Make Connect feel like a warm campfire map: the existing paper-and-ink system stays quiet, while people, homes, and small streak marks add a sense of shared movement without turning the screen into a dashboard.

## Content plan

- Connect roster: a full-width people-first section with first names, small recent streaks, and a clear privacy note.
- Member detail: an accessible profile sheet with one identity moment, a compact October progress calendar, and a short five-day streak strip.
- Shared groups: a full-width campus section with a house miniature, a colored progress bar, and a short status line for every group.
- Home: an optional tent mode in Today&apos;s shared-home panel that places the same people around the existing 3D scene, with first names and a simple off state.

## Interaction thesis

- Member avatars reveal identity through hover/focus tooltips and open the same profile sheet on click/tap.
- The profile sheet enters with a restrained sheet transition; calendar dots and five-day streaks make progress legible at a glance.
- The tent toggle adds a gentle floating/entrance treatment for people while respecting reduced-motion preferences and mobile space.

## GOAL

```yaml
goal: Make Connect a people-first shared-progress view where every roster avatar can reveal a compact, privacy-safe reading profile and the group journey is legible on desktop and mobile.
done_criteria:
  - id: dc1
    statement: Roster members carry compact per-member reading history for the 28-day plan and recent five-day streak state, sourced from existing check-ins without exposing verse or personal-detail content.
    verify: pnpm test -- tests/member-progress.test.ts
  - id: dc2
    statement: Clicking or keyboard-activating a roster avatar opens an accessible member profile modal with the member's first name, avatar, five-day streak strip, and compact October progress calendar; hover/focus exposes the person's name.
    verify: pnpm test -- tests/member-profile-ui.test.ts && pnpm lint
  - id: dc3
    statement: Today&apos;s shared-home panel can optionally render roster avatars around the tent with first names underneath, and the option works at mobile widths with reduced-motion-safe behavior.
    verify: pnpm test -- tests/member-profile-ui.test.ts tests/css-rules.test.ts && git diff --check
  - id: dc4
    statement: The campus Connect Groups section spans the available content width and each group shows a StageMini house icon, colored progress bar, and readable status copy instead of only a percentage.
    verify: pnpm test -- tests/member-profile-ui.test.ts && pnpm build
  - id: dc5
    statement: Authenticated desktop and mobile screenshots plus an interaction smoke audit cover Home, Connect, member modal, and Progress after implementation.
    verify: test -s /tmp/connect-member-profiles-final-home-390.png && test -s /tmp/connect-member-profiles-final-home-1440.png && test -s /tmp/connect-member-profiles-final-connect-390.png && test -s /tmp/connect-member-profiles-final-connect-1440.png && test -s /tmp/connect-member-profiles-final-member-390.png && test -s /tmp/connect-member-profiles-final-member-1440.png && test -s /tmp/connect-member-profiles-final-progress-390.png && test -s /tmp/connect-member-profiles-final-progress-1440.png && rg -q "Gather group|Home" /tmp/connect-member-profiles-final-home.snapshot.txt && rg -q "Connect|Jordan|View Jordan" /tmp/connect-member-profiles-final-connect.snapshot.txt && rg -q "Jordan|October|calendar" /tmp/connect-member-profiles-final-member.snapshot.txt && rg -q "CONNECT GROUPS|Makati Adults|progress" /tmp/connect-member-profiles-final-progress.snapshot.txt
milestones:
  - id: m1
    criteria: [dc1]
    lands_on: feat/connect-profile-calendar-v3
  - id: m2
    criteria: [dc2, dc3]
    lands_on: feat/connect-profile-calendar-v3
  - id: m3
    criteria: [dc4, dc5]
    lands_on: feat/connect-profile-calendar-v3
named_actions:
  - action: DEV_MOCK_PERSON_ID=152 DEV_MOCK_TODAY=2026-10-08 pnpm dev --port 3011; agent-browser --session readmybible-connect-after open http://localhost:3011/qa/today; agent-browser --session readmybible-connect-after wait 2000; agent-browser --session readmybible-connect-after set viewport 390 844; agent-browser --session readmybible-connect-after screenshot --full /tmp/connect-member-profiles-final-home-390.png; agent-browser --session readmybible-connect-after snapshot -i > /tmp/connect-member-profiles-final-home.snapshot.txt; agent-browser --session readmybible-connect-after click @<connect-control>; agent-browser --session readmybible-connect-after screenshot --full /tmp/connect-member-profiles-final-connect-390.png; agent-browser --session readmybible-connect-after snapshot -i > /tmp/connect-member-profiles-final-connect.snapshot.txt; agent-browser --session readmybible-connect-after click @<member-avatar>; agent-browser --session readmybible-connect-after screenshot --full /tmp/connect-member-profiles-final-member-390.png; agent-browser --session readmybible-connect-after snapshot -i > /tmp/connect-member-profiles-final-member.snapshot.txt; agent-browser --session readmybible-connect-after click @<progress-control>; agent-browser --session readmybible-connect-after screenshot --full /tmp/connect-member-profiles-final-progress-390.png; agent-browser --session readmybible-connect-after snapshot -i > /tmp/connect-member-profiles-final-progress.snapshot.txt; repeat the affected screens at 1440px using the same fixture-backed local server and unique `...-1440.png` paths
    target: local dev server for feat/connect-profile-calendar-v3
    changes: starts a fixture-backed local server and writes eight authenticated full-page screenshots plus four accessibility snapshots for visual audit only
    dry_run: test -x "$(command -v pnpm)" && test -x "$(command -v agent-browser)"
    revert: kill the named local dev-server process and remove `/tmp/connect-member-profiles-final-*.png` and `/tmp/connect-member-profiles-final-*.snapshot.txt`
    read_back: test -s /tmp/connect-member-profiles-final-home-390.png && test -s /tmp/connect-member-profiles-final-home-1440.png && test -s /tmp/connect-member-profiles-final-connect-390.png && test -s /tmp/connect-member-profiles-final-connect-1440.png && test -s /tmp/connect-member-profiles-final-member-390.png && test -s /tmp/connect-member-profiles-final-member-1440.png && test -s /tmp/connect-member-profiles-final-progress-390.png && test -s /tmp/connect-member-profiles-final-progress-1440.png && rg -q "Gather group|Home" /tmp/connect-member-profiles-final-home.snapshot.txt && rg -q "Connect|Jordan|View Jordan" /tmp/connect-member-profiles-final-connect.snapshot.txt && rg -q "Jordan|October|calendar" /tmp/connect-member-profiles-final-member.snapshot.txt && rg -q "CONNECT GROUPS|Makati Adults|progress" /tmp/connect-member-profiles-final-progress.snapshot.txt
  - action: git push -u origin feat/connect-profile-calendar-v3
    target: origin remote branch
    changes: publishes the approved feature branch for review
    dry_run: git diff --check && git status --short --branch
    revert: git push origin --delete feat/connect-profile-calendar-v3
    read_back: git ls-remote --heads origin feat/connect-profile-calendar-v3
  - action: gh pr create --draft --base issue-35-scripture-and-debug --head feat/connect-profile-calendar-v3 --title "feat: add Connect member profiles and shared progress" --body-file docs/plans/connect-member-profiles-pr.md
    target: GitHub draft PR for issue #35
    changes: creates one draft review record containing the approved plan link and validation evidence
    dry_run: gh pr view --repo "$(gh repo view --json nameWithOwner --jq .nameWithOwner)" --json title,state,isDraft 2>/dev/null || true
    revert: gh pr close --delete-branch=false <created-pr-number>
    read_back: gh pr view feat/connect-profile-calendar-v3 --json number,state,isDraft,title
  - action: gh pr merge --squash --delete-branch=false <created-pr-number>
    target: GitHub PR after independent review and all validation commands pass
    changes: merges the approved feature into issue-35-scripture-and-debug
    dry_run: gh pr checks <created-pr-number>
    revert: git revert <merge-commit>
    read_back: gh pr view <created-pr-number> --json state,mergedAt,mergeCommit
non_goals:
  - No new authentication, Rock permissions, messaging, reminders, ranking, or production deployment.
  - No display of full names, verse text, private calendar metadata, or per-person ranking.
  - No replacement of the existing 3D house artwork or creation of new image assets.
  - No changes to the Bible plan, check-in rules, group scoring formula, or leader tools behavior.
blast_radius:
  repos: [/Users/rico/Git/readmybible-app.favor.church]
  worktree: [/Users/rico/Git/readmybible-app.favor.church-connect-profile]
  environments: [local development, GitHub review branch; no production deployment]
caps:
  review_rounds_per_task: 5
  agy_consecutive_tasks: 3
  loop_iterations: 12
  agy_cap_action: after three consecutive AgY task turns, re-brief the remaining task from the full approved plan before continuing; do not create a fourth AgY task turn without a planner routing decision.
```

## Implementation tasks

| Task | Scope | Model + effort | Verification | Dispatch | Why |
|---|---|---|---|---|---|
| 1. Member progress read model | `lib/data/stats.ts`, `app/page.tsx`, `components/app-shell.tsx`, `components/test-mode/**`, `tests/member-progress.test.ts` | AgY `gemini-3.7-flash-high` | `pnpm test -- tests/member-progress.test.ts` | Inline inside the single AgY executor | The query shape is narrow and the executor benefits from keeping the type, server query, and test fixture changes together; a separate worker would only buy coordination overhead and risks splitting the privacy boundary. |
| 2. Profile modal, tooltips, and tent toggle | `components/member-profile-sheet.tsx`, `components/screens/connect-screen.tsx`, `components/screens/today-screen.tsx`, `components/rotatable-home.tsx`, `app/styles/connect.css`, `app/styles/today.css`, `app/styles/home3d.css`, `app/styles/sheet.css`, `tests/member-profile-ui.test.ts` | AgY `gemini-3.7-flash-high` | `pnpm test -- tests/member-profile-ui.test.ts && pnpm lint` | Inline inside the single AgY executor | This is one interaction surface with shared avatar and modal seams; one writer keeps keyboard, mobile, and reduced-motion behavior coherent. The tent target is Today&apos;s `HomeIllustration`; Connect&apos;s home remains the separate `RotatableHome` surface. |
| 3. Full-width group progress and QA | `components/screens/progress-screen.tsx`, `app/styles/progress.css`, `tests/member-profile-ui.test.ts`, `docs/runs/**` | AgY `gemini-3.7-flash-high` | `pnpm test && pnpm lint && pnpm build && git diff --check` plus browser screenshots | Inline inside the single AgY executor, with planner-held final local screenshot | The layout and QA changes are coupled to the final responsive composition; delegating them separately would buy little and could reintroduce conflicting ordering rules. |

## Validation notes

- The baseline on `issue-35-scripture-and-debug` is 154 passing tests across 15 files.
- The baseline Connect screenshot is `/tmp/readmybible-connect-before.png`; it shows the current split home/side composition and a 11-person Manila roster.
- The worktree is `/Users/rico/Git/readmybible-app.favor.church-connect-profile` on `feat/connect-profile-calendar-v3`; all commands and commits must run there, never in the parent checkout.
- `agent-browser` is the explicitly chosen local screenshot driver for this run because the user requested app screenshots and it supports the required session, viewport, and full-page capture workflow; this overrides the workspace browser default for this audit only.
- The executor must re-read the branch before each commit/push and must not alter the five locked GOAL fields.

## Planner self-review

- Verified: `RosterMemberView` currently contains only `personId`, first-name display text, leader state, and `readToday`; `app/page.tsx` is the server seam where per-member check-ins can be attached.
- Verified: existing `checkins` rows already contain `rockPersonId`, `chapter`, and `readingDate`; the group stats query already reads the same table.
- Verified: `ProgressScreen` currently renders `campusBoard` in the rail and only prints name, percentage, and stage, so the full-width group treatment belongs there.
- Verified: `HomeIllustration` is used by Today&apos;s home panels and completion flow, while Connect renders the separate `RotatableHome`; the optional overlay is scoped to Today&apos;s shared-home `HomeIllustration` target and is not added to Connect&apos;s model.
- Unverified and assigned to executor verification: exact database query performance under a real-sized group, availability of `gh` credentials for branch/PR bootstrap, and the final mobile screenshots at 360px/390px widths.
- Every done criterion has a real command; the browser screenshot criterion is intentionally planner-held because it writes an audit artifact rather than source code.
- Blast radius is limited to one repository, local dev, and a review branch; no production mutation or deployment is authorized.

## Dependency graph

- Wave 1: Task 1. Depends on: none. Touches: `lib/data/stats.ts`, `app/page.tsx`, `components/app-shell.tsx`, `components/test-mode/**`, `tests/member-progress.test.ts`.
- Wave 2: Task 2. Depends on: Task 1. Touches: `components/member-profile-sheet.tsx`, `components/screens/connect-screen.tsx`, `components/screens/today-screen.tsx`, `components/rotatable-home.tsx`, related styles, and `tests/member-profile-ui.test.ts`.
- Wave 3: Task 3. Depends on: Task 2. Touches: `components/screens/progress-screen.tsx`, `app/styles/progress.css`, `tests/member-profile-ui.test.ts`, `tests/css-rules.test.ts`, and `docs/runs/**`.

## Out of scope

The `non_goals` list in the GOAL block is binding: no authentication, Rock permissions, messaging, reminders, ranking, production deployment, full names, verse text, private metadata, artwork replacement, Bible-plan changes, check-in-rule changes, scoring changes, or leader-tools changes.

## Plan-review disposition

Fresh Claude Opus low review: `CHANGES REQUIRED`. Findings F1–F9 are recorded with dispositions in `docs/runs/connect-member-profiles-plan-review.md`; the plan was amended and self-reviewed before approval.

### Amended-plan self-review

- F1/F3: the screenshot action now starts a fixture-backed server on port 3011, waits with the supported `wait 2000`, captures all four affected surfaces at 390px and 1440px, stores snapshots, and read-backs authenticated markers plus every file.
- F2: the PR read-back now uses the installed `gh pr view <branch>` positional form.
- F4: the validation notes explicitly choose `agent-browser` for this user-requested screenshot audit.
- F5: the plan now names both the source repository and exact feature worktree and forbids parent-checkout commands.
- F6: dc3 now gates both UI tests and CSS reduced-motion/mobile assertions.
- F7: the target is explicitly Today&apos;s `HomeIllustration`; the self-review no longer claims Connect uses it.
- F8: the plan preserves the three-task cap and defines a full re-brief before any fourth AgY task turn.
- F9: the PR body now uses an absolute GitHub plan URL placeholder that bootstrap will replace with the immutable plan-commit blob URL.
- Remaining unverified claims are limited to final runtime performance, `gh` permissions, and final 360px/390px rendered screenshots; these are named validation work, not hidden assumptions.
