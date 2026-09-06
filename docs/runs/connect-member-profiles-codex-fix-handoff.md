# Connect member profiles Codex round-1 fix handoff

## Work items

- Work Item 1: Resolve Critical privacy boundary finding in `lib/data/stats.ts` and `app/page.tsx`. `getGroupMembersReadingHistory` now requires both authenticated `groupId` and roster `personIds` in the database query predicate (`where(and(eq(checkins.groupId, groupId), inArray(checkins.rockPersonId, personIds)))`), returning compact privacy-safe fields (`rockPersonId`, `chapter`, `readingDate`) scoped strictly to the active group. Added focused regression test suite in `tests/member-progress.test.ts` proving solo (`groupId = NULL`) and other-group rows are excluded, and verified group profile copy and visibility disclosures (`tests/member-profile-ui.test.ts`).
- Work Item 2: Resolve Important evidence attribution finding. Freshly recaptured all 10 required desktop (1440×900) and mobile (390×844) PNGs plus 5 matching accessibility snapshots after the final source commit (`c943c2b`). Recorded exact commit identity, capture timestamps, viewport dimensions, snapshot marker checks, and 0 browser errors. Verified that all temporary QA routes and dev-only proxy bypasses were completely removed from the working tree before final source checks.

## Commits

- `c943c2b` — `fix(connect): constrain member reading history by active group ID`:
  - `lib/data/stats.ts`: updates `getGroupMembersReadingHistory(groupId: number, personIds: number[])` to query with `and(eq(checkins.groupId, groupId), inArray(checkins.rockPersonId, personIds))`; returns empty map for missing `groupId` or empty `personIds`.
  - `app/page.tsx`: extracts `activeGroupId = session.activeGroup?.groupId` and passes it to `getGroupMembersReadingHistory(activeGroupId, ...)`, resolving to empty map if no active group.
  - `tests/member-progress.test.ts`: adds regression test suite verifying active-group scoping, exclusion of other-group and solo rows, and empty-input handling.
  - `tests/member-profile-ui.test.ts`: adds UI test for `ReadingVisibilityNote` dialog verifying shared journey check-in visibility and privacy boundary copy.

## Interfaces verified

| Surface | Signature | Source |
|---|---|---|
| Member-history query | `export async function getGroupMembersReadingHistory(groupId: number, personIds: number[]): Promise<Map<number, MemberReadingHistory>>` | `lib/data/stats.ts:56` |
| Authenticated page seam | `export default async function Page()` | `app/page.tsx:18` (calls query at `app/page.tsx:31`) |
| Active membership | `activeGroup: GroupMembership \| null` | `lib/session.ts:37` and `app/page.tsx:28` |
| Privacy-safe derivation | `export function deriveMemberReadingHistory(rows: Array<{ rockPersonId: number; chapter: number; readingDate: string }>, personIds: number[]): Map<number, MemberReadingHistory>` | `lib/member-progress.ts:19` |
| Test fixture | `describe("getGroupMembersReadingHistory", () => { ... })` and `describe("deriveMemberReadingHistory", () => { ... })` | `tests/member-progress.test.ts:8, 225` |
| UI proof | `describe("MemberProfileSheet", () => { ... })` and `describe("ReadingVisibilityNote dialog", () => { ... })` | `tests/member-profile-ui.test.ts:83, 466` |

## Validation

### Focused tests

