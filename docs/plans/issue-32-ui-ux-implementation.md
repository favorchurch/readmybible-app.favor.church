# Issue 32: Read My Bible pre-launch, responsive, and information UX. Implementation plan

- **Plan path:** `docs/plans/issue-32-ui-ux-implementation.md`
- **Tracking issue:** https://github.com/favorchurch/readmybible-app.favor.church/issues/32
- **PR:** https://github.com/favorchurch/readmybible-app.favor.church/pull/33 (existing draft, reused by this run)
- **Repo / remote:** `favorchurch/readmybible-app.favor.church`, remote `origin`, base branch `main`
- **Primary worktree / branch:** `/Users/rico/Git/wt-rmb-issue32` on `issue/32-read-my-bible-ui-ux`
- **BASE:** `8e800fd` (branch tip before this run; contains `intent/UI-UX-SPEC.md` and `intent/UI-UX-PLAN.md`)
- **Source documents (binding product direction):** `intent/UI-UX-SPEC.md`, `intent/UI-UX-PLAN.md`
- **Office:** auto-office, gear **full**, planner claude opus (this session), `HERDR_ENV=1`
- **Plan version:** 3 (2026-09-03; v2 plus approval overrides D6 to D8, see section 12)

## 1. Context

Read My Bible (Next.js 16 App Router, Auth0 + Rock RMS identity, Supabase Postgres via Drizzle,
Redis cache) is live at readmybible-app.favor.church ahead of the October 2026 "Matthew, one chapter
a day" Connect Group campaign. Leaders onboard 2026-09-20; reading starts 2026-10-01. Issue 32 is a
UI/UX audit: pre-launch Today is a holding screen, desktop frames are inconsistent (ordinary Connect
members inherit an empty Leader Tools rail), the home-growth mechanic and privacy/scope boundaries are
unexplained, motion and hover are uneven, mobile Admin scrolls a 640px table, meaningful text is set
at 7 to 10px, and the favicon is a leftover Next.js starter asset.

Rico's decisions taken in this session (2026-09-03):

- **D1** Final closeout merges PR 33 into `main` (production deploy) and runs a read-only production smoke pass.
- **D2** Creative latitude is bold, with fonts and the in-app icon set frozen. Palette may evolve in **tones, accents, and neutrals only**. No new hue families; `--navy`, `--coral`, `--gold`, `--sage`, `--cream`, `--paper`, `--blue`, `--violet` keep their hues.
- **D3** Parallelize: agy (Gemini 3.8 Flash high) executors for frontend lanes, sonnet where evidence quality matters, several executors in separate worktrees rather than one.
- **D4** The failing Vercel preview check (missing `DATABASE_URL` in the preview environment, pre-existing) is ignored. The gate is the local `pnpm lint && pnpm test && pnpm build` plus a production smoke after merge.
- **D6** (approval, 2026-09-03) Lane A runs on claude sonnet high, not agy.
- **D7** (approval) Two code-reviewer sessions in M2 for wall clock: R1 reviews M1, lanes A and C, and M3; R2 reviews lanes B and D. Both Opus low, each resumed within its own lanes.
- **D8** (approval) Contracts may widen: `checkIn` may return server-authoritative group state so the completion flow can show a real stage-up. This overrides the `intent/UI-UX-PLAN.md` line "do not change the checkIn result contract solely for animation".
- **D5 (planner recommendation, surfaced for approval):** add a dev-only clock override `DEV_MOCK_TODAY`, honored only when `NODE_ENV !== "production"` in exactly the way `DEV_MOCK_PERSON_ID` already is (`lib/session.ts:60`). Without it, no active, grace, or closed state can be QA'd before October 1. Production behavior is unchanged and a test proves the guard.

### Verified current state (planner-checked at `file:line`, BASE `8e800fd`)

| Claim | Where |
|---|---|
| `TodayScreen` pre-launch early return renders header + one h1 + one p | `components/app-shell.tsx:352-362` |
| Closed-phase early return exists | `components/app-shell.tsx:364-374` |
| Leader Tools gated by `{isLeader && (` | `components/app-shell.tsx:585` |
| Connect desktop grid reserves column 2 for `.leader-box` for everyone | `app/globals.css:196-201` (`grid-template-columns: 1.15fr .85fr`) |
| Progress calendar loops `PLAN` (28 entries); grace days Oct 29 to 31 have no cells; future cells are non-interactive `<span>` | `components/app-shell.tsx:834-857`, `lib/plan.ts:50-56` |
| Reading-location picker: state `location`, options `LOCATIONS`, rendered only in the catch-up branch, value never sent | `components/completion-flow.tsx:10-17, 42, 94-110` |
| `checkIn` returns `{ ok: true } \| { ok: false; error }`; validation in `validateCheckIn(input, now = new Date())` | `app/actions/checkIn.ts:16-18`, `lib/checkin-validation.ts:48-51` |
| Server "today" for aggregates: `todayInTimezone()` uses `new Date()`; admin uses `adminToday(now = new Date())` | `lib/data/stats.ts:24-26`, `lib/admin/stats.ts:23` |
| Client today from device clock in `computeToday()` | `components/use-today.ts:17-28` |
| Group ratio and stage: `groupRatio(checkins, members)`, `stageFor(ratio)`, `nextStageProgress(ratio)` | `lib/game.ts:96-123` |
| `GroupStats` carries `checkinCount`, `memberCount`, `ratio`, `readersTodayIds` | `lib/data/stats.ts:45-50` |
| Three modals share markup but only `ScripturePopup` restores focus | `components/scripture-popup.tsx:39-45`; `completion-flow.tsx`, `profile-editor.tsx` have none |
| Only one `:hover` rule in the codebase; no `:disabled` styles; no `(hover: hover)` query | `app/globals.css:96`; scout 2 sections 8 and 9 |
| Reduced motion: one global rule | `app/globals.css:148` |
| 65 font-size declarations at 10px or below, 21 at 8px or below | scout 2 section 7 (e.g. `.eyebrow` 10px `:85`, `.bottom-nav button` 9px `:108`, `.member-card > small` 8px `:123`) |
| Width systems: 1120 shell, 920 topbar, 720 content, 1040 grids, 560 onboarding, 550 sheet | `app/globals.css:40, 44, 86-128, 154, 196, 203` |
| Admin table `min-width: 640px` inside `overflow-x: auto` wrapper | `app/admin/admin.css:40-48` |
| Admin scope line copy | `app/admin/page.tsx:44-47` |
| Chart legend font 11px, empty state text | `app/admin/HierarchyChart.tsx:27-29, 55-57` |
| Favicon is the Next.js starter blue grid | `public/favicon.svg` (712 B); `app/layout.tsx:11-18` |
| Fonts are local `@font-face` (Favor Sans, Agharti) | `app/globals.css:3-17` |
| In-app icons are CSS shapes and Unicode glyphs in `components/nav-icon.tsx`; avatars are PNG layers under `public/avatar-*` | `components/nav-icon.tsx:4-26` |
| Tailwind is imported but zero utility classes are used in markup | `app/globals.css:1`, scout 2 summary |
| Dev fixtures: `ROCK_API_KEY` empty and non-production switches Rock reads to frozen fixtures for group 24077 (leaders 194 and 18038; members include 152 Rico and 1869) | `lib/rock/fixtures.ts:1-56, 129` |
| Tests: Vitest, node env, `tests/**/*.test.ts`; 9 files | `vitest.config.ts:4-7` |
| Production `readmybible.checkins` row count at plan time: **0** | read-only query 2026-09-03 via `.office/db-checkins-count.mjs` |

## 2. Global Constraints

### Binding product constraints (from issue 32, spec, and D1 to D5)

