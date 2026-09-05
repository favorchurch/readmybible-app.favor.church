# Run report — Issue #35: Scripture layer, home-stage icons, debug mode, visual fixes

Merged `2893e6a` (PR #48, squash) into `main` on 2026-09-04.
Production deploy `6263449822` succeeded; `https://readmybible.favor.church/`
reads back 200. Revert target `fb17b56`.

## Goal

Ten licensed Bible versions readable in-app, home-stage previews in Connect and
Today, a `?day=N` / `?test=1` debug controller, richer reference and commentary
links on every verse surface, and the wordmark linking to the campaign guide.

| Done criterion | Final verify output |
|---|---|
| Lint clean | `pnpm lint` exit 0 |
| Tests green | `pnpm test` — 16 files, 162 tests passing (154 at closeout start) |
| Production build succeeds | `pnpm build` — compiled successfully; `/join/[code]` resolves dynamic |
| D4: no Scripture text in the client bundle | Fresh build; 4 sampled passage strings → 0 files in `.next/static`. Plan references (`Matthew 1:20-21`) → 2 files, expected |
| D3: attribution on every rendered passage | Reviewer confirmed with live requests: `text: null` still returns non-empty attribution (`lib/scripture/index.ts:46-55`) |
| Production clock guard intact | `lib/dev-clock.ts:14-18` unchanged |
| 44px floor on new controls | Measured: nav arrows 44×44; test panel Show 51.9×44, range 198×44, Pre 44×44, Active 52.5×44, Post 44×44 |

## Landed

PR #48 → `main`, squash merge `2893e6a`. Commit range `fb17b56..67fc10f` on
`issue-35-scripture-and-debug` (33 commits).

## Route

| Unit | Brand | Outcome |
|---|---|---|
| T1–T7, T12, T14 | agy, then claude | Delivered; agy handoff exhausted quota mid-run |
| T8–T11, T13 | claude (planner-executor) | Delivered |
| Amendment 5, T10, T11 | codex | Clean on first attempt |
| Amendments 6, 7, 8 | agy | Six correction rounds; see Lessons |
| Amendment 9 (T1–T9) | codex `gpt-5.6-luna high` | Nine commits, all clean |
| Review rounds 1–3 | codex `gpt-5.6-luna xhigh` | 2 × CHANGES REQUIRED, then APPROVED |

## Task ledger

T1–T14 all landed; T5 superseded by T14 (D9 retracted). Nine amendments on top,
driven by Rico's screenshot feedback: mini-icon sizing, Quick Verse link
restructure, home-snapshot mini, compact spacing, Tent removal, inline version
pill, collapsible source sections, and the reading-day navigation.

## Stops

Two `AskUserQuestion` stops, both user-owned decisions the plan had not
anticipated: the APPS section's link semantics and button treatment; then the
already-read CTA behaviour and the navigation range. One design escalation: agy
introduced Georgia serif unasked and self-marked it as an exception; Rico chose
to keep it and document it as his decision.

## Not verified

- **No preview deployment of this work ever succeeded.** All 8 preview builds on
  #48 failed on `DATABASE_URL is not set`. Repo-wide Preview environment gap
  predating this issue → #59. Verification was local build, hand browser
  measurement, and three review rounds.
- **No user interaction was machine-verified.** React never hydrates under
  browser automation in this repo (HMR websocket fails against `proxy.ts`) → #55.
  Layout was measured by rendering real markup against the real stylesheet;
  behaviour was verified by source reading and unit tests.
- **No test asserts the guarded callbacks are wired up.** `vitest` runs
  `environment: "node"` with no jsdom, so component tests are impossible → #58.
  Both D8 fixes were confirmed by source inspection only.
- `?test=1` behaviour on the deployed production site was not exercised
  post-merge.

## Still open

#52 debug panel reachable in production · #53 disclosure touch targets ·
#54 read-ahead inconsistency · #55 hydration under automation ·
#56 CSS formatting convention · #57 no 44px test coverage ·
#58 no test catches a guard bypass · #59 preview deploys all fail

## Lessons

**The review gate earned its cost twice.** Rounds 1 and 2 each found a real D8
test-mode write bypass, both of the same shape: a client component importing a
server action directly instead of through its `guardWrite` wrapper. The round-2
find was the more serious — `/join/CODE?test=1` performed a real Rock `joinGroup`
and inserted a `joinEvents` row. Since `components/test-mode/` did not exist at
base, `?test=1` was a contract this branch introduced, so this branch made a
test-marked URL mutate production records. Nothing automated could catch it (#58).

**Reasoning from CSS values is not measurement.** Round 1's touch-target finding
was "fixed" by raising `min-height` to 44px, which satisfied one axis. Measured,
the phase buttons were 44px tall and 36.1px wide — still failing 44×44. Three
agents reasoned about those values; only a browser measurement caught it.

**A derived value is not automatically safe from staleness.** `viewedChapter` was
derived through a clamp rather than mirrored into state, and the planner cited
that as avoiding a stale-state bug. It did not: the clamp only bounds the top, so
`clampReadingChapter(1, 5)` returns 1 and the card showed Day 5 with Matthew 1.

**Honest reporting is a routing signal.** codex stated outright that it had not
measured the touch targets in a browser and that its numbers were CSS minimums.
That disclosure is what prompted the measurement that found the width failure.
agy, by contrast, reported measured rects that showed the version pill at `x: 20`
— on its own row — and called the change correct anyway; the numbers were right
and the interpretation was wrong.