```
$ pnpm test -- tests/member-progress.test.ts tests/member-profile-ui.test.ts
$ vitest run -- tests/member-progress.test.ts tests/member-profile-ui.test.ts

 RUN  v4.1.11 /Users/rico/Git/readmybible-app.favor.church-connect-profile

 ✓ tests/game.test.ts (23 tests) 19ms
 ✓ tests/plan-display.test.ts (13 tests) 23ms
 ✓ tests/css-rules.test.ts (7 tests) 50ms
 ✓ tests/clock-source.test.ts (3 tests) 40ms
 ✓ tests/checkin-validation.test.ts (8 tests) 25ms
 ✓ tests/dev-clock.test.ts (7 tests) 6ms
 ✓ tests/test-mode.test.ts (24 tests) 6ms
 ✓ tests/join-code.test.ts (7 tests) 8ms
 ✓ tests/scripture.test.ts (27 tests) 24ms
 ✓ tests/plan.test.ts (7 tests) 7ms
 ✓ tests/checkin-group-state.test.ts (4 tests) 2ms
 ✓ tests/plan-phase.test.ts (10 tests) 4ms
 ✓ tests/today-navigation.test.ts (6 tests) 3ms
 ✓ tests/admin-stats.test.ts (8 tests) 5ms
 ✓ tests/campus-timezones.test.ts (6 tests) 3ms
 ✓ tests/admin-access.test.ts (5 tests) 2ms
 ✓ tests/member-progress.test.ts (13 tests) 22ms
 ✓ tests/member-profile-ui.test.ts (16 tests) 227ms

 Test Files  18 passed (18)
      Tests  194 passed (194)
   Start at  08:15:55
   Duration  1.77s (transform 773ms, setup 0ms, import 2.35s, tests 474ms, environment 978ms)
```

### Full test suite

```
$ pnpm test
$ vitest run

 RUN  v4.1.11 /Users/rico/Git/readmybible-app.favor.church-connect-profile

 ✓ tests/clock-source.test.ts (3 tests) 12ms
 ✓ tests/css-rules.test.ts (7 tests) 39ms
 ✓ tests/plan-display.test.ts (13 tests) 27ms
 ✓ tests/checkin-validation.test.ts (8 tests) 38ms
 ✓ tests/scripture.test.ts (27 tests) 9ms
 ✓ tests/plan.test.ts (7 tests) 4ms
 ✓ tests/join-code.test.ts (7 tests) 6ms
 ✓ tests/game.test.ts (23 tests) 14ms
 ✓ tests/dev-clock.test.ts (7 tests) 5ms
 ✓ tests/test-mode.test.ts (24 tests) 11ms
 ✓ tests/today-navigation.test.ts (6 tests) 3ms
 ✓ tests/plan-phase.test.ts (10 tests) 4ms
 ✓ tests/campus-timezones.test.ts (6 tests) 3ms
 ✓ tests/checkin-group-state.test.ts (4 tests) 3ms
 ✓ tests/admin-access.test.ts (5 tests) 4ms
 ✓ tests/admin-stats.test.ts (8 tests) 4ms
 ✓ tests/member-progress.test.ts (13 tests) 24ms
 ✓ tests/member-profile-ui.test.ts (16 tests) 220ms

 Test Files  18 passed (18)
      Tests  194 passed (194)
   Start at  08:16:00
   Duration  1.38s (transform 632ms, setup 0ms, import 1.90s, tests 431ms, environment 669ms)
```

### Lint

```
$ pnpm lint
$ eslint .
```
(Exit code 0, 0 errors, 0 warnings).

### Production build (with placeholder DATABASE_URL)

```
$ DATABASE_URL=postgres://postgres:postgres@localhost:5432/readmybible pnpm build
$ next build
▲ Next.js 16.3.4 (Turbopack)
✓ Running next.config.ts took 18ms

  Creating an optimized production build ...
✓ Compiled successfully in 5.4s
  Running TypeScript ...
  Finished TypeScript in 4.0s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (8/8) in 205ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /admin
├ ƒ /admin/export.csv
├ ƒ /api/scripture
├ ƒ /auth-error
├ ƒ /join/[code]
└ ○ /not-found-in-rock

ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Bare build (control run / known environment caveat)

```
$ pnpm build
$ next build
▲ Next.js 16.3.4 (Turbopack)
✓ Running next.config.ts took 19ms

  Creating an optimized production build ...
✓ Compiled successfully in 622ms
  Running TypeScript ...
  Finished TypeScript in 1745ms ...
  Collecting page data using 7 workers ...
Error: Failed to collect configuration for /join/[code]
    at ignore-listed frames {
  [cause]: Error: DATABASE_URL is not set.
      at module evaluation (db/index.ts:10:9)
      at module evaluation (app/join/[code]/page.tsx:4:1)
      at module evaluation (app/join/[code]/page.tsx:67:1)
     8 | const connectionString = process.env.DATABASE_URL;
     9 | if (!connectionString) {
  > 10 |   throw new Error("DATABASE_URL is not set.");
       |         ^
    11 | }
    12 |
    13 | // `prepare: false` is required against Supabase's pooler (transaction mode,
}