1. No Rock structure, group type, membership, section, or role change. No new Rock write path. `lib/rock/client.ts` write functions and `app/actions/joinByCode.ts` are untouched.
2. No database migration. `db/` and `drizzle/` are untouched. No new persisted data (a `sessionStorage` key for one-time UI emphasis is allowed and is not persistence).
3. Check-in rules and server-side date validation are unchanged in production. Permitted edits to `lib/checkin-validation.ts`, `app/actions/checkIn.ts`, `lib/data/stats.ts`, `lib/admin/stats.ts`: the `now`-injection points for D5 (guarded by `NODE_ENV !== "production"`) and, per D8, widening the `checkIn` **return** type with a `group` field (Task 5b). The insert, the unique constraint, the validation call, and the error paths are unchanged.
4. `resolveAdminScope()` (`lib/admin/access.ts`) is untouched and remains the access boundary. Admin presentation never filters as a substitute for it.
5. `connect.favor.church` renders only inside the leader-gated Leader Tools. Never for members, never for the public.
6. Fonts frozen: `public/fonts/*` untouched; `--font-sans` and `--font-display` values unchanged; no `next/font`, no new `@font-face`.
7. In-app icon set frozen: `components/nav-icon.tsx` markup and `public/avatar-*` untouched. New controls reuse existing Unicode glyph style (`→ ← ↔ × ✓ ✦ ★ ▸ ▾`) or plain text. Only `public/favicon.svg` and `public/favicon.ico` change (and `public/apple-touch-icon.png` only if consistency requires).
8. Palette (D2, refined by Rico mid-session): keep the eight named color tokens and their hues. Allowed: new tones of those hues (for example `--coral-soft`, `--navy-80`), a neutral scale (surfaces, ink, lines), accent usage changes. Not allowed: new hue families, dark mode, replacing a primary.
9. No individual rankings. The campus leaderboard stays group-level.
10. Copy follows Favor voice (speak-like-favor): English only, never the word "fam", **no em dash in user-facing copy (TSX/TS strings) or in any intent doc, README, or DESIGN.md this run edits** (frozen intent docs and CSS comments are out of the rule's reach and out of the grep), no sentence starts with "And", Oxford comma, numerals in digital copy, "Connect Group" on first mention on a screen then "Connect" is fine, dates as "October 1" (full month when space allows, otherwise "Oct 1"), no "please" in invitations, plain language, no church jargon. Spec-suggested copy in `intent/UI-UX-SPEC.md` is the default wording; adjust only for voice or fit.
11. Frontend craft (`/Users/rico/.claude/skills/frontend/SKILL.md`, product register): no side-stripe borders, no gradient text, no glassmorphism as decoration, no identical three-card rows, no hover-only information, no text overflow at any breakpoint, contrast body 4.5:1 and large text 3:1, 44px touch targets where practical, `:focus-visible` on every control, ease-out curves only, animate `transform`/`opacity`, every new animation covered by `prefers-reduced-motion`, no looping decorative animation, no autoplay confetti, no scroll-jacking. Hover styling only inside `@media (hover: hover) and (pointer: fine)`.
12. Typography floor: meaningful helper/status text at least 12px on phones, secondary labels at least 11px unless purely decorative, body 15 to 17px where space allows. Decorative small caps may stay small only where legible.
13. Next.js 16: read `node_modules/next/dist/docs/` before writing App Router code; heed deprecations. Do not edit `AGENTS.md` (it is regenerated by `next dev`).
14. Package manager is `pnpm`. Lint while iterating; build before claiming done.

### Validation commands (the gate; run in the worktree being reviewed, real output pasted)

```
pnpm lint
pnpm test
pnpm build
```

Rendered checks use a local dev server with `.env.local` present (copied from the primary checkout; never committed). Ports: primary worktree 3100, lane A 3101, lane B 3102, lane C 3103, lane D 3104. Use the planner-provided tool `.office/tools/render.sh <port> <path> [ENV=VALUE ...]` (present in every worktree's `.office/`): it starts `pnpm dev` on that port with the given env overrides, polls `curl -sf` until the path responds or 120s pass, prints the HTML to stdout, and stops the server by PID. Server components render on first fetch, so `data-*` markers in server or client component markup are greppable in the HTML. For browser checks start the server the same way in the background (`.office/tools/dev-up.sh <port> [ENV=VALUE ...]`, stop with `.office/tools/dev-down.sh <port>`).

State switches for QA, all local-only, all dev-only:

| State | How |
|---|---|
| Pre-launch member with a group | `DEV_MOCK_PERSON_ID=13358` (rico+test, Member of group 24077) with `ROCK_API_KEY` set (real Rock reads). Today is genuinely pre-launch until Oct 1. |
| Leader, member, multiple groups, solo | `ROCK_API_KEY=` (empty) switches to `lib/rock/fixtures.ts`: roles come from `FIXTURE_ROLES` (`lib/rock/fixtures.ts:42-54`) with 23 = Member, 24 = Leader, 81 = Assistant Leader (`lib/rock/constants.ts:15-17`; `isLeader` at `lib/session.ts:97`). Leaders: `DEV_MOCK_PERSON_ID=194` or `18038`. Members: `152` (Rico's real id, never check in as it) or `1869`. Solo: an id absent from fixtures, e.g. `999001`. |
| Active day N, grace day, closed | `DEV_MOCK_TODAY=2026-10-08`, `2026-10-30`, `2026-11-03` (Task 5). |
| Global admin / section admin / no access | `ADMIN_PERSON_IDS` containing the mock id / a real GT24 section leader id with `ROCK_API_KEY` set / an id in neither. |

**QA write rule:** completing a check-in writes a real row to production `readmybible.checkins`. Allowed only as `DEV_MOCK_PERSON_ID=13358` and only when needed to exercise the completion flow. Never in fixture mode (person 152 is Rico's real id). Never submit the join form or call `joinByCode` during QA (Rock write). Each executor lists every QA check-in it performed (person, chapter) in its handoff. Cleanup of those rows is Rico's decision at closeout (see named actions).

### Protected paths

`db/**`, `drizzle/**`, `drizzle.config.ts`, `scripts/**`, `lib/rock/client.ts`, `lib/rock/hierarchy*.ts`, `lib/admin/access.ts`, `lib/auth0.ts`, `lib/session.ts`, `app/actions/joinByCode.ts`, `app/actions/chooseGroup.ts`, `app/actions/saveProfile.ts`, `app/actions/getOrCreateJoinCode.ts`, `app/api/**`, `proxy.ts`, `public/fonts/**`, `public/avatar-base-v2/**`, `public/avatar-hair-v2/**`, `public/og-image.png`, `components/nav-icon.tsx`, `components/avatar.tsx`, `.env*`, `AGENTS.md`, `CLAUDE.md`, `intent/UI-UX-SPEC.md`, `intent/UI-UX-PLAN.md`, `intent/SPEC.md`, `intent/GAME.md`, `intent/INTENT.md`, `intent/PLAN.md`.

### BLAST-RADIUS CEILING (restated verbatim in every brief)

```
BLAST-RADIUS CEILING
repo: favorchurch/readmybible-app.favor.church only. Worktrees under /Users/rico/Git/wt-rmb-*.
branches: issue/32-read-my-bible-ui-ux (push to origin allowed ONLY for the M1 executor bootstrap
  and for planner milestone landings); issue/32-lane-a|b|c|d are local-only, never pushed.
main: planner-only, at final closeout, via `gh pr merge 33`.
GitHub: PR 33 body edit and exactly three comments (bootstrap, first-executor completion, final
  approval). No other issues, PRs, comments, labels, or repo settings.
environments: local dev only. Production is reached only by the final merge.
live systems: Rock REST is READ-ONLY (never call joinGroup, never submit the join form).
  Supabase Postgres: reads via the app; check-in INSERTs only as DEV_MOCK_PERSON_ID=13358 and only
  to exercise the completion flow. Redis: app-driven only. Vercel: read-only (no env, domain, or
  project changes). Auth0: untouched. No credentials created, copied elsewhere, or printed.
forbidden edits: db/**, drizzle/**, lib/rock/client.ts write functions, lib/admin/access.ts,
  Rock role ids, check-in rule logic, font files or families, components/nav-icon.tsx,
  public/avatar-*, .env files (read-only), AGENTS.md.
```

## 3. Numbered tasks

Strategy tags: `INLINE` (the executor implements it itself), `WORKER agy`, `WORKER sonnet`, `PLANNER-HELD`.

### Milestone M1: foundation (executor E1, claude sonnet high, primary worktree)

**Task 0. Executor bootstrap (E1).** Confirm worktree `/Users/rico/Git/wt-rmb-issue32`, branch `issue/32-read-my-bible-ui-ux`, HEAD `8e800fd`, `git status --short` shows only `?? docs/` (the plan) and nothing else, `node_modules` present, `.env.local` present. Stage `docs/plans/issue-32-ui-ux-implementation.md` alone and commit it (`docs: add auto-office implementation plan for #32`). `git push origin issue/32-read-my-bible-ui-ux` (never `HEAD`). Reuse PR 33: `gh pr edit 33 --body-file <file>` where the file is the current body plus a section `## Implementation plan` containing `[docs/plans/issue-32-ui-ux-implementation.md](https://github.com/favorchurch/readmybible-app.favor.church/blob/<full plan-commit sha>/docs/plans/issue-32-ui-ux-implementation.md)` and the plan commit SHA. Post the bootstrap comment with `gh pr comment 33 --body-file .office/pr-bootstrap-comment.md` (branch, plan path, issue, plan commit, next resume point: "Task 1"). Read back with `gh pr view 33 --json body,comments`. Verify `.office/`, `EXECUTOR-STATE.md`, and `.env.local` are listed in `$(git rev-parse --git-common-dir)/info/exclude` (this is a linked worktree; `.git` is a file) with `git check-ignore -v .office/x EXECUTOR-STATE.md`. Fail closed on any step.

**Task 1. Split `components/app-shell.tsx` into screen modules with zero behavior change.** `INLINE`.
Files: new `components/screens/header.tsx`, `today-screen.tsx`, `connect-screen.tsx`, `rewards-screen.tsx`, `progress-screen.tsx`, `group-picker-screen.tsx`, `solo-screen.tsx`, `bottom-nav.tsx`; `components/app-shell.tsx` becomes the orchestrator (state, actions, tab switch, modals) and keeps exporting `AppShell`, `AppShellProps`, `RosterMemberView` with identical shapes. Move code, do not rewrite it. Shared constants (`navItems`, `REWARD_THRESHOLDS`) move with their consumers.
Verify: `pnpm lint && pnpm test && pnpm build` green; `grep -n "export" components/app-shell.tsx` still lists the three exports; `wc -l components/app-shell.tsx` under 400; visible-DOM parity: with the dev server at port 3100 (`.office/tools/render.sh`), capture before and after the split, for each of the four tabs, `document.body.innerText` plus the tree of `tagName.className` for every element under `main` (browser console via ego-browser, saved to `.office/parity/task1-<tab>-{before,after}.txt`), and `diff` them; the diff must be empty. Byte-level HTML is not the gate (RSC payload and chunk ids change when modules split).

**Task 2. Split `app/globals.css` into `app/styles/*.css` with zero visual change.** `INLINE`.
Files: `app/globals.css` keeps `@import "tailwindcss";`, the two `@font-face` blocks, `:root`, and then `@import "./styles/<name>.css";` lines in a fixed order; new files `app/styles/base.css` (resets, shell, screen, topbar, avatar basics), `frame.css` (placeholder for Task 3, may be empty), `today.css`, `connect.css`, `rewards.css`, `progress.css`, `sheet.css` (modal/sheet, close button), `nav.css`, `onboarding.css` (picker, solo, join), `home3d.css` (sections 05, 07 to 16, 48 to 50, 52 of scout 2), `avatar.css` (sections 17 to 45), `motion.css` (keyframes and reduced-motion), `completion.css` (section 53), `misc.css` for anything unplaceable. Move rules verbatim; keep cascade order identical to the original file order within each destination.
Verify: (1) rule multiset: a script (`.office/parity/css-multiset.mjs`, executor-written) tokenizes BASE `app/globals.css` and HEAD `app/globals.css` + imported files, keys every rule by its full at-rule prelude chain (for example `@media (max-width: 370px) > .member-grid`) plus its normalized declarations, and diffs the two multisets; the diff must be empty, which catches a lost `@media` wrapper. (2) computed-style parity: with the dev server at port 3100, snapshot `getComputedStyle` (all properties) for a fixed selector list (`.app-shell, .screen, .topbar, .hero-copy h1, .reading-card, .primary-button, .bottom-nav, .bottom-nav button, .member-grid, .member-card, .calendar-grid, .modal-sheet, .connect-screen, .progress-screen, .leader-box, .stats-card`, using the leader fixture so every selector exists) at viewports 360, 768, and 1280, before and after the split, saved under `.office/parity/task2-*.json`, and diff; must be empty. Rendered HTML parity is not a CSS gate. `pnpm build` green (Tailwind v4 via `@tailwindcss/postcss` resolves relative `@import`; confirm in the build output, and if it does not, use CSS Modules-free plain `import "./styles/x.css"` lines in `app/layout.tsx` instead and record the deviation).

**Task 3. Design tokens, page-frame system, interaction baseline, `intent/DESIGN.md`.** `INLINE`. Read `/Users/rico/.claude/skills/frontend/references/design-system.md` first.
Files: `app/globals.css` (`:root` additions only), `app/styles/frame.css`, `app/styles/base.css`, `app/styles/motion.css`, `app/styles/nav.css`, `intent/DESIGN.md` (new), and the minimal class changes in `components/screens/*.tsx` and `app/admin/page.tsx` needed to adopt the frames.
Behavior:
- Tokens in `:root`: spacing scale (`--space-1` 4px to `--space-9` 64px), radius scale (`--radius-sm/md/lg/xl/pill`), duration `--dur-fast: 120ms`, `--dur-base: 200ms`, `--dur-slow: 320ms`, easing `--ease-out: cubic-bezier(.22, 1, .36, 1)`, `--ease-in-out`, shadow scale (2 levels), a neutral scale derived from `--navy` and `--cream` (`--ink`, `--ink-2`, `--ink-muted` kept, `--surface-1/2/3`, `--line`, `--line-strong`), accent tones (`--coral-soft`, `--coral-deep`, `--gold-soft`, `--sage-soft`, `--navy-soft`). Existing tokens keep their values.
- Page frames: `.frame` (full product, `max-width: 1040px`), `.frame--focused` (`max-width: 560px`), `.frame--rail` (desktop grid `minmax(0, 1.15fr) minmax(280px, .85fr)` at `min-width: 1024px`, single column below; children `.frame__main`, `.frame__rail`; when `.frame__rail` is absent or `:empty` the grid collapses to one column, using `:has(> .frame__rail)`), `.frame__span` (full width). Top bar aligned to the same frame width as its screen. Breakpoints: 480, 768, 1024 as the additive set; keep 360 to 389 behaving (existing `max-width: 370px` rules stay).
- Interaction baseline: `.primary-button`, `.secondary-link`, `.close-button`, `.bottom-nav button`, `.picker-option`, `.header-person`, calendar buttons: `:hover` (inside `@media (hover: hover) and (pointer: fine)`), `:focus-visible` (gold ring), `:active` (translateY(1px) or scale(.98)), `:disabled` (opacity .55, `cursor: not-allowed`, no hover lift), `aria-busy` where used. Bottom-nav active indicator transitions with `--dur-base`.
- Motion: existing `.spark` infinite twinkle becomes a one-shot or is removed (no looping decoration); `pageIn` uses `--dur-base` and `--ease-out`; reduced-motion block extended so every `@keyframes` in the codebase is neutralized (the global rule at `app/globals.css:148` moves to `motion.css` and stays).
- `intent/DESIGN.md`: tokens table, frame vocabulary with when-to-use, type scale (display, h1 to h3, body 16, small 13, micro 11 decorative-only), motion rules, interaction-state matrix, the palette rule from D2. Lanes consume this file.
Also add `tests/css-rules.test.ts`: a Vitest test that reads `app/globals.css`, `app/styles/*.css`, and `app/admin/admin.css`, parses them with a small at-rule-aware tokenizer (track `@media` nesting; no dependency needed), and asserts (a) every `:hover` selector is inside an `@media` prelude containing `hover: hover`; (b) no `animation` declaration uses `infinite`; (c) every `@keyframes` name is neutralized by the reduced-motion block (the global `*, *:before, *:after` rule inside `@media (prefers-reduced-motion: reduce)` counts); (d) no `font-size` of 11px or below (px or rem equivalent) appears unless the same line carries `/* decorative */`. Show each assertion red once by mutating a CSS file (restore by `cp`) and record it in the mutation table. The wrong-but-passing implementations to exclude: a hover check that only looks at the previous five lines; a font-size check that only matches `px`.
Verify: `pnpm test -- tests/css-rules.test.ts` green at HEAD and its mutation rows; gate green; `intent/DESIGN.md` exists and has no em dash (`grep -c "—" intent/DESIGN.md` = 0).

**Task 4. Pure phase and display helpers with tests.** `INLINE` (tests are evidence; sonnet writes them).
Files: `lib/plan.ts`, `lib/game.ts`, `tests/plan-phase.test.ts`, `tests/game.test.ts`, new `tests/plan-display.test.ts`.
Add and export, pure and documented:
- `type DisplayPhase = "pre-launch" | "active" | "grace" | "closed"`; `displayPhase(todayLocal): DisplayPhase` (grace = Oct 29 to 31).
- `GRACE_DATES: readonly string[]` = `["2026-10-29","2026-10-30","2026-10-31"]`.
- `type DayState = "read" | "today" | "catch-up" | "upcoming"`; `dayState(entry: PlanEntry, todayLocal: string, isRead: boolean): DayState` (read wins; today when `entry.date === todayLocal`; catch-up when `entry.date < todayLocal` and unread; otherwise upcoming; before launch every day is upcoming).
- `checkInOpensLabel(entry: PlanEntry): string` returning `Check-in opens October ${day}.`
- `longDate(dateStr): string` returning e.g. `Thursday, October 1` (en-US, no timezone shift: build from the YYYY-MM-DD parts).
- In `lib/game.ts`: `stageTransition(beforeRatio: number, afterRatio: number): { from: Stage; to: Stage } | null` (null when `stageFor` is equal). Both ratios come from the server (Task 5b), never from the page's cached `groupStats`.
Tests: boundary table Sep 30 / Oct 1 / Oct 28 / Oct 29 / Oct 31 / Nov 1 for `displayPhase`; `dayState` for all four states plus pre-launch; `checkInOpensLabel`; `longDate` across a month boundary; **The wrong-but-passing implementations each test must exclude:** a `dayState` that returns `today` for any unread past day; a `displayPhase` that maps Oct 29 to `active`; a `longDate` that shifts the day across a timezone; a `stageTransition` that returns non-null when the ratio changed but the stage did not. Record each new test red against BASE (or against the helper with its logic deliberately inverted, restored by `cp`) in the handoff mutation table.
Verify: `pnpm test` output shows the new files and counts; mutation table in handoff.

**Task 5. Dev-only clock override `DEV_MOCK_TODAY` (D5).** `INLINE`.
Files: new `lib/dev-clock.ts` (server, `import "server-only"` is NOT used because the client also needs the value via a prop; keep it a pure function reading `process.env`); `lib/checkin-validation.ts` (no logic change; `validateCheckIn` already accepts `now`); `app/actions/checkIn.ts` (pass `appNow()`); `lib/data/stats.ts` (`todayInTimezone(timezone, now = appNow())`); `lib/admin/stats.ts` (`adminToday(now = appNow())` and callers); `app/page.tsx` (pass `devMockToday={devMockToday()}` prop); `components/app-shell.tsx` + `components/use-today.ts`: `useToday(override?: string | null)` where `computeToday(override)` uses the override string as the single date source for `todayLocal`, `phase`, `dayLabel`, `entry`, and the new `displayPhase: DisplayPhase` field on `TodayState` (timezone still from the device); every screen receives the whole `today` object so no lane recomputes a phase; `tests/dev-clock.test.ts`; `README.md` env var note.
Behavior: `appNow(): Date` returns `new Date()` unless `process.env.NODE_ENV !== "production"` and `DEV_MOCK_TODAY` matches `/^\d{4}-\d{2}-\d{2}$/`, in which case it returns that date at 12:00 local. `devMockToday(): string | null` returns the raw value under the same guard. Nothing else reads `DEV_MOCK_TODAY`.
Tests: guard is two-sided: with `NODE_ENV=production` and the var set, `appNow()` is within 5s of real now; with `NODE_ENV=test` and the var set, `appNow().toISOString().slice(0,10)` equals the var; malformed value falls back to real now. Record red at BASE (file does not exist) plus a mutation (remove the production check, confirm the production test reddens, restore by `cp`).
Verify: `pnpm test`; `grep -rn "DEV_MOCK_TODAY" --include=*.ts --include=*.tsx .` lists only `lib/dev-clock.ts` and the test; `pnpm build` green; with `DEV_MOCK_TODAY=2026-10-08 DEV_MOCK_PERSON_ID=13358 PORT=3100 pnpm dev`, `curl -s localhost:3100/ | grep -c "Matthew 8"` is at least 1 (paste).

**Task 5b. Widen the `checkIn` result with server-authoritative group state (D8).** `INLINE`.
Files: `app/actions/checkIn.ts`, `lib/data/stats.ts`, `tests/checkin-group-state.test.ts` (pure part only).
Behavior: `CheckInResult` becomes `{ ok: true; group: CheckInGroupState | null } | { ok: false; error: string }` where `CheckInGroupState = { before: { ratio: number; stage: Stage }; after: { ratio: number; stage: Stage }; checkinCount: number; memberCount: number }`. Inside `checkIn`, when the person has an active group: read the group's fresh check-in count and roster size **bypassing the Redis cache** (add `getGroupStatsFresh(groupId, campusId)` in `lib/data/stats.ts` that runs the same queries without `cached()`), compute `before`; perform the existing insert unchanged; compute `after` from `before.checkinCount + 1` (the row just inserted is the only change this call made); clear the caches as today; return both. Extract the pure `groupStateFor(checkinCount, memberCount)` -> `{ ratio, stage }` into `lib/game.ts` and test it. All existing callers keep working (`result.ok` shape unchanged). No new DB writes, no schema change.
Verify: `pnpm test`; `grep -n "group:" app/actions/checkIn.ts`; a real check-in as 13358 with `DEV_MOCK_TODAY=2026-10-02` returns `group.before` and `group.after` in the browser network response (paste the JSON, then list it under QA check-ins performed).

**Task 6. Shared accessible `Sheet` component; migrate the three modals; remove the reading-location picker.** `INLINE`.
Files: new `components/sheet.tsx`; `components/scripture-popup.tsx`, `components/completion-flow.tsx`, `components/profile-editor.tsx`, `components/use-escape-to-close.ts` (keep), `app/styles/sheet.css`.
Behavior: `Sheet({ open, onClose, labelledBy, className, children, initialFocusRef? })` renders `.modal-wrap[role=dialog][aria-modal=true]`, backdrop button, `.modal-sheet` with `tabIndex=-1`; on open saves `document.activeElement`, focuses `initialFocusRef` or the sheet; traps Tab within the sheet; Escape closes (reuse `useEscapeToClose`); on close restores focus to the saved element; `max-height: 92dvh`, safe-area padding preserved, desktop centered variant preserved; body scroll locked while open (`overflow: hidden` on `document.body`, restored on unmount). Migrate the three modals to it without changing their content. Remove `LOCATIONS`, `location` state, and the `.location-question` block from `completion-flow.tsx`, and the `.location-question` / `.location-grid` CSS.
Verify: `grep -c "Where did you read" components/completion-flow.tsx` = 0 and `grep -rn "location-grid\|location-question\|LOCATIONS" components app/styles` = 0; keyboard check in the browser (ego-browser at port 3100): open Quick Verse, Tab cycles inside, Escape closes, focus returns to the trigger (record the active element before/after via `document.activeElement.className` in a console log and paste); gate green.

**M1 landing (planner):** verify dc1 to dc6, then push `issue/32-read-my-bible-ui-ux` to origin (named action NA2), create lane worktrees (NA3), record run state.

### Milestone M2: four parallel lanes (separate worktrees from the M1 tip)

Every lane: read `intent/UI-UX-SPEC.md`, `intent/UI-UX-PLAN.md`, `intent/DESIGN.md`, `intent/COPY.md`, and `/Users/rico/.claude/skills/frontend/references/build-components.md` first. Product register. Use the M1 frames, tokens, `Sheet`, and helpers; do not add tokens to `:root` (lane-local custom properties go in the lane's CSS file). Do not touch another lane's files. Do not edit `intent/COPY.md` (M3 syncs copy). Every new `<section>` or sheet carries a `data-section="<kebab-name>"` attribute named in the task so verification can grep rendered HTML.

**Task 8. Lane A: Today by phase, desktop composition, completion feedback.** `WORKER sonnet` (executor E2, claude sonnet high, own worktree `/Users/rico/Git/wt-rmb-lane-a`, branch `issue/32-lane-a`, port 3101).
Touches: `components/screens/today-screen.tsx`, `app/styles/today.css`, `components/completion-flow.tsx`, `app/styles/completion.css`, `components/app-shell.tsx` **only** to pass props that already exist on `AppShell` (`groupStats`, `today` with its `displayPhase` field from Task 5) into `TodayScreen` and `CompletionFlow`. `RotatableHome` renders on Connect (`components/app-shell.tsx:569` at BASE), so it belongs to Lane B.
Behavior:
- Pre-launch (`data-section` markers in parentheses): Header; hero `Matthew starts October 1.` with sub `One chapter a day. 28 chapters. Your Connect Group grows a shared home as you read together.` (`prelaunch-hero`); Day 1 preview card: `Day 1`, `Matthew 1`, `Thursday, October 1`, key passage via the existing Quick Verse button, **no check-in button** (`day1-preview`); readiness card with three rows: avatar (set / default), Connect Group (name or `Join with a leader code`), Bible translation, each row a real control opening the profile editor or the Connect tab (`readiness`); shared home preview when a group exists, using the existing `HomeIllustration`/compact 3D at stage Tent with copy `Your home starts as a Tent on October 1.` (`home-preview`); `How this works` three short steps (read, check in, home grows) (`how-it-works`); action `See the full roadmap` switching to the Progress tab (`roadmap-link`). Desktop: hero + Day 1 in `.frame__main`, the rest in `.frame__rail`. Never 28 locked cards. No "behind" or "not yet" language anywhere pre-launch.
- Active: mobile order unchanged (header, hero, reading card (`reading-card`), catch-up (`catch-up`), home snapshot (`home-snapshot`), readers today (`readers-today`), note). Desktop: `.frame__main` hero, reading card, catch-up; `.frame__rail` home snapshot, readers today, next home milestone (`nextStageProgress`). No group: rail absent, one column.
- Grace (Oct 29 to 31): hero `Three catch-up days.` variant by remaining count; cards: completed count, remaining unread chapters as a compact list of chapter chips that open the catch-up flow, group status, and a completed state (`All 28 chapters. Well done.`) when `chaptersRead === 28` (`grace-dashboard`). No `DAY n OF 28` eyebrow on grace days.
- Closed: compact summary: chapters read of 28, medals earned (`medals()`), final home stage when grouped, button to Progress; no daily wording (`closed-summary`).
- Completion feedback (`completion-flow.tsx`): keep step 1 honor-based copy. Success step shows `+10 coins` chip with a brief count bump (transform/opacity only), personal reward progress (existing), and when a group exists a home progress line from `result.group` (Task 5b): percentage `before.ratio` to `after.ratio` and the stage; when `stageTransition(before.ratio, after.ratio)` is non-null show a one-time stage-up block (`stage-up`) naming `from` and `to` with the existing home illustration, transform/opacity motion only, reduced-motion safe. `AppShell` passes `result.group` into `CompletionFlow` as a prop. No celebration replays on revisit (state lives in the flow only, cleared on close). Catch-up success gets the same treatment minus the streak note change. Remove the `See what changed` dead-end: primary action closes.
Verify (executor pastes, planner re-runs): with `.office/tools/render.sh 3101 / DEV_MOCK_PERSON_ID=13358` (real Rock reads), the HTML contains each pre-launch marker exactly once, zero `I read today`, and zero matches of the deficit pattern `\b0 of [0-9]+\b|haven't|not started|behind|not yet|so far` (case-insensitive); with `DEV_MOCK_TODAY=2026-10-08` the HTML contains `Matthew 8` and `data-section="reading-card"`; with `2026-10-30` it contains `grace-dashboard`; with `2026-11-03` it contains `closed-summary` and not `I read today`; at 360px no horizontal scroll (`document.documentElement.scrollWidth <= 360` via browser console); at 1280px with fixture leader 194, the rail exists; with a groupless id (999001), `.frame__rail` is absent. Gate green in the lane worktree. Copy: `grep -c "—" components/screens/today-screen.tsx components/completion-flow.tsx` both 0.

**Task 9. Lane B: Connect by role and phase, home-growth sheet, privacy note.** `WORKER agy` (executor E3, worktree `/Users/rico/Git/wt-rmb-lane-b`, branch `issue/32-lane-b`, port 3102).
Touches: `components/screens/connect-screen.tsx`, `app/styles/connect.css`, `components/rotatable-home.tsx`, `app/styles/home3d.css`, new `components/home-growth-sheet.tsx`, new `components/reading-visibility-note.tsx`.
Behavior:
- Member desktop: `.frame` single column, home card full width with a balanced internal two-column layout at 1024px+, roster uses the full width (`member-grid` 5 columns at 1024px+). No `.leader-box`, no reserved column.
- Leader desktop: `.frame--rail` with home + roster in `.frame__main`; `.frame__rail` holds Leader Tools: join code, QR, `Still reading` nudge (active phase only), and the `connect.favor.church` link, still inside `{isLeader && ...}` (`leader-tools`). Mobile leader order: home, Leader Tools, roster.
- Pre-launch: roster heading `Reading together this October` (`roster`); member cards show avatar and name with no read/waiting dimming and no check marks; no `Still reading` nudge; join code and QR still shown to leaders with copy `Share this before October 1.`
- Active: existing read/waiting behavior and nudge, with the waiting state at readable contrast (no grayscale filter; use `--ink-muted` text and a subtle outline) and the read state marked by the check glyph plus the word `Read` so meaning is not color-only.
- Grace and closed: heading `Finishing Matthew together` / `Matthew, finished together`; no daily nudge; show group completion percentage.
- `How your home grows` control (button, `aria-haspopup="dialog"`) under the home card opens a `Sheet` (`home-growth-sheet`) with the spec copy: every chapter adds to shared progress; the home grows by the percentage of Matthew the group has completed so a group of 5 and a group of 15 grow at the same pace; `Coins celebrate every chapter. Group completion percentage decides the home stage.`; the six stages listed Tent to Mansion with the current one marked; the formula in plain words (`group check-ins divided by members times 28`).
- `rotatable-home.tsx` (renders inside the Connect home card): add two rotate buttons (`←` / `→`, `aria-label="Rotate left"` / `"Rotate right"`) next to `Reset view`, keep drag and arrow keys, hint text reads `Drag, swipe, or use the arrows to look around.` at 12px minimum.
- Privacy note: low-emphasis text button `Who can see this?` near the roster opening a small `Sheet` (`reading-visibility`) with `People in your Connect Group can see whether you've checked in today. This app does not show how long you read or what Bible app you used.`
Verify: fixtures mode at port 3102: member (`DEV_MOCK_PERSON_ID=1869`) HTML has no `leader-box`, no `connect.favor.church`, and the `main` element's computed `grid-template-columns` at 1280px is a single track (browser console `getComputedStyle(document.querySelector('main')).gridTemplateColumns`, paste); leader (`194`) HTML has `leader-tools` and exactly one `connect.favor.church`; pre-launch HTML contains `Reading together this October` and zero `Not yet` (the string lives at `components/app-shell.tsx:640` today and Task 9 removes it); `home-growth-sheet` opens by keyboard (Enter) and closes with Escape; 360px no horizontal scroll; gate green.

**Task 10. Lane C: Progress roadmap and Rewards.** `WORKER agy` (executor E4, worktree `/Users/rico/Git/wt-rmb-lane-c`, branch `issue/32-lane-c`, port 3103).
Touches: `components/screens/progress-screen.tsx`, `app/styles/progress.css`, `components/screens/rewards-screen.tsx`, `app/styles/rewards.css`, new `components/day-preview-sheet.tsx`.
Behavior:
- Progress pre-launch: replace the zero statistics with plan facts (`28 chapters`, `1 chapter a day`, `October 1 to 28 reading days`, `October 29 to 31 catch-up days`) (`plan-facts`), then the full calendar.
- Calendar: 28 day cells plus 3 grace cells (Oct 29 to 31) styled as catch-up days with the label `Catch up` (`calendar`). Every cell is a `<button data-day="{n}" data-day-state="{read|today|catch-up|upcoming|grace}">` (grace cells use `data-day` 29 to 31). Each cell uses `dayState()`; each state has a glyph or text in addition to color: read `✓`, today a ring plus `Today` sr-text, catch-up `Catch up` text, upcoming plain number; legend under the grid with the four states (`calendar-legend`). Every cell is a `<button>`: read cells open the preview with a `Read on` note, catch-up cells start the catch-up flow (existing `onCatchUp`), today opens the flow, upcoming cells open the day-preview sheet. Cell tap target at least 40px on phones (the named exception to the 44px rule; 44px where the width allows).
- Day-preview `Sheet` (`day-preview`): `Day N`, `Matthew N`, `longDate(entry.date)`, title and key passage (Quick Verse button allowed), `checkInOpensLabel(entry)`; no check-in button for upcoming days; wording never implies Scripture is locked (say `Read ahead any time. Check-in opens October N.`).
- Desktop: `.frame--rail` with calendar in main, stats/leaderboard/next reward in the rail; pre-launch rail shows plan facts and the leaderboard empty copy.
- Rewards pre-launch: `Starts October 1` context line, silhouettes visible (not grayscale-and-40%: use outline treatment at readable contrast), thresholds `3, 7, 14, 21, 28 chapters` legible, short line `Rewards celebrate your own consistency. Your group's home is a separate journey.` (`rewards-shelf`).
- Rewards active: locked text contrast at least 4.5:1, wider desktop shelf (`.frame`, two rows becoming one row of five at 1024px+), one-time earned shine (transform/opacity, `--dur-slow`) when `sessionStorage["rmb:medals-seen"]` is less than the current medal count, then update the key. No new reward types.
Verify: at port 3103 pre-launch HTML contains `plan-facts`, `calendar-legend`, 31 distinct `data-day` values, 28 `data-day-state="upcoming"` plus 3 `"grace"`, zero `I read today`; with `DEV_MOCK_TODAY=2026-10-10` the HTML shows `Catch up` on unread past days and `Today` on day 10; the day-preview sheet for day 20 shows `Check-in opens October 20.` and no check-in button (browser); `grep -in "locked" components/screens/rewards-screen.tsx` shows no user-facing word "locked" in pre-launch copy; 360px no horizontal scroll; gate green.

**Task 11. Lane D: Admin information design, onboarding and join copy, profile data note, favicon.** `WORKER sonnet` (executor E5, claude sonnet high, worktree `/Users/rico/Git/wt-rmb-lane-d`, branch `issue/32-lane-d`, port 3104).
Touches: `app/admin/page.tsx`, `app/admin/SectionTree.tsx`, `app/admin/HierarchyChart.tsx`, `app/admin/admin.css`, `components/profile-editor.tsx` (add one section only), `components/screens/group-picker-screen.tsx`, `components/screens/solo-screen.tsx`, `components/join-confirm.tsx`, `app/join/[code]/page.tsx`, `app/styles/onboarding.css`, `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png` (only if needed), `app/layout.tsx` (only icon metadata if file names change).
Behavior:
- Admin scope card (`admin-scope`): heading `Your view`; section copy `You're seeing the Connect Groups under the section or sections you lead in Favor's records. This dashboard shows group totals for your scope only.` listing the section names; global copy `You have access to the full Connect Group tree for this dashboard.` `resolveAdminScope()` untouched.
- `How progress is calculated` disclosure (`<details>`, `admin-progress-note`): `Progress is completed chapter check-ins divided by active members x 28 chapters. This keeps group sizes comparable.`
- Mobile below 768px: groups render as stacked cards (`admin-group-card`) with the six labeled values Group, Campus, Members, Read today, Progress, Home; the `<table>` renders at 768px+. Both derive from the same `section.groups` array via one shared row-formatting helper (in `SectionTree.tsx`); remove `min-width: 640px` and the horizontal scroll wrapper for the mobile state. Keep `<details>` accordions and the CSV link.
- Chart: legend labels at 12px with `boxWidth: 12`, wrap allowed; pre-launch (`series` present but every point before `PLAN_START` or no points) renders an intentional empty state `The chart starts filling in on October 1.` (`admin-chart-empty`) instead of implying missing data.
- Profile editor: compact `About your reading data` disclosure at the bottom (`reading-data-note`) with the spec copy. Profile stays avatar and translation.
- Group picker copy: `This is the Connect Group your October reading will count toward. You can switch later. Past check-ins stay with the group they were recorded with.` Solo: `You can start solo and join a Connect Group later. Your personal chapter progress stays with you.` Join confirmation body adds `Joining here adds you to this Connect Group in Favor's records.` Join behavior unchanged.
- Favicon: new `public/favicon.svg` (open book plus a small house/tent silhouette, `--navy` on `--cream` or coral accent, legible at 16 and 32px, no text), regenerate `public/favicon.ico` (16 and 32 sizes) from it, keep `app/layout.tsx` icon entries valid. Verify legibility by rendering at 16px and 32px and looking at it (ego-browser screenshot of a test HTML page, saved under `.office/qa/`).
Verify: at port 3104 with `ADMIN_PERSON_IDS` including the mock id, `/admin` HTML contains `admin-scope`, `admin-progress-note`, and at 360px `document.documentElement.scrollWidth <= 360` with `admin-group-card` visible and the table hidden (paste console checks); with an id outside `ADMIN_PERSON_IDS` and no section membership, `/admin` shows the no-access copy only; `git diff --stat BASE..HEAD -- public/favicon.svg public/favicon.ico` non-empty and `public/fonts public/avatar-base-v2 public/avatar-hair-v2 components/nav-icon.tsx` unchanged; `grep -c "in Favor's records" components/join-confirm.tsx app/join/\[code\]/page.tsx` at least 1 total; gate green.

**M2 landing (planner):** for each lane in turn: agy verification pass (E3 and E4 only), Opus review, fixes, `APPROVED`; then merge the lane branch into `issue/32-read-my-bible-ui-ux` (NA4), re-run the gate on the merged tree, push (NA2). Lanes may land in any order; each landing is recorded.

### Milestone M3: integration polish, QA matrix, docs (executor E6, claude sonnet high, primary worktree)

**Task 12. Cross-screen interaction, motion, typography, and accessibility polish.** `INLINE`. Read `/Users/rico/.claude/skills/frontend/references/audit-redesign.md` first.
Files: `app/styles/*.css`, `app/admin/admin.css`, `components/**` as needed (no new features).
Behavior: every interactive control has default, hover (fine pointer), focus-visible, active, disabled states from Task 3 applied; no `:hover` on static cards; all meaningful text meets the typography floor (sweep scout 2 section 7: every 7 to 10px declaration is either raised or justified as decorative in a CSS comment); motion uses the duration/easing tokens; progress bars animate only on value change (no animation on mount); `pageIn` subtle; no looping animation remains; reduced-motion covers everything; Quick Verse, day preview, home explainer, privacy note, profile editor, completion flow all open and close by keyboard with focus restoration; 3D home keyboard rotation and buttons work; modals respect `92dvh` and safe areas; touch targets at least 44px on nav and controls; calendar cells are the one named exception at 40px minimum on phones under 400px wide (a 7-column grid at 360px cannot hold 44px cells with gaps).
Verify: `grep -rnE "font-size: *(7|8|9|10|11)px" app/styles app/admin/admin.css` output pasted with each remaining line justified by `/* decorative */` on the same line; `pnpm test -- tests/css-rules.test.ts` green; gate green.

**Task 13. Responsive and user-state QA matrix, then fix findings.** `INLINE` (fixes go through the same executor; the planner re-runs spot checks).
Viewports: 360x800, 390x844, 430x932, 768x1024, 1024x768, 1280x800, 1440x900. States (see the QA state table): pre-launch member with one group (13358, real Rock), pre-launch leader (fixture 194), multi-group (fixture id with 2 memberships if present, otherwise note `not reproducible in fixtures` and use the group picker with a synthetic two-membership render), solo (fixture-absent id), active before check-in (`DEV_MOCK_TODAY=2026-10-08`), active after check-in (13358 only, chapter 8), missed chapter (`2026-10-10` with only chapter 8 read), grace (`2026-10-30`), closed (`2026-11-03`), section admin (real GT24 leader id, read-only), global admin (`ADMIN_PERSON_IDS`), no-admin user. Use ego-browser (`/Users/rico/.claude/skills/ego-browser/SKILL.md`) against port 3100; save screenshots to `.office/qa/<state>-<viewport>.png` (never committed); for each screen run the console checks: `scrollWidth <= viewport width`, no element with `getBoundingClientRect().right > innerWidth`, and record the results in `.office/qa/matrix.md`. Keyboard-only pass on Today, Connect, Progress, Rewards, Admin. Fix every Critical/Important finding; log minors.
Verify: `.office/qa/matrix.md` lists every viewport x state cell as PASS or a finding id; all 7 viewports pass the no-horizontal-scroll check on Today, Connect, Rewards, Progress, Admin; the planner spot-checks 3 cells by re-running them.

**Task 14. Docs and copy sync, Favor copy QA.** `INLINE`.
Files: `intent/COPY.md` (add every new user-facing string by screen; update changed ones), `intent/FLOWS.md` (only if a flow changed: the day-preview and grace dashboard are new entry points to the catch-up flow), `intent/DECISIONS.md` (append rows for D2 palette tones, D5 dev clock, favicon redesign, location picker removal), `README.md` (`DEV_MOCK_TODAY`).
Verify: `grep -rn "—" --include=*.ts --include=*.tsx components app lib; grep -n "—" intent/COPY.md intent/DESIGN.md intent/DECISIONS.md README.md` both print nothing; `grep -rniw "fam" components app intent/COPY.md` = 0; `grep -rn "Fluro" components app intent` = 0; every `data-section` name in `components/**` appears in `intent/COPY.md` (script: list `data-section="..."` values, grep each in COPY.md, paste misses = none); gate green.

**Final closeout (planner, named actions NA5 to NA8):** final gate, approval summary comment, remove the plan in a dedicated commit, push, mark PR 33 ready, merge into `main`, production smoke, report, ledger row, worktree cleanup.

## 4. Dependency graph and waves

| Task | Depends on | Touches |
|---|---|---|
| 0 bootstrap | none | `docs/plans/**`, PR 33 body and one comment |
| 1 split TSX | 0 | `components/app-shell.tsx`, `components/screens/*.tsx` (new) |
| 2 split CSS | 0 | `app/globals.css`, `app/styles/*.css` (new) |
| 3 tokens + frames | 1, 2 | `app/globals.css` `:root`, `app/styles/{frame,base,motion,nav}.css`, class hooks in `components/screens/*.tsx`, `app/admin/page.tsx`, `intent/DESIGN.md` |
| 4 helpers + tests | 0 | `lib/plan.ts`, `lib/game.ts`, `tests/plan-phase.test.ts`, `tests/game.test.ts`, `tests/plan-display.test.ts` |
| 5 dev clock | 4 | `lib/dev-clock.ts`, `app/actions/checkIn.ts`, `lib/data/stats.ts`, `lib/admin/stats.ts`, `app/page.tsx`, `components/app-shell.tsx`, `components/use-today.ts`, `tests/dev-clock.test.ts`, `README.md` |
| 6 Sheet + picker removal | 1, 2 | `components/sheet.tsx`, `components/{scripture-popup,completion-flow,profile-editor}.tsx`, `app/styles/{sheet,completion}.css` |
| 5b widen checkIn | 4, 5 | `app/actions/checkIn.ts`, `lib/data/stats.ts`, `lib/game.ts`, `tests/checkin-group-state.test.ts` |
| 8 lane A | M1 landed | `components/screens/today-screen.tsx`, `app/styles/today.css`, `components/completion-flow.tsx`, `app/styles/completion.css`, `components/app-shell.tsx` (prop pass-through lines only) |
| 9 lane B | M1 landed | `components/screens/connect-screen.tsx`, `app/styles/connect.css`, `components/rotatable-home.tsx`, `app/styles/home3d.css`, `components/home-growth-sheet.tsx`, `components/reading-visibility-note.tsx` |
| 10 lane C | M1 landed | `components/screens/{progress,rewards}-screen.tsx`, `app/styles/{progress,rewards}.css`, `components/day-preview-sheet.tsx` |
| 11 lane D | M1 landed | `app/admin/**`, `components/profile-editor.tsx`, `components/screens/{group-picker,solo}-screen.tsx`, `components/join-confirm.tsx`, `app/join/[code]/page.tsx`, `app/styles/onboarding.css`, `public/favicon.*`, `public/apple-touch-icon.png`, `app/layout.tsx` icons |
| 12 polish | M2 landed | `app/styles/**`, `app/admin/admin.css`, `components/**` |
| 13 QA matrix | 12 | fixes anywhere in scope; `.office/qa/**` (untracked) |
| 14 docs | 13 | `intent/COPY.md`, `intent/FLOWS.md`, `intent/DECISIONS.md`, `README.md` |

Waves:

- **Wave 1 (E1, serial inside one worktree):** 0 → {1, 2, 4} → 3 → 5 → 5b → 6. Tasks 1, 2, 4 have disjoint touches but one writer runs them in sequence; no parallel writers in the primary worktree.
- **Wave 2 (four worktrees in parallel):** 8 ∥ 9 ∥ 10 ∥ 11. Touches are disjoint by construction after Wave 1's splits. Lane A's `app-shell.tsx` edit is limited to prop pass-through lines; no other lane touches that file.
- **Wave 3 (E6, serial):** 12 → 13 → 14.

## 5. Task assignment table

Row 0: executors. The planner launches only these, the code reviewer, and the plan reviewer.

| # | Repo / worktree | Executor | Model + effort | Branch @ base | Scope |
|---|---|---|---|---|---|
| E1 | `/Users/rico/Git/wt-rmb-issue32` | claude (herdr agent `rmb-m1`) | `sonnet` `high` | `issue/32-read-my-bible-ui-ux` @ `8e800fd` | Tasks 0 to 6 end to end, then handoff |
| E2 | `/Users/rico/Git/wt-rmb-lane-a` | claude (herdr agent `rmb-lane-a`) | `sonnet` `high` (D6) | `issue/32-lane-a` @ M1 tip | Task 8 |
| E3 | `/Users/rico/Git/wt-rmb-lane-b` | agy | `gemini-3.8-flash-high` | `issue/32-lane-b` @ M1 tip | Task 9 |
| E4 | `/Users/rico/Git/wt-rmb-lane-c` | agy | `gemini-3.8-flash-high` | `issue/32-lane-c` @ M1 tip | Task 10 |
| E5 | `/Users/rico/Git/wt-rmb-lane-d` | claude (herdr agent `rmb-lane-d`) | `sonnet` `high` | `issue/32-lane-d` @ M1 tip | Task 11 |
| E6 | `/Users/rico/Git/wt-rmb-issue32` | claude (herdr agent `rmb-m3`, resume of E1's session if its measured context cost is below a fresh brief, else fresh) | `sonnet` `high` | `issue/32-read-my-bible-ui-ux` @ M2 tip | Tasks 12 to 14 |

Caller override echoed: Rico asked for multiple parallel executors and agy on frontend lanes (D3). Each executor still owns exactly one worktree; the one-writer-per-tree rule is intact.

Per-task rows (instructions to the executors; `herdr` is the dispatch form under `HERDR_ENV=1`):

| # | Task | Worker brand | Model + effort | Dispatch | Diagnosis | Why this form |
|---|---|---|---|---|---|---|
| 0 | Bootstrap | E1 itself | sonnet high | inline | settled | Mechanical git/gh steps; a brief would exceed the commands |
| 1 | Split TSX | E1 itself | sonnet high | inline | settled | Pure move with parity check; the executor holds the whole file; a worker would re-read 988 lines for no tier gain |
| 2 | Split CSS | E1 itself | sonnet high | inline | settled | Same as 1; the multiset diff is the gate, not the brand |
| 3 | Tokens, frames, DESIGN.md | E1 itself | sonnet high | inline | settled | Design-system decisions that every lane consumes; one author keeps them coherent; a delegation would buy nothing but a hand-off seam |
| 4 | Helpers + tests | E1 itself | sonnet high | inline | settled | Deliverable is evidence (tests); routed to the strongest available writer, not to agy |
| 5 | Dev clock | E1 itself | sonnet high | inline | settled | Touches guarded server paths; correctness over speed; small |
| 6 | Sheet + picker removal | E1 itself | sonnet high | inline | settled | Focus-trap correctness is a11y-critical and cross-cutting; small enough that a brief exceeds the edit |
| 8 | Lane A Today + completion | claude | sonnet high | herdr pane, own worktree | settled | Longest multi-part brief plus the widened contract consumer; D6 puts it on sonnet |
| 9 | Lane B Connect | agy | Flash latest high | herdr pane, own worktree | settled | Same as 8 |
| 10 | Lane C Progress + Rewards | agy | Flash latest high | herdr pane, own worktree | settled | Same as 8 |
| 11 | Lane D Admin + copy + favicon | claude | sonnet high | herdr pane, own worktree | settled | Admin cards derive from data and must not drift from the table; favicon needs judgement; sonnet where quality matters (D3) |
| 12 | Polish | E6 itself | sonnet high | inline | settled | Cross-cutting sweep over files it merged; one writer |
| 13 | QA matrix + fixes | E6 itself | sonnet high | inline | settled | Browser-driven, long, stateful; a worker would return mid-wait |
| 14 | Docs + copy QA | E6 itself | sonnet high | inline | settled | Needs the full diff in context to enumerate strings; a haiku worker would miss strings |

Executors may fan out read-only helpers (a pane below themselves, per the Herdr skill) for things like screenshot capture; they never fan out a second writer into their tree.

**Named fallback:** if an agy lane fails the verification pass twice or stalls (quota, swallowed prompt) after one relaunch, that lane is re-dispatched to claude `sonnet` `high` in the same worktree from the lane's last commit, with the same brief. Recorded as `reroute_from: agy`.

### Fan-out tree

```
PLANNER (claude opus, this session, pane w1P:p5)
  │
  ├─▶ PLAN-REVIEWER  claude opus low  · one pass · retires            [reviewer column]
  │
  ├─▶ E1 rmb-m1      claude sonnet high · wt-rmb-issue32 · tasks 0-6   [executor column]
  │     └─ (optional read-only helper panes below it)
  │
  ├─▶ CODE REVIEWER R1  claude opus low · M1, lanes A+C, M3            [reviewer column]
  ├─▶ CODE REVIEWER R2  claude opus low · lanes B+D (D7)                 [reviewer column]
  │
  ├─▶ E2 lane-a  claude sonnet high · wt-rmb-lane-a · task 8 ┐
  ├─▶ E3 lane-b  agy Flash high · wt-rmb-lane-b · task 9   ├ parallel after M1 lands
  ├─▶ E4 lane-c  agy Flash high · wt-rmb-lane-c · task 10  │  (planner: agy verification pass ×3,
  ├─▶ E5 lane-d  claude sonnet high · wt-rmb-lane-d · task 11 ┘   review, merge, gate, push)
  │
  └─▶ E6 rmb-m3      claude sonnet high · wt-rmb-issue32 · tasks 12-14
```

## 6. Out of scope

Rock structures, roles, memberships, or sections; new Rock writes; database migrations or persisted reading-location data; check-in date rules or server enforcement (beyond the dev-only clock injection); admin scope semantics; individual rankings; new reward types; social sharing, reminders, notifications; new Bible plans; font-family changes; in-app icon replacement; exposing `connect.favor.church` to non-leaders; Vercel preview environment configuration; Auth0 preview mapping; dark mode; Tailwind utility adoption in markup; removing the unused `public/file.svg`, `globe.svg`, `window.svg` (harmless, left alone).

## 7. GOAL block

```yaml
goal: Read My Bible feels intentional before, during, and after October across phone, tablet, and desktop, with the audit's pre-launch, responsive, explanatory, motion, admin, and favicon changes merged to main and smoke-tested in production, and no change to Rock structures, writes, data schema, check-in rules, fonts, or in-app icons.
done_criteria:
  - id: dc1
    statement: The full gate is green at the reviewed HEAD of the primary worktree.
    verify: cd /Users/rico/Git/wt-rmb-issue32 && pnpm lint && pnpm test && pnpm build   # paste tail; exit 0 for all three
  - id: dc2
    statement: app-shell.tsx is an orchestrator; screens live in components/screens; the CSS is split into app/styles with every original rule preserved.
    verify: test -f components/screens/today-screen.tsx && test -f app/styles/today.css && [ "$(wc -l < components/app-shell.tsx)" -lt 400 ] && grep -c "@import \"./styles/" app/globals.css   # >= 8
  - id: dc3
    statement: Display helpers exist with tests covering every phase boundary and all four day states, each shown red when broken.
    verify: pnpm test -- tests/plan-display.test.ts tests/plan-phase.test.ts tests/game.test.ts   # passes; handoff mutation table has one red row per new test
  - id: dc4
    statement: DEV_MOCK_TODAY switches the app's date in development and is inert in production builds.
    verify: pnpm test -- tests/dev-clock.test.ts && grep -rln "DEV_MOCK_TODAY" --include=*.ts --include=*.tsx . | sort   # exactly lib/dev-clock.ts and tests/dev-clock.test.ts
  - id: dc5
    statement: A shared Sheet with focus trap and restore backs every modal; the reading-location picker is gone.
    verify: test -f components/sheet.tsx; for f in scripture-popup completion-flow profile-editor; do grep -q "<Sheet" components/$f.tsx || echo "MISSING $f"; done   # prints nothing ; grep -rl "modal-wrap" components | grep -v sheet.tsx   # prints nothing ; grep -rn 'Where did you read\|location-grid\|LOCATIONS' components app/styles | wc -l   # 0
  - id: dc6
    statement: Design tokens, page frames, interaction states, and reduced-motion coverage exist and are documented.
    verify: grep -c -- "--dur-base\|--ease-out\|--space-4\|--radius-md" app/globals.css   # >= 4 ; test -f intent/DESIGN.md ; pnpm test -- tests/css-rules.test.ts   # green: hover only inside (hover: hover), no infinite, keyframes covered, font floor
  - id: dc7
    statement: Pre-launch Today shows hero, Day 1 preview, readiness, home preview (when grouped), how-it-works, and roadmap link, with no check-in action and no behind/not-yet language.
    verify: H=$(.office/tools/render.sh 3100 / DEV_MOCK_PERSON_ID=13358); for s in prelaunch-hero day1-preview readiness how-it-works roadmap-link; do echo "$s $(grep -o "data-section=\"$s\"" <<<"$H" | wc -l)"; done   # each 1 ; grep -c "I read today" <<<"$H"   # 0 ; grep -ciE "\b0 of [0-9]+\b|haven't|not started|behind|not yet|so far" <<<"$H"   # 0 (deficit-language property, not one string)
  - id: dc8
    statement: Active, grace, and closed Today states render their dedicated compositions.
    verify: for d in 2026-10-08:reading-card 2026-10-30:grace-dashboard 2026-11-03:closed-summary; do .office/tools/render.sh 3100 / DEV_MOCK_PERSON_ID=13358 DEV_MOCK_TODAY=${d%%:*} | grep -c "data-section=\"${d##*:}\""; done   # 1, 1, 1
  - id: dc9
    statement: Ordinary Connect members get a single-column desktop Connect with no Leader Tools rail and no connect.favor.church link; leaders get the rail with the link once.
    verify: .office/tools/render.sh 3100 / ROCK_API_KEY= DEV_MOCK_PERSON_ID=1869 | grep -c "leader-tools\|connect.favor.church"   # 0 ; then DEV_MOCK_PERSON_ID=194 -> grep -c "connect.favor.church" = 1 and grep -c "leader-tools" = 1 ; plus pasted getComputedStyle(main).gridTemplateColumns for member at 1280px showing one track
  - id: dc10
    statement: Progress shows the full roadmap (28 days plus 3 grace cells) with four non-color-only states, and upcoming days open a preview that names the check-in date and offers no check-in.
    verify: H=$(.office/tools/render.sh 3100 / DEV_MOCK_PERSON_ID=13358); grep -o 'data-day="[0-9]*"' <<<"$H" | sort -u | wc -l   # 31 ; grep -o 'data-day-state="upcoming"' <<<"$H" | wc -l   # 28 pre-launch ; grep -c 'data-section="calendar-legend"' <<<"$H"   # 1 ; grep -c "I read today" <<<"$H"   # 0 ; with DEV_MOCK_TODAY=2026-10-10 and chapter 8 read as 13358: states today=1, catch-up=8 (days 1-7 and 9), read=1, upcoming=18 ; browser: open day 20 preview, paste its text containing "Check-in opens October 20." and assert no button with text "I read today"
  - id: dc11
    statement: Readers can discover how the home grows, what their group can see, and why their admin scope exists; coins and stage are explained as distinct.
    verify: HTML greps: home-growth-sheet trigger present on Connect; reading-visibility trigger present; /admin as global admin contains data-section="admin-scope" and "admin-progress-note"; sheet copy contains "Coins celebrate every chapter"
  - id: dc12
    statement: Admin group data is readable on a 360px phone without horizontal table scrolling.
    verify: browser at 360x800 on /admin: document.documentElement.scrollWidth <= 360 and document.querySelector('.admin-group-card') !== null and getComputedStyle(document.querySelector('.admin-table') ?? document.body).display === 'none' (paste)
  - id: dc13
    statement: No core reader screen or Admin horizontally scrolls at 360px, and no accidental empty rail exists at 1024px+ (rail only when it has content).
    verify: .office/qa/matrix.md rows for Today, Connect, Rewards, Progress, Admin at 360x800 all PASS scrollWidth check; planner re-runs Today and Admin at 360 and Connect (member) at 1280
  - id: dc14
    statement: Motion honors reduced motion, nothing loops, no information is hover-only, meaningful text meets the floor.
    verify: pnpm test -- tests/css-rules.test.ts   # green at final HEAD ; grep -rnE "font-size: *(7|8|9|10|11)px" app/styles app/admin/admin.css | grep -v "decorative" | wc -l   # 0
  - id: dc15
    statement: Frozen surfaces are unchanged and the favicon is new.
    verify: git diff --stat 8e800fd..HEAD -- public/fonts public/avatar-base-v2 public/avatar-hair-v2 components/nav-icon.tsx db drizzle lib/rock/client.ts lib/admin/access.ts app/actions/joinByCode.ts   # empty ; git diff --stat 8e800fd..HEAD -- public/favicon.svg public/favicon.ico   # non-empty ; diff <(git show 8e800fd:app/globals.css | grep -o 'font-family:[^;]*' | sort) <(cat app/globals.css app/styles/*.css | grep -o 'font-family:[^;]*' | sort)   # empty: same multiset of font-family values
  - id: dc16
    statement: Copy passes Favor QA and intent docs record the new strings and decisions.
    verify: (grep -rn "—" --include=*.ts --include=*.tsx components app lib; grep -n "—" intent/COPY.md intent/DESIGN.md intent/DECISIONS.md README.md) | wc -l = 0; grep -rniw "fam" components app intent/COPY.md | wc -l = 0; grep -c "DEV_MOCK_TODAY" README.md intent/DECISIONS.md >= 1 each; data-section names all present in intent/COPY.md (paste script output)
  - id: dc17
    statement: PR 33 is merged into main, production serves the merged commit, and the smoke pass is green.
    verify: gh pr view 33 --json state,mergeCommit; git merge-base --is-ancestor <mergeCommit> origin/main; npx vercel ls readmybible-app --scope favor-church shows READY for that commit; curl -sI https://readmybible-app.favor.church/ | head -1 (200 or 302 to login); curl -s https://readmybible-app.favor.church/favicon.svg | grep -c "<svg" = 1 and differs from BASE content
milestones:
  - id: m1
    criteria: [dc1, dc2, dc3, dc4, dc5, dc6]
    lands_on: issue/32-read-my-bible-ui-ux
  - id: m2
    criteria: [dc7, dc8, dc9, dc10, dc11, dc12]
    lands_on: issue/32-read-my-bible-ui-ux
  - id: m3
    criteria: [dc13, dc14, dc15, dc16, dc17]
    lands_on: main
named_actions:
  - id: NA1
    action: E1 bootstrap. `git add docs/plans/issue-32-ui-ux-implementation.md && git commit -m "docs: add auto-office implementation plan for #32"`; `git push origin issue/32-read-my-bible-ui-ux`; `gh pr edit 33 --body-file .office/pr-body.md` (existing body plus the plan deeplink section); `gh pr comment 33 --body-file .office/pr-bootstrap-comment.md`
    target: GitHub PR 33 and branch issue/32-read-my-bible-ui-ux on origin
    changes: one docs commit on the PR branch; PR body gains a plan deeplink; one comment
    dry_run: `git status --short` clean except the plan; `git log --oneline origin/issue/32-read-my-bible-ui-ux..HEAD` shows exactly the plan commit
    revert: `git push origin <8e800fd>:issue/32-read-my-bible-ui-ux --force-with-lease` (planner only); PR body restored from `.office/pr-body-before.md`
    read_back: `gh pr view 33 --json body,comments` shows the deeplink and the comment; `git ls-remote origin refs/heads/issue/32-read-my-bible-ui-ux` equals local HEAD
  - id: NA2
    action: Planner milestone landing. From /Users/rico/Git/wt-rmb-issue32 after the gate is green and the reviewer returned APPROVED: `git rev-parse --abbrev-ref HEAD` (must print issue/32-read-my-bible-ui-ux) then `git push origin issue/32-read-my-bible-ui-ux`
    target: origin branch issue/32-read-my-bible-ui-ux (not a deploying branch; the Vercel preview build fails on missing env by D4 and is ignored)
    changes: advances the PR branch
    dry_run: `git log --oneline origin/issue/32-read-my-bible-ui-ux..HEAD`
    revert: `git push origin <previous remote tip>:issue/32-read-my-bible-ui-ux --force-with-lease`
    read_back: `git ls-remote origin refs/heads/issue/32-read-my-bible-ui-ux` equals `git rev-parse HEAD`
  - id: NA3
    action: Planner creates lane worktrees after M1 lands. For x in a b c d: `git -C /Users/rico/Git/wt-rmb-issue32 worktree add /Users/rico/Git/wt-rmb-lane-$x -b issue/32-lane-$x HEAD`; `cp /Users/rico/Git/wt-rmb-issue32/.env.local /Users/rico/Git/wt-rmb-lane-$x/.env.local`; `pnpm install --frozen-lockfile` in each
    target: local filesystem only
    changes: four local worktrees and branches
    dry_run: `git worktree list`
    revert: `git worktree remove --force <path>` and `git branch -D issue/32-lane-$x`
    read_back: `git worktree list` shows the four paths at the M1 tip
  - id: NA4
    action: Planner merges an APPROVED lane. In /Users/rico/Git/wt-rmb-issue32: `git rev-parse --abbrev-ref HEAD` (must print issue/32-read-my-bible-ui-ux); `git merge-tree $(git merge-base HEAD issue/32-lane-$x) HEAD issue/32-lane-$x | grep -c "<<<<<<<"` (0 expected); `git merge --no-ff issue/32-lane-$x -m "merge: lane $x (<task name>) for #32"`; then the full gate; then NA2
    target: local PR branch, then origin via NA2
    changes: lane commits land on the PR branch
    dry_run: the merge-tree conflict count
    revert: `git reset --hard <pre-merge sha>` before push; `git revert -m 1 <merge sha>` after
    read_back: `git log --oneline -1` is the merge commit; gate output green on the merged tree
  - id: NA5
    action: E1 first-executor-completion comment: `gh pr comment 33 --body-file .office/pr-first-completion.md` (status, handoff path, commit range, HEAD, gate output, next resume point)
    target: GitHub PR 33
    changes: one comment
    dry_run: file exists and names the real HEAD
    revert: `gh api -X DELETE repos/favorchurch/readmybible-app.favor.church/issues/comments/<id>`
    read_back: `gh pr view 33 --json comments` contains it
  - id: NA6
    action: Planner final approval summary: `gh pr comment 33 --body-file .office/pr-approval-summary.md` (reviewer session id, final HEAD, rounds, changes required and why)
    target: GitHub PR 33
    changes: one comment
    dry_run: file names the final HEAD that the reviewer approved
    revert: delete the comment as in NA5
    read_back: `gh pr view 33 --json comments` contains it
  - id: NA7
    action: Planner closeout. In /Users/rico/Git/wt-rmb-issue32 on issue/32-read-my-bible-ui-ux: record the current production deployment (`npx vercel ls readmybible-app --scope favor-church --prod | head -3`) into .office/rollback.md; `git rm docs/plans/issue-32-ui-ux-implementation.md && git commit -m "chore: remove implementation plan before merge (#32)"`; `git push origin issue/32-read-my-bible-ui-ux`; `gh pr ready 33`; `gh pr merge 33 --merge --subject "Improve Read My Bible pre-launch, responsive, and information UX (#32)"`
    target: GitHub PR 33 and origin/main (production deploy via Vercel git integration)
    changes: main advances by the merge commit; Vercel builds and promotes production
    dry_run: final gate green on the exact HEAD being merged; `gh pr view 33 --json mergeable,mergeStateStatus`; `git fetch origin && git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main | grep -c "<<<<<<<"` = 0
    revert: `git revert -m 1 <merge sha> && git push origin main`, or Vercel "promote" of the deployment recorded in .office/rollback.md
    read_back: `gh pr view 33 --json state,mergeCommit` = MERGED; `git merge-base --is-ancestor <mergeCommit> origin/main`; `npx vercel ls readmybible-app --scope favor-church` shows the new production deployment READY for that commit; production smoke: `curl -sI https://readmybible-app.favor.church/` (200 or 302), `curl -s https://readmybible-app.favor.church/favicon.svg` is the new SVG, `curl -sI https://readmybible-app.favor.church/admin` redirects logged-out users; Rico's own logged-in check of Today, Connect, Progress, Rewards is requested in the report (not performed by the run)
  - id: NA8
    action: QA check-in rows. The run READS `readmybible.checkins` before and after (`node .office/db-checkins-count.mjs`, read-only). If rows exist for 13358 at closeout, the planner reports them and asks Rico whether to delete them; the run performs no deletion on its own.
    target: production Supabase table readmybible.checkins
    changes: none by the run
    dry_run: the count script
    revert: n/a
    read_back: the count script output pasted into the report (baseline 0 at plan time)
non_goals:
  - Any Rock write beyond what the app already does for a real user (and none during QA)
  - Schema, migration, or new persisted fields
  - Changing check-in validation rules or admin scope semantics
  - Fonts, in-app icons, dark mode, new hue families
  - Vercel or Auth0 configuration changes
  - Individual rankings, new rewards, notifications, sharing, new plans
  - Working in the primary checkout /Users/rico/Git/readmybible-app.favor.church
blast_radius:
  repos: [favorchurch/readmybible-app.favor.church]
  environments: [local dev in worktrees, GitHub PR 33, production via the final merge of PR 33 into main]
caps:
  review_rounds_per_task: 5
  agy_consecutive_tasks: 3
  loop_iterations: 24
```

## 8. Review gates and evidence rules for this run

- Code reviewers (D7): two fresh claude `opus` `low` sessions in Herdr panes (reviewer column). R1 reviews M1 (tasks 0 to 6 as one package), lane A, lane C, and M3. R2 reviews lanes B and D, primed with a written digest of the M1 verdict. Each is resumed by session id within its own scope while measured cost favors it. Diff packages handed as files under `.office/review/`.
- Agy verification (mandatory before review of tasks 9 and 10): the planner runs the seven checks from `agy-office/skills/agy-verification` and writes the result to `.office/review/verify-lane-<x>.md`.
- Agy miss-list appended to the reviewer rubric for lanes B and C.
- Pointed reviewer questions: "Can any pre-launch state show a check-in control?"; "Can a member reach connect.favor.church or an empty rail?"; "Does any new date logic bypass the helpers or read the device clock directly?"; "Does DEV_MOCK_TODAY have any effect when NODE_ENV=production?"; "Does the mobile admin card view derive from the same data as the table?"; "Is any information hover-only or color-only?"
- Evidence: real pasted gate output per HEAD; `git status --short` with every status report; screenshots and console checks saved under `.office/qa/`; live read-backs for NA1 to NA7.
- PR comments: exactly three (NA1, NA5, NA6). Nothing else is posted.

## 9. Risks

- **R1 CSS split changes cascade order.** Mitigation: Task 2's multiset diff plus rendered parity; keep destination order equal to source order.
- **R2 `@import` of local CSS under Tailwind v4 postcss.** Mitigation: Task 2 verifies in the build and names the fallback (import in `app/layout.tsx`).
- **R3 agy lanes skip requirements or invent props.** Mitigation: `data-section` markers make skips greppable; verification pass; miss-list; named sonnet fallback.
- **R4 Lane merge conflicts in `components/app-shell.tsx`** (lane A prop pass-through). Mitigation: only lane A touches it; `git merge-tree` dry run before each merge.
- **R5 QA check-ins land in production data.** Mitigation: only person 13358, listed in handoffs, counted before and after, cleanup is Rico's call (NA8). Redis group stats cache for group 24077 may hold a stale count for up to 5 minutes after any QA check-in.
- **R6 Claude weekly headroom (39% at plan time, resets 2026-09-04 20:00 UTC).** Mitigation: agy carries three lanes; if claude drains, pause and resume after the reset; that is a reroute, not a stop.
- **R7 The DEV_MOCK_TODAY change touches guarded server files.** Mitigation: two-sided production-guard test; reviewer question; grep that only `lib/dev-clock.ts` reads the var.

## 10. Planner self-review (step 7.4)

Checked before hand-off to the plan reviewer:

- Contradictions: the one-executor-per-repo default vs D3. Resolved by separate worktrees per executor with disjoint `Touches`; the one-writer-per-tree floor holds. Stated in section 5.
- Unexecutable assignments: agy has no `--effort` flag; the model slug carries the tier. E2 to E4 rows say so. `herdr agent start --kind agy` is unverified; the dispatch uses the wrapper-script form from `agy-office/skills/agy-cli` (learned 2026-09-03), with `office-spawn.sh` tried first for claude kinds only.
- Dead rules: none found. The old "one executor" fallback text was removed from section 5.
- Hand-waves found and fixed: "no visual change" in Tasks 1 and 2 was unverifiable; added the rendered-HTML parity diff and the CSS multiset diff. "Rail collapses when empty" needed a mechanism; specified `:has(> .frame__rail)`. Stage-up celebration needed a reliable source; specified `ratioAfterCheckIn` from existing `GroupStats` fields (verified at `lib/data/stats.ts:45-50`). The reading-location picker location was assumed to be in both branches; verified it is catch-up only (`completion-flow.tsx:94-110`), and Task 6 words the removal accordingly.
- Claims discipline: every `file:line` in section 1 was read by the planner or spot-checked from a scout report (scout claims at `app-shell.tsx:352, 585`, `globals.css:196`, `plan.ts:74-102`, `completion-flow.tsx` whole file, `stats.ts:1-60` were read directly).
- Verification that cannot fail: dc6's hover check is a grep that cannot see block context; the executor pastes the block-context check and the reviewer reads `motion.css` and `base.css`. dc13 relies on the QA matrix file; the planner re-runs three cells itself.
- Production safety: the only production-facing actions are NA7 (merge) and the QA check-in inserts (R5/NA8); both are named with preconditions, revert, and read-back.

Findings graded: Important (verification gaps in Tasks 1, 2, dc6) fixed in this version; Minor (Task 13 multi-group state may be unreproducible in fixtures) recorded with its fallback wording.

## 11. Plan-review record (step 7.5)

Fresh claude opus low reviewer, one pass, 16 findings (4 blockers). Report: `.office/review/plan-review-1.md`. Dispositions:

| # | Sev | Disposition | What changed |
|---|---|---|---|
| 1 | Blocker | accepted | Fixture ids corrected: leaders 194/18038, members 152/1869; role mapping stated once |
| 2 | Blocker | accepted, different mechanism | Hover-context, infinite, keyframes-coverage, and font-floor checks become `tests/css-rules.test.ts` (Task 3), a gate that can fail; dc6 and dc14 point at it |
| 3 | Blocker | accepted | Task 2 gate is an at-rule-keyed multiset diff plus computed-style snapshots at 3 viewports; HTML parity dropped for CSS |
| 4 | Blocker | accepted | Task 5 owns the seam: `computeToday(override)` drives every derived field and adds `displayPhase`; lanes consume `today` |
| 5 | Important | accepted | dc15 compares the multiset of `font-family` values |
| 6 | Important | accepted | `rotatable-home.tsx` and `home3d.css` move to Lane B |
| 7 | Important | accepted | Em-dash rule scoped to user-facing strings and docs this run edits; CSS and frozen intent docs excluded from the grep |
| 8 | Important (plausible) | accepted | Task 1 parity is visible DOM (innerText + class tree), not bytes |
| 9 | Important | accepted; reviewer's Fix adopted after Rico's D8 override | Task 5b widens `checkIn` to return server-authoritative before/after group state; the celebration compares those, never the cached page snapshot |
| 10 | Important | accepted | dc7 asserts the positive markers plus a deficit-language pattern; `Not yet` check moved to Lane B |
| 11 | Important | accepted | dc5 checks each modal file and forbids `modal-wrap` outside `sheet.tsx` |
| 12 | Important | accepted | Calendar cells carry `data-day` and `data-day-state`; dc10 counts states |
| 13 | Important | accepted | Planner-provided `.office/tools/render.sh` replaces the ad-hoc `pnpm dev &` commands; `reading-card` and sibling markers named in Task 8 |
| 14 | Minor | accepted | `lib/session.ts` carve-out dropped; `lib/dev-clock.ts` is the single reader |
| 15 | Minor | accepted | 44px rule with the calendar exception named; font-floor grep includes 11px |
| 16 | Minor | accepted | Task 0 preconditions reworded for a linked worktree |

Reviewer's correction accepted for the record: agy does expose `--effort`; the dispatch still carries the tier in the resolved model slug (`gemini-3.8-flash-high`) and adds `--effort high` where the launch form accepts it.

## 12. Approval record

Approved by Rico on 2026-09-03 with three caller overrides, echoed here: D6 lane A on claude sonnet high; D7 two Opus-low reviewer sessions (R1: M1, A, C, M3; R2: B, D); D8 the `checkIn` result contract may widen (Task 5b). Rico also confirmed the M1 splits stay as the enabler for parallel lanes. Approval authorizes the whole run end to end: NA1 to NA8, including the merge of PR 33 into main at closeout.
