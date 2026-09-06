# Plan — Leader Tools tab

Branch `feat/leader-tools-tab`, worktree `.worktrees/leader-tools-tab`, based on
`origin/main` @ 7d991b0. Baseline verified green: 19 files / 212 tests / 0 failures.

Revision 2 — incorporates an adversarial plan review (3 blockers, 9 should-fix, 3 nits) and a
live read-only probe of production Rock. Both are folded in below; the review's findings are
cited as `F<n>` where they changed something.

## GOAL

A fifth bottom-nav tab, visible only to Connect Group leaders, that carries everything a
leader uses: the group code and QR, the connect.favor.church portal link, an add-a-member
deep link, and a view of every other Connect Group on the campus rendered as home-stage
icons clustered by Rock locality with a toggle to reveal names. The Connect screen and the
Progress screen give those blocks up; members keep a single count-only teaser.

## Settled facts (measured, not assumed)

Probed against production Rock, read-only, 2026-09-06, using this app's own `ROCK_API_KEY`
(throwaway probe scripts, since deleted; every number below is the recorded result):

- **`loadAttributes=simple` works** and composes with the existing `$filter`. Confirmed 200 on
  `Groups?$filter=…&loadAttributes=simple`. `AttributeValues` is a **dict keyed by attribute
  key**; the value lives at `.Value`:
  `{"CityMunicipalityLocality": {"AttributeId": 7383, "Value": "Quezon City", …}}`.
  Read `.Value`, never `ValueFormatted`, never the entry itself.
- **Coverage: 254 of 256** active Manila GT25 groups have a locality (99%). Two are blank.
- **Payload: 581 KB → 1920 KB (3.3×)**, same wall time (1.6s → 1.5s). The cost is bytes.
- **Distribution across 16 localities**, which is lopsided enough to shape the UI:

  ```
  166  Ortigas Center      7  Taguig          2  Marikina      1  Caloocan
   22  Pasig               6  Makati          2  Cainta        1  San Juan
   18  Quezon City         2  Parañaque       2  Muntinlupa    1  San Mateo
   11  Manila              2  Bulacan                          1  Ortigas
   10  Mandaluyong
  ```

  Ortigas Center alone is 65% of the campus. `Ortigas` (1) and `Ortigas Center` (166) are
  distinct Rock values — render as-is, do not silently merge someone's data.

**The two groups with no locality**, identified live —
both Youth // Junior High, same parent section 24021, created two minutes apart on
2026-06-24, `Description: null`, and only 3 of 15 attributes filled (language, location type,
age group). A batch creation someone stopped halfway through:

| Group | Leader (role 24) | Members |
|---|---|---|
| 31192 — Youth // Junior High // Ely Borja | Elyjhay Borja | 5 |
| 31193 — Youth // Junior High // Vince Puno | Vince Harry Puno | 1 (himself) |

Both have real leaders, which is why **D2** exists: under a hide rule, Vince Puno would open a
screen built for leaders and not find his own group on it. These two are the fixture case for
the "Unknown" section — use their shape (real leader, tiny or single-member group) when
building the T1 fixtures.

The `Description` first-segment alternative is **rejected**: 231/256 coverage against the
attribute's 254/256, and it is an unmaintained Fluro-migration string
(`~/Git/connect.favor.church/src/server-actions/rockPerformUpdateConnectSubtitle.ts:56` states
Description is deliberately not persisted to). Do not implement it, not even as a fallback.

## Locked fields

**goal** — as above.

**done_criteria**

1. `getCampusGroups()` returns each group with a flattened `locality: string | null` read from
   `CityMunicipalityLocality`, and caches a **narrowed** object, not the raw 1.9 MB payload
   (see R5). `getCampusBoard()` carries `locality` through onto every `GroupStanding`.
2. A `leader` tab renders in `BottomNav` if and only if `isLeader` is true; members see the
   existing four. Flipping the test-mode role toggle from leader to member while the leader
   tab is open falls back to Today rather than rendering a blank screen.