> Build error occurred
Error: Failed to collect page data for /join/[code]
    at ignore-listed frames {
  type: 'Error'
}
[ELIFECYCLE] Command failed with exit code 1.
```

### Git diff check

```
$ git diff --check
```
(Exit code 0, clean whitespace and line endings).

## Mutation table

| Test | Red evidence at `ebb7c32` | Green evidence at `c943c2b` |
|---|---|---|
| `tests/member-progress.test.ts` > `getGroupMembersReadingHistory` > `filters check-ins strictly to the active group, excluding solo (NULL) and other-group rows` | FAILED: `TypeError: personIds is not iterable` (legacy signature took `personIds: number[]` only). When evaluated without `groupId` filter: `AssertionError: expected [ 1, 2, 3 ] to deeply equal [ 1 ]` with other-group (`groupId: 24001`) and solo (`groupId: null`) check-ins leaking into history model. | PASSED: correctly returns strictly active-group (`groupId: 24077`) check-ins (`[1]`), excludes other-group and solo rows, and maps empty check-ins for member 103. |
| `tests/member-progress.test.ts` > `getGroupMembersReadingHistory` > `returns an empty map when groupId is missing or personIds is empty` | FAILED: `TypeError: personIds is not iterable` (pre-fix code evaluated number `0` as array). | PASSED: returns `new Map()` immediately without issuing database queries when `!groupId` or `personIds.length === 0`. |
| `tests/member-profile-ui.test.ts` > `ReadingVisibilityNote dialog` > `accurately describes shared journey check-in visibility and privacy boundary` | FAILED: `ReferenceError: ReadingVisibilityNote is not defined` (untested and unimported). | PASSED: renders dialog header "Who can see this?", body copy confirming Connect Group visibility of journey check-in history and 5-day streak, and explicit boundaries regarding reading duration and app choices. |

## Browser evidence and read-back

The full screenshot and snapshot set was freshly captured after the final source commit (`c943c2b`, created 2026-09-06 08:13:37 +08:00) using `agent-browser` (Chromium):

- Attribution: recaptured by this run (AgY executor `gemini-3.8-flash-high`) on local dev server (`DEV_MOCK_PERSON_ID=152 DEV_MOCK_TODAY=2026-10-08 pnpm dev --port 3011`).
- Source commit HEAD: `c943c2b5ac806f904778acb67e6b3630fbb6157b` (committed 2026-09-06 08:13:37 +08:00).
- Screenshot & snapshot timestamps (all post-dating `c943c2b`):
  - Desktop viewports (1440×900):
    - `/tmp/connect-member-profiles-final-home-1440.png` (1440×1010 px, 130,662 bytes, captured 2026-09-06 08:15:14 +08:00)
    - `/tmp/connect-member-profiles-final-home-gathered-1440.png` (1440×1010 px, 154,271 bytes, captured 2026-09-06 08:15:15 +08:00)
    - `/tmp/connect-member-profiles-final-connect-1440.png` (1440×1353 px, 148,765 bytes, captured 2026-09-06 08:15:17 +08:00)
    - `/tmp/connect-member-profiles-final-member-1440.png` (1440×1353 px, 159,717 bytes, captured 2026-09-06 08:15:18 +08:00)
    - `/tmp/connect-member-profiles-final-progress-1440.png` (1440×1436 px, 147,157 bytes, captured 2026-09-06 08:15:21 +08:00)
  - Mobile viewports (390×844):
    - `/tmp/connect-member-profiles-final-home-390.png` (390×1440 px, 111,200 bytes, captured 2026-09-06 08:14:43 +08:00)
    - `/tmp/connect-member-profiles-final-home-gathered-390.png` (390×1683 px, 134,281 bytes, captured 2026-09-06 08:14:43 +08:00)
    - `/tmp/connect-member-profiles-final-connect-390.png` (390×1601 px, 124,886 bytes, captured 2026-09-06 08:14:52 +08:00)
    - `/tmp/connect-member-profiles-final-member-390.png` (390×1601 px, 115,236 bytes, captured 2026-09-06 08:14:57 +08:00)
    - `/tmp/connect-member-profiles-final-progress-390.png` (390×1681 px, 118,377 bytes, captured 2026-09-06 08:15:05 +08:00)
  - Accessibility / DOM snapshots:
    - `/tmp/connect-member-profiles-final-home.snapshot.txt` (695 bytes, captured 2026-09-06 08:14:43 +08:00)
    - `/tmp/connect-member-profiles-final-home-gathered.snapshot.txt` (1,142 bytes, captured 2026-09-06 08:14:44 +08:00)
    - `/tmp/connect-member-profiles-final-connect.snapshot.txt` (1,071 bytes, captured 2026-09-06 08:14:52 +08:00)
    - `/tmp/connect-member-profiles-final-member.snapshot.txt` (2,925 bytes, captured 2026-09-06 08:14:57 +08:00)
    - `/tmp/connect-member-profiles-final-progress.snapshot.txt` (1,979 bytes, captured 2026-09-06 08:15:05 +08:00)
- Verification read-back:
  - `rg -q "Gather group around home" /tmp/connect-member-profiles-final-home.snapshot.txt` (exit 0)
  - `rg -q "Jordan|Taylor|Sam" /tmp/connect-member-profiles-final-home-gathered.snapshot.txt` (exit 0)
  - `rg -q "View Jordan's profile" /tmp/connect-member-profiles-final-connect.snapshot.txt` (exit 0)
  - `rg -q "Jordan|October" /tmp/connect-member-profiles-final-member.snapshot.txt` (exit 0)
  - `rg -q "Groups on the same journey" /tmp/connect-member-profiles-final-progress.snapshot.txt` (exit 0)
- Browser errors: 0 errors reported (`agent-browser --session readmybible-connect-audit errors` returned empty output).
- Temporary QA routes & proxy bypass: all temporary files in `app/qa/` and proxy bypass in `proxy.ts` were removed immediately after capture; working tree verified clean via `git status` and `git diff`.

## Files outside work items

Existing untracked review run artifacts in `docs/runs/**` and plan PR notes are preserved and untouched.

## Deviations

None. Both accepted findings from Codex review round 1 were resolved strictly within the approved plan and locked constraints.

## Execution telemetry

- Model: Gemini 3.8 Flash (High) (`gemini-3.8-flash-high`)
- Effort: high
- Timeout: 45m
- Worktree: `/Users/rico/Git/readmybible-app.favor.church-connect-profile`
- Base commit: `ebb7c3283122d37158463e1ad7fe8e747173728a`
- Committed source fix HEAD: `c943c2b5ac806f904778acb67e6b3630fbb6157b`
- Stalled / swallowed: No; ran to completion with zero timeouts, stalls, or swallowed errors.

## Self-review

1. **Can an active group see another group’s or solo history?**
   No. In `lib/data/stats.ts`, `getGroupMembersReadingHistory` strictly enforces `and(eq(checkins.groupId, groupId), inArray(checkins.rockPersonId, personIds))` at the database query boundary. Rows where `groupId` is `NULL` (solo reading) or belongs to any other Connect Group are filtered out by the database predicate and never reach `deriveMemberReadingHistory`, `app/page.tsx`, or the browser serialization payload.
2. **Can any screenshot predate the code it claims to prove?**
   No. The final implementation commit `c943c2b` was committed at `08:13:37 +08:00`. All 10 PNGs and 5 snapshots were recaptured using `agent-browser` between `08:14:43` and `08:15:21 +08:00`. Every file's filesystem birth and modification timestamp post-dates `c943c2b`.
3. **Which boundary or rendered state was not inspected?**
   Production or external live database writes (per global constraint); external Auth0 / Rock production endpoints (which are mocked/fixtured in dev); the 360px viewport assets which remain preserved from the prior audit run but were not re-run in this round (only the required 390px and 1440px sets were mandated for fresh recapture).

## Upline

- Both accepted findings from Codex review round 1 (Critical privacy boundary query leak, and Important evidence attribution) are fully resolved with red-before-green test evidence and fresh post-commit browser captures.
- All gates (`pnpm test`, `pnpm lint`, `DATABASE_URL=... pnpm build`, `git diff --check`) pass cleanly.
- Ready for push and re-review.
