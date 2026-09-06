# Implementation Plan — Issue #35

## GOAL

Ship the Read My Bible modifications Rico specified on 2026-09-04: fix the two
visual defects, give home stages icons wherever they are named, build a
ten-version Scripture layer with inline text and outbound Bible/commentary
links, add a view-only `?test=1` debug panel, and wire the two logos.

## done_criteria

1. The Tent no longer floats in the pre-launch Today illustration, at every
   rotation angle, and the other five stages are unregressed. (#36)
2. The day-preview key-passage control reads as a labelled button in the app's
   sans face and still opens the quick-verse popup. (#37)
3. The Read My Bible wordmark links to https://favor.church/readmybible. (#38)
4. The Favor Church logo renders legibly in the profile editor, served from
   `public/`, not hotlinked. (#39)
5. Six flat SVG stage glyphs exist as one shared component, legible at 24px. (#40)
6. Every stage mention in Connect — the growth-sheet list and each inline
   threshold line — shows its icon. (#41)
7. `Translation` covers ten versions with per-version metadata: display name,
   Bible.com id, publisher attribution line, full-text flag. Every consumer
   updated, including the zod enum and the API route's validation. (#42)
8. Matthew text is committed and served on demand: full book for NET and KRV,
   key passages for the other eight. `pnpm build` shows no size regression
   attributable to Scripture data in the client bundle. (#43, #45)
9. A version dropdown appears on every verse surface, writes through to the
   profile, and Seoul defaults to KRV while remaining overridable. (#44)
10. Bible and Commentaries link groups render, and every one of the eight
    outbound URLs resolves for Matthew 1 (verified, not assumed). (#45)
11. Readers on NET or KRV can read the full daily chapter in-app with its
    attribution line. (#46)
12. `?test=1` opens a floating panel simulating day, completion, stage/group %,
    role and phase; `?day=N` is an alias for it. Check-in is disabled under test
    mode and a test-mode session performs no Supabase or Rock write — asserted
    by a test, not by inspection. (#47)
13. `pnpm lint` and `pnpm build` both pass. Existing tests pass.
14. Screenshots of every changed surface captured via ego-browser and reviewed.

## blast_radius

This repo only. Work lands on branch `issue-35-scripture-and-debug` behind a
draft PR. Merging that PR to `main` auto-deploys production — that merge is the
only production-facing act in this run and it is planner-held.

No Rock writes. No Supabase schema change beyond a `profiles.translation`
constraint widening if one exists. No external sends.

## named_actions (planner-held, irreversible or outward)

1. **Merge the PR to `main`, which auto-deploys production.** Precondition: all
   done_criteria green, final Opus review APPROVED, `pnpm build` clean, screenshots
   reviewed. Revert target: `fb17b56`.

## non_goals

- Full Matthew for the eight restricted versions (ruled out, #35 Out of scope).
- Scraped commentary text (ruled out, D5).
- Debug mode that writes (ruled out, D8).
- Korean UI copy — bundling KRV gives Seoul the text, not a translated interface.
- Weakening the production `NODE_ENV` guard in `lib/dev-clock.ts`.

## Milestones

| # | Tasks | Lands when |
|---|---|---|
| M1 | #36 #37 #38 #39 | Criteria 1–4 green |
| M2 | #40 #41 | Criteria 5–6 green |
| M3 | #42 #43 #44 #45 #46 | Criteria 7–11 green |
| M4 | #47 | Criterion 12 green |

Dependencies: #41 after #40. #44 #45 after #42. #46 after #42 and #43.
M1 and M4 are independent of M2 and M3.

## Routing

| Role | Brand / model | Form | Why |
|---|---|---|---|
| Executor (whole plan) | `agy`, Flash high via `agy-model.sh high` | Herdr pane (HERDR_ENV=1) | Rico's instruction; agy at 100% headroom, frontend-shaped work is agy's fit |
| Task workers | `agy`, Flash high | Executor's call, Herdr panes | Parallel breadth across independent milestones |
| Code reviewer | `claude`, Opus **low** | Herdr pane | **Rico's override, 2026-09-04**: use Claude's own Opus low, not agy's `claude-opus-4-6-thinking`. Costs the Claude subscription (13% weekly remaining); accepted by Rico. |
| Plan reviewer | — | — | Waived by Rico |

Agy's three-consecutive-task cap applies: the executor re-probes headroom before
each dispatch and rotates workers.

## Per-task notes the executor must not lose

- **AGENTS.md**: this repo's Next.js differs from training data. Read
  `node_modules/next/dist/docs/` before writing route or caching code.
- **Build gate**: `pnpm build`, not just lint, before any task is called done.
  A production build stayed silently broken for a whole session in issue #32
  because only lint was run.
- **`pnpm`**, never npm or yarn.
- **Copy**: any user-facing string goes through the `speak-like-favor` skill.
- **Verification**: `ego-browser` screenshots must be *looked at*, not merely
  captured. Rico requires this.
- **#43 is the risky one**: it deletes or narrows live provider code paths.
  Do not leave both the bundled and the fetched path running.
- **#47's security property is the deliverable**, not the panel. Write the
  no-write assertion first.

## Open risks the executor owns

- **Text source for #43 is unnamed and must be settled first.** `bolls.life` is
  keyless and carries most of these versions (lessons from the issue-32 run
  recorded it as the working keyless provider after labs.bible.org died for
  server-side use). Confirm it actually serves MSG, NKJV, NASB, AMP and a Korean
  text before building the generator around it; fall back to per-version sources
  if not. Record what was used, in `intent/DECISIONS.md`.
- **KRV licensing is asserted, not verified.** 개역한글 (1961) is understood to be
  public domain; 개역개정 (1998) is not. Confirm which text the source actually
  returns before shipping it as the Seoul default. If only 개역개정 is available,
  treat KRV as a key-passages-only version like the other eight and say so.
- **#47 under a server-component tree.** `app/page.tsx` resolves day, role and
  phase on the server. The panel must override those as presentation state in a
  client boundary; it must not add a server-trusted query parameter.


## Dependency graph and waves

Styles are modular per screen (`app/styles/<screen>.css`), so most conflicts are
avoidable. `Touches:` sets below are the disjointness contract; re-verify them
against what earlier waves actually wrote before dispatching a parallel wave.

**Every implementer commits with an explicit pathspec.** `git add -A` and
`git commit -a` are forbidden in this run — parallel workers share one
`.git/index` and will sweep up each other's files. Verify with `git show --stat`
that your commit contains exactly your own files.

### Wave 1 — parallel (4 workers)

| Task | Issue | Strategy | Touches |
|---|---|---|---|
| T1 Floating tent | #36 | SONNET | `components/rotatable-home.tsx`, `app/styles/home3d.css` |
| T3 Wordmark link | #38 | HAIKU | `components/brand.tsx`, `app/styles/frame.css` |
| T5 Stage icon set | #40 | SONNET | `components/stage-icons.tsx` (new), `app/styles/misc.css` |
| T12 Debug panel | #47 | OPUS-tier rigor | `components/test-mode/` (new), `components/app-shell.tsx`, `app/page.tsx`, `tests/test-mode.test.ts` |

### Wave 2 — parallel (3 workers), after Wave 1

| Task | Issue | Strategy | Touches |
|---|---|---|---|
| T2 Key-passage restyle | #37 | SONNET | `components/day-preview-sheet.tsx`, `app/styles/progress.css` |
| T4 Favor logo | #39 | SONNET | `components/profile-editor.tsx`, `public/`, `app/styles/onboarding.css` |
| T6 Icons in Connect | #41 | SONNET | `components/home-growth-sheet.tsx`, `components/screens/connect-screen.tsx`, `app/styles/connect.css` — needs T5 |

### Waves 3–7 — serial

They all converge on `lib/scripture/` and `components/scripture-popup.tsx`, so
they cannot be parallelised honestly. Run one at a time.

| Wave | Task | Issue | Strategy | Touches |
|---|---|---|---|---|
| 3 | T7 Ten-version model | #42 | SONNET | `lib/scripture/types.ts`, `app/actions/saveProfile.ts`, `app/api/scripture/route.ts`, `components/avatar.tsx`, `components/profile-editor.tsx` — needs T4 |
| 4 | T8 Bundle and serve text | #43 | **OPUS-tier rigor** | `lib/scripture/**`, `scripts/`, the generated data dir, `tests/scripture.test.ts` — needs T7 |
| 5 | T9 Version dropdown | #44 | SONNET | `components/scripture-popup.tsx`, `components/profile-editor.tsx`, `components/screens/today-screen.tsx`, `lib/session.ts` — needs T7 |
| 6 | T10 Link groups | #45 | SONNET | `lib/scripture/reference.ts`, `components/scripture-popup.tsx`, `app/styles/misc.css` — needs T7 |
| 7 | T11 Inline chapter | #46 | SONNET | `components/day-preview-sheet.tsx`, `components/screens/today-screen.tsx` — needs T7, T8 |

**T8 is the task to slow down on.** It removes or narrows live provider code
paths (`esv.ts`, `nlt.ts`, `api-bible.ts`, `net.ts`) and the Redis cache. Leaving
both the bundled and the fetched path live is a failed task, not a safe hedge.
