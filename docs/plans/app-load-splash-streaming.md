# App load: layered splash + streaming home

Run: 954387d4-868a-4e7b-a221-348eb80094b7 · Base SHA: 65b84a8 · Gear: direct+review
Playbook: Change (Visual component) · Size: M

## Problem

A cold load of `/` shows a blank white document for ~5s. Evidence:

- No `loading.tsx` exists anywhere in the repo, so no route has a Suspense fallback.
- `app/layout.tsx:32-42` is a bare `<html><body>{children}</body></html>`. The first
  flush carries no shell, no background, nothing to paint.
- `lib/session.ts:62-131` (`getSessionContext`) awaits 4 parallel round-trips
  (`getPerson`, `getMemberships`, `getSectionMemberships`, Supabase `profiles`)
  and gates the `redirect()` calls, so it must complete before the page body runs.
- `app/page.tsx:21-80` then awaits a second, heavier `Promise.all`: `getRoster`,
  `getGroupMembersReadingHistory`, `getPersonReadingState`, `getGroupStats`,
  `getCampusBoard`, `getCampusName`, plus (dev only) `getAllConnectGroups` and
  `getAllCampusNames`.

Two serial waves of network work with nothing painted in between.

## Approach

Next 16.3.4 App Router flushes `layout` + the nearest `loading.tsx` fallback
*before* the page component's first await resolves. That single fact fixes the
blank screen for the session wave. Suspense inside the page then covers wave two.

Phase 1 — brand mark, ~0ms, from `app/loading.tsx` while session resolves.
Phase 2 — skeleton of the real home, once the shell streams, while Rock/DB resolve.
Phase 3 — real content swaps in.

The two phases layer inside one component via staggered CSS `animation-delay`,
not a JS timer, so the fallback stays a server component with zero client JS.

## Protected paths

- `lib/session.ts` — read only. Auth/redirect semantics are out of scope.
- `lib/rock/*`, `db/*` — no query or schema changes.
- `components/home3d*`, `full-home.tsx`, `rotatable-home.tsx` — the 3D work is not
  in scope; the skeleton stands in for it, it is not rewritten.
- `app/styles/motion.css` — the global `prefers-reduced-motion` guard at line 7
  already neutralises animation duration app-wide. New CSS must stay compatible
  with it and must not need its own override.

## Tasks

### Wave 1 (parallel, no shared files)

**T1 — Measure the 5s**
Touches: (none, read only). Depends on: nothing.
Instrument a cold load with `server-timing`-style logging around
`getSessionContext` and the `app/page.tsx` `Promise.all`. Record the split.
Outcome: a recorded ms breakdown of session vs page-data vs client hydration.
This decides whether phase 2 (skeleton) needs to be long-lived or is near-instant.

**T2 — Splash styles**
Touches: `app/styles/splash.css`, `app/globals.css` (one `@import` line).
Depends on: nothing.
New stylesheet following the existing per-feature convention. Uses existing tokens
only: `--cream`, `--navy`, `--font-display`, `--dur-slow`, `--ease-out`.
Brand-mark phase fades out and skeleton phase fades in on `animation-delay`.
No new animation library. Outcome: `pnpm lint` clean, tokens only, no hardcoded
colors or durations.

**T3 — Shell in the root layout**
Touches: `app/layout.tsx`.
Depends on: nothing.
Move the cream background and app frame into the layout body so the very first
flush paints. Must not regress the cold-load CLS fix already on main
(commit 3b8068e) or the `html`/`body` background alignment from PR #85.
Outcome: first paint is cream, not white.

### Wave 2 (depends on wave 1)

**T4 — `app/loading.tsx`**
Touches: `app/loading.tsx`, `components/app-splash.tsx`.
Depends on: T2, T3.
Root-level fallback, which every nested route without its own `loading.tsx`
inherits — this is the "global at layout level" coverage with one file.
Server component, no `"use client"`. Renders brand mark then skeleton.
Outcome: hard-navigating to `/`, `/admin`, `/join/<code>` paints the splash
immediately.

**T5 — Stream `app/page.tsx`**
Touches: `app/page.tsx`, `components/home-data.tsx` (new).
Depends on: T1, T4.
Keep `getSessionContext()` and both `redirect()` branches at the top — they
cannot move below a streaming boundary. Extract the second `Promise.all` and the
`AppShell` render into an async child, wrapped in
`<Suspense fallback={<AppSkeleton />}>`. The dev-only `campusGroupsP` branch and
its production `[]` guard must survive the move unchanged.
Outcome: shell HTML arrives before Rock/DB data.

### Wave 3

**T6 — Verification**
Depends on: T5.
`pnpm lint`, `pnpm test` (vitest — `tests/page-guest-branch.test.ts` and
`tests/welcome-landing.test.ts` both assert on the `/` branch and must stay green),
`pnpm build` (required gate per AGENTS.md; lint does not catch Next build
failures). Then ego-browser cold-load screenshots at mobile and desktop widths
with network throttling, reviewed visually.

## Known-bad tests

- Logged-out `/` must still render `WelcomeLanding` and never the splash-then-
  skeleton path. `tests/page-guest-branch.test.ts` covers this; confirm it fails
  if the guest branch is moved below the Suspense boundary.
- `not-found-in-rock` must still `redirect()`, not stream a shell then redirect.
- With `prefers-reduced-motion: reduce`, the splash must show a static brand mark
  and never a flash of both phases at once.

## Rollback

Single feature branch `feat/app-load-splash`. Rollback is `git revert` of the
squash commit, or closing the PR unmerged. No migrations, no external state, no
production writes. Merge to main auto-deploys production and stays a human
decision.

## model_assignments

- Orchestrator: `claude-opus-5[1m]`, canonical `opus-5`, effort high,
  harness Claude Code, **inline**. Owns intake, freeze, integration, closeout.
- Planner: same identity, **inline**. Gear `direct+review` funds no separate
  planner process; the plan is small and fully evidenced by static reads.
- Executor and reviewer: routed at dispatch, disclosed then. The reviewer must
  not be the agent that wrote the code.