3. The leader tab is visually distinct: `.leader-screen` carries a navy background token, and
   the `.paper-noise` element is **not present in the DOM** when the leader tab is active.
   Both are asserted mechanically (F14), not judged by eye. Its nav item uses a new `key` icon.
4. The leader tab contains: group code + QR, the still-reading nudge (active phase only),
   a connect.favor.church portal button, an add-a-member button that opens
   connect.favor.church in a new tab, and the Other Connects grid.
5. Other Connects defaults to home-stage icons only, grouped under locality headings ordered
   by group count descending, each heading showing its count, with the reader's own group
   ringed in coral. A "Show names" toggle switches to named rows showing stage and percent.
   Groups with no locality appear under an **"Unknown"** heading, always ordered last
   regardless of its count. Nothing is hidden (D2).
6. `connect-screen.tsx` no longer renders `leader-tools` and is single-column for everyone
   (`frame--rail` / `frame__span` conditionals gone), with no orphaned CSS left behind.
7. `progress-screen.tsx` no longer renders either `leaderboard-card`; in their place a single
   count-only line, no group detail and no link, on **both** the pre-launch and active
   branches. The count is **all campus groups** — with nothing hidden, this is simply the
   board length.
8. `pnpm vitest run` green, including the rewritten tests named in T6 and new coverage for:
   locality grouping and ordering; the "Unknown" section and its always-last ordering; leader-tab visibility both ways;
   the leader→member fallback to Today; icons-by-default and names-after-toggle.
9. `pnpm lint` clean and `pnpm build` succeeds. Both must be run — `build` typechecks `tests/`
   (`tsconfig.json` `include: **/*.ts`), which `lint` alone does not surface (F4).
10. ego-browser screenshots at 375px for: leader tab default, leader tab names-toggled, member
    Progress teaser, member Connect single-column. Reported as **stated observations** of what
    each shows, not as a checkbox (F14).

**blast_radius** — Files in this worktree only. One outbound Rock read change: the existing
`Groups?$filter=…` call in `getCampusGroups()` gains `&loadAttributes=simple`. No Rock writes.
No database migration. No new external service. Two Redis key namespaces are bumped, which
expires old entries rather than mutating them. Nothing reaches production until the named
merge action below.

**named_actions** (planner-held, performed only as written)

- `git push -u origin feat/leader-tools-tab` — first push of the branch.
- `gh pr create --draft --base main` — one draft PR, bootstrapped before task 1.
- `gh pr ready` then squash-merge to `main` — **this auto-deploys production.** Held to final
  closeout and requires Rico's explicit go in-session at that moment; revert target is
  `origin/main` @ 7d991b0.

**non_goals**

- No Rock writes of any kind. Add-a-member is a deep link, never an in-app mutation.
- No change to the join-code, `joinByCode`, or solo-screen flows.
- No new Rock endpoint. Only the `loadAttributes` param on the call that already runs.
- No redesign of the Connect home card, roster, or growth sheet.
- No Brisbane or Seoul locality handling. Manila's list only; other campuses fall through the
  same code path and simply show fewer localities.
- No change to ranking, `groupRatio`, coins, or stages.
- No merging of near-duplicate Rock locality values (`Ortigas` vs `Ortigas Center`).

## Routing

| Unit | Brand | Model / effort | Form | Why |
|---|---|---|---|---|
| Executor (whole plan) | agy | sonnet-tier, high | herdr pane, right | Frontend-dominant; Codex at 0% headroom; agy at 100%, but that probe is known unreliable, so the brief tells it to fall back to a Claude slug on Gemini exhaustion. |
| Code reviewer, each round | claude | opus, low | fresh dispatch | Standing preference: review stays on Claude's own Opus low. |

`HERDR_ENV=1`, so the executor runs in a visible pane, not in-session.

## Milestones

**M1 — Data layer.** Done criterion 1. Lands when the pure locality tests pass.

**M2 — The tab exists.** Done criteria 2, 3, 4.

**M3 — Other Connects.** Done criterion 5.

**M4 — Old surfaces cleaned + gates.** Done criteria 6, 7, 8, 9, 10.

## Tasks

### T1 — Locality on the campus board  *(M1)*

- `lib/rock/client.ts`:
  - Append `&loadAttributes=simple` to the `getCampusGroups` query (`:252-253`). Proven; do
    not substitute `True` without re-probing.
  - Type the response as `RawRockGroupWithAttributes` carrying
    `AttributeValues?: Record<string, { Value?: string | null }> | null`.
  - Add `locality: string | null` to the exported `RockGroup` type, and **narrow before
    caching** — map the raw response to only `{ Id, Name, GroupTypeId, CampusId,
    ParentGroupId, IsActive, IsArchived, locality }`. Fetch wide, cache narrow (R5).
  - `localityOf(raw)`: read `AttributeValues.CityMunicipalityLocality?.Value`, trim, return
    `null` for empty or missing. Do **not** special-case `"Others"` — it does not occur in the
    live data, and inventing the rule would silently drop real groups if it ever did.
  - Bump the cache key to `rock:campusgroups:v2:{id}` — the cached shape changes.
- `lib/data/stats.ts`:
  - Carry `locality` onto each `GroupStanding` in `getCampusBoard`. **Do not filter here** —
    nothing is hidden, so the board is simply complete (D2). `locality` stays `null` on the
    rows that have none; naming them is `groupByLocality`'s job, not this function's.
  - **Bump `campus:${campusId}:board` to `campus:${campusId}:board:v2` (F1, BLOCKER).** Its
    payload shape changes too. Its TTL is 300s, not 15 minutes — a stale entry would otherwise
    serve `locality === undefined` for five minutes after deploy and break `groupByLocality`.
- `lib/game.ts`:
  - Add `locality: string | null` to `GroupStanding` — **nullable, not required** (F4).
  - Add pure `groupByLocality(standings)`:
    `{ locality: string; groups: GroupStanding[] }[]`, sections ordered by group count
    descending then locality name ascending, groups within a section keeping `rankGroups`
    order. Rows with `locality === null` collect into a section named by the exported constant
    `UNKNOWN_LOCALITY = "Unknown"`, which is **always sorted last**, ahead of no other section
    and exempt from the count-descending rule — it is a loose end, not a place. Nothing is
    ever dropped: every standing in equals exactly one standing out, and a test asserts that.
- `lib/rock/fixtures.ts`: `fixtureCampusGroups` currently returns exactly one group, which is
  also the reader's own — the icon grid, section ordering, and the coral ring are all
  unverifiable against it (F7). Add **at least six** fixture groups spanning **three or more
  localities with differing counts**, so fixture mode exercises the real layout.
- Tests to update, not just add (F4): `tests/game.test.ts:140-143` and
  `tests/member-profile-ui.test.ts:361-374` contain `GroupStanding` literals that will not
  typecheck. New coverage in `tests/game.test.ts`: section ordering, count tie-break,
  within-section order, the "Unknown" section, its always-last ordering, and a conservation check that no standing is ever dropped.

### T2 — Tab scaffolding  *(M2)*

- `components/screens/bottom-nav.tsx`: `Tab` gains `"leader"`. `BottomNav` takes `isLeader`
  and appends `{ id: "leader", label: "Leader", icon: "key" }` when true. Label is "Leader",
  not "Leader Tools" — five slots at 375px will not hold the longer word.
- `app/styles/nav.css:1` is a **single minified line holding six rules** (F13). Edit it
  surgically: `grid-template-columns: repeat(var(--nav-count, 4), 1fr)`. The `@media` blocks
  at `:15/:19/:23` touch width and border only and need no change.
- Set the property from React as
  `style={{ "--nav-count": items.length } as React.CSSProperties}` — without the cast this is
  a `pnpm build` type error (F13).
- `components/nav-icon.tsx`: add `"key"` to `NavIconName`, drawn in the same CSS-element idiom
  as `nav-people` / `nav-medal`.
- `components/app-shell.tsx`: render `LeaderScreen` on `tab === "leader"`; pass `isLeader` to
  `BottomNav`; route `guardedGetOrCreateJoinCode` (`:89`) to `LeaderScreen` (F15); add the
  guard returning to `today` when `isLeader` goes false while the leader tab is active — `tab`
  is plain in-memory state (`:103`) with no persistence, so this guard is the only thing
  standing between a role toggle and a blank screen.

### T3 — LeaderScreen + backstage styling  *(M2)*

- New `components/screens/leader-screen.tsx`. Owns the join-code effect
  (`connect-screen.tsx:63-75`) and the QR effect (`:77-88`) moved verbatim, plus `Header`.
  Note the behavioural change and accept it (F15): `getOrCreateJoinCode` **creates** a code
  when absent (`app/actions/getOrCreateJoinCode.ts:25`), so codes now come into existence when
  a leader first opens the Leader tab rather than the Connect tab. Codes are lazy by design;
  this is fine, but it is a real change and belongs in the PR description.
- Sections: **Bring someone in** (code + QR + phase-dependent copy), **Still reading** (active
  phase, non-empty only), **Your group's material** (portal button), **Add a member** (button
  to connect.favor.church, `target="_blank" rel="noopener noreferrer"`, with a one-line note
  that it opens the Connect portal).
- **Paper-noise (F3, BLOCKER).** `app-shell.tsx:247` renders `<div className="paper-noise" />`
  as a *sibling* of the screen, fixed at `inset: 0` (`app/styles/base.css:9`). A screen-scoped
  stylesheet cannot hide an ancestor's sibling. **Mechanism: do not render `.paper-noise` when
  `tab === "leader"`** — a conditional in `app-shell.tsx`, not a `:has()` rule. Chosen because
  it is directly assertable in RTL, which done criterion 3 requires.
- New `app/styles/leader.css`. **`tests/css-rules.test.ts` constrains what may go in it (F9),
  and a backstage design reaches for exactly the things it forbids:**
  - every `:hover` selector must sit inside an `@media (hover: hover)` prelude (`:144-154`);
  - no `animation: … infinite` (`:156-166`);
  - no `font-size` at or below 11px / 0.6875rem unless the line carries `/* decorative */`,
    and one `/* decorative */` covering two `font-size` declarations on one line is itself a
    violation (`:247-277`) — this bites uppercase eyebrows directly;
  - any `font-family: Georgia` selector must be named in `typography.css` with a font
    declaration or carry `/* serif-exception */` (`:279-335`).
- Move out of `connect.css`: `.leader-tools` (`:356`), `.leader-tools > p` (`:365`),
  `.leader-code-row` (`:372`), `.leader-code` (`:379`), `.leader-nudge`,
  `.connect-portal-link`.
- Register `app/styles/leader.css` in **two** places: the `@import` list in `app/globals.css`
  (`:80-96`) and `CSS_FILES` in `tests/css-rules.test.ts` (`:4-23`). That array is a manual
  list — it already omits `test-mode.css` — so registration will not happen by itself.

### T4 — Other Connects  *(M3)*

- In `leader-screen.tsx`, an **Other Connects** section fed by
  `groupByLocality(campusBoard)`.
- Default: per section, an uppercase locality heading with `{n} groups`, then a wrapped run of
  `StageMini` icons, one per group, each with an accessible label naming the group and stage.
  The reader's own `groupId` gets a coral ring.
- **The dense case is the normal case (R6).** Ortigas Center is 166 groups; eight localities
  hold one or two. The 166-icon block must stay legible and must not stutter on scroll, and a
  one-group section must not read as broken. Verify both on the real fixture spread, and say
  which is which in the screenshot report.
- `Show names` / `Show icons` toggle swaps each section to the existing `campus-group-card`
  markup (name, percent, stage, `ProgressBar`), reusing the `.campus-group*` rules moved from
  `progress.css`.
- Empty board keeps the copy "No groups on the board yet. October's coming."
- R1 hedge: a single exported `MIN_RATIO_TO_SHOW = 0` the section filters on, so trimming a
  bleak week-one wall later is a one-line change.

### T5 — Vacate the old homes  *(M4)*

- `connect-screen.tsx`: delete the `{isLeader && …}` aside (`:250`), the join-code and QR state
  and effects, the now-unused `appBaseUrl` / `onGetOrCreateJoinCode` / `stillReading` locals,
  and the `frame--rail` / `frame__span` conditionals (`:96`, `:98`). Update prop types and
  `app-shell.tsx` to match.
- `progress-screen.tsx`: delete both `leaderboard-card` sections. **The block at `:172-181` is
  not dead code (F12)** — it is the pre-launch branch of `isPreLaunch ? … :` at `:160` and
  renders live copy. Both branches need the replacement teaser, per done criterion 7.
- **Remove the now-unused imports** `StageMini` (`:8`, used only at `:250`) and `stageFor`
  (`:12`, used only at `:245`) — `tseslint.configs.recommended` makes these errors, not
  warnings (F5).
- CSS removal is wider than `progress.css` (F8). Also delete from `connect.css` the three
  `@media` blocks keyed on `.connect-screen.frame--rail .leader-tools` (`:658`, `:701`, `:713`
  and its comment), which `frame--rail`'s removal orphans. From `progress.css`, remove
  `.leaderboard-card` (`:222-224`), `.campus-group*` (`:225`+, moved to `leader.css`), and the
  `@media` overrides at `:299-302` and `:317-319`.

### T6 — Tests and gates  *(M4)*

- **Rewrite, do not merely "confirm" (F11):** `tests/member-profile-ui.test.ts:359-428`, the
  whole `describe("ProgressScreen campus groups")` block, asserts markup this plan deletes —
  `:395` `class="leaderboard-card frame__span"`, `:396` `data-section="campus-groups"`, `:397`
  `"FAVOR MANILA CONNECT GROUPS"`, `:401-404` the per-group copy, `:425` the empty-board copy.
  Note `:425` fails even though T4 keeps that string, because it moves screens. Both `it`
  blocks must be rewritten against the new surfaces.
- New coverage: LeaderScreen renders icons and no group names by default; the toggle reveals
  names; the still-reading block is absent outside the active phase; `BottomNav` shows five
  items for a leader and four for a member; the leader→member role flip returns to Today
  (done criterion 2's second sentence — named here because the review found it specified in
  T2 but tested nowhere, F15); `.paper-noise` is absent on the leader tab and present
  elsewhere (done criterion 3).
- Probe scripts already deleted by the planner; do not re-add them to the commit.
- Run `pnpm vitest run`, `pnpm lint`, `pnpm build`. Paste all three outputs.
- ego-browser screenshots per done criterion 10, reported as observations.

## Validation commands

```
pnpm vitest run
pnpm lint
pnpm build
```

A zero exit is not the gate. The gate is the pasted output of all three plus the four
screenshot observations.

## Review

Fresh Claude Opus low, adversarial, every round. Cap 5 rounds. `CHANGES REQUIRED` twice on one
task stops for planner reflection rather than a third automatic swing.

## Risks

**R1 — Week-one emptiness.** Every campus group means a wall of stage-1 icons in October week
one. Rico accepted this. Mitigated by `MIN_RATIO_TO_SHOW`.

**R2 — RESOLVED.** See *Settled facts*. 254/256 coverage, attribute readable, shape confirmed.

**R3 — Cache shape. Two keys, not one (F1).** `rock:campusgroups:v2:{id}` **and**
`campus:{id}:board:v2`. Missing the second is a five-minute post-deploy break, not a
theoretical one.

**R4 — Five tabs at 375px.** "Leader" plus a 24px icon at 12px/700 fits a 75px column, but
this is confirmed by screenshot, not arithmetic.

**R5 — Payload cost.** `loadAttributes=simple` is 3.3× the bytes (581 KB → 1920 KB). Latency
is unchanged. Handled by narrowing before the Redis write in T1; if the cached value is not
narrowed, this plan puts ~1.9 MB per campus into Redis.

**R6 — Lopsided distribution.** 166 of 254 groups are Ortigas Center; eight localities have
one or two. Shapes T4's rendering, see that task.

**R7 — `tests/css-rules.test.ts` will reject a naive backstage design (F9).** The 11px
font-size rule in particular collides with uppercase eyebrows. T3 lists all four constraints
so this is designed for, not discovered at the gate.
