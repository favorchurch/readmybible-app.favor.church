# Reading Dialog Tick — plan v1

Run `77ffb8fd` · base `ef393bd` · branch `worktree-feat+reading-dialog-tick`
Intent: `docs/reading-dialog-tick.md` (D1–D12, frozen)

## Playbook and size

Playbook `Change`. Size **M** — one new component, five rewired, one new lib module,
CSS in three existing files, no schema or server-action change.

## Blast radius (evidence-backed)

| Path | Why |
|---|---|
| `components/reading-dialog.tsx` | new — the single dialog |
| `lib/reading-tick.ts` | new — fire-once / retry / simulate logic, unit-testable |
| `components/screens/today-screen.tsx:373-399` | three buttons collapse to one |
| `components/completion-flow.tsx:44-66` | step 1 deleted; step 2 becomes an embeddable celebration |
| `components/app-shell.tsx:287-312, 520-545` | tick orchestration replaces `finishReading` |
| `components/scripture-popup.tsx` | absorbed by the dialog; deleted or reduced |
| `components/day-preview-sheet.tsx:34` | progress-screen preview routes to the dialog (D11) |
| `app/styles/{motion,completion,today}.css` | tick row + keyframes |

**Protected / untouched:** `app/actions/checkIn.ts`, `lib/scripture/**`,
`lib/plan.ts`, `components/test-mode/logic.ts` (`writesBlocked` semantics unchanged;
the scroll-tick path simply never reaches it).

## Pinned interfaces — frozen before any task starts

```ts
// lib/reading-tick.ts
export type TickPhase = "idle" | "ticked" | "retrying" | "failed";

/** Pure decision: may this sentinel entry write? Never true twice for a chapter. */
export function shouldWrite(args: {
  chapter: number;
  alreadyRead: boolean;      // chapter is in the read set
  alreadyFired: boolean;     // this session already fired for this chapter
  testModeActive: boolean;   // D10: hard block, sandbox or not
  preview: boolean;          // D12
}): boolean;
```

```ts
// components/reading-dialog.tsx
type ReadingDialogMode = "preview" | "unread" | "read";

export function ReadingDialog(props: {
  chapter: number;
  passageRef: string;      // "Matthew 12" when fullText, else the key-passage ref
  hasFullText: boolean;    // drives the "Read the rest on Bible.com ↗" row
  translation: Translation;
  mode: ReadingDialogMode;
  isCatchUp: boolean;
  chaptersRead: number;
  groupName: string | null;
  group: CheckInGroupState | null;
  tickPhase: TickPhase;
  simulated: boolean;      // renders the SIMULATED · NOT SAVED badge
  onReachBottom: () => void;
  onReplay: () => void;
  onRetry: () => void;
  onTranslationChange: (t: Translation) => void;
  onClose: () => void;
}): JSX.Element;
```

## Tasks

| # | Task | Depends on | Touches |
|---|---|---|---|
| T1 | `lib/reading-tick.ts` + `tests/reading-tick.test.ts` — `shouldWrite`, retry policy, simulated `CheckInGroupState` builder | — | `lib/reading-tick.ts`, `tests/reading-tick.test.ts` |
| T2 | `ReadingDialog` component against the pinned props: passage render, Bible.com row, sentinel, tick row, placebo button, celebration slot, three modes | T1 | `components/reading-dialog.tsx` |
| T3 | Extract `CompletionFlow` step 2 into an embeddable `<Celebration>`; delete step 1 | — | `components/completion-flow.tsx` |
| T4 | CSS: tick row, draw-on check, coin count-up, SIMULATED badge. Finite animations only | — | `app/styles/motion.css`, `completion.css`, `today.css` |
| T5 | Wire `app-shell.tsx`: tick orchestration, fire-and-forget, silent retry, test-mode simulation | T1,T2,T3 | `components/app-shell.tsx` |
| T6 | Collapse the three reading-card buttons to one; route catch-up, grace chips, pre-launch preview | T2,T5 | `components/screens/today-screen.tsx` |
| T7 | Route the progress-screen day preview | T2 | `components/day-preview-sheet.tsx` |
| T8 | Retire `scripture-popup.tsx` once no caller remains | T6,T7 | `components/scripture-popup.tsx` |
| T9 | Tick-rule tests per done-criteria 4 | T5 | `tests/` |
| T10 | ego-browser screenshots, six states | T9 | — |

Waves: **W1** = T1, T3, T4 · **W2** = T2 · **W3** = T5, T7 · **W4** = T6 · **W5** = T8, T9 · **W6** = T10.
Executed inline by the orchestrator (gear `direct`) — the coupling across T2/T3/T5 is too
tight for parallel executors over a two-day-old contract, and no two tasks in a wave
share a file.

## Repo conventions that constrain this

`tests/css-rules.test.ts` is a hard gate on the animation work:

- **No infinite animation** (`css-rules.test.ts:157`). The celebration must terminate.
- Every `:hover` must sit inside `@media (hover: hover)` (`:145`).
- Every `@keyframes` must be neutralized by the global reduced-motion rule (`:169`).
- No meaningful font-size ≤ 11px unless marked decorative (`:248`).

New CSS goes into the files already on that test's `CSS_FILES` list, not a new file,
or the guard silently stops covering it.

`tests/test-mode.test.ts` and issue #58: components must not import `app/actions/*`
directly, only through a guard. The tick path calls through `app-shell`'s wiring.

## Validation

1. `pnpm lint`
2. `pnpm test` — 317 existing must still pass, plus T1/T9 additions
3. `pnpm build` — the required gate before "done" (AGENTS.md)
4. ego-browser screenshots, reviewed as images

**Known-bad tests** (these must fail before the fix and pass after):
- sentinel entering twice writes once
- an already-read chapter never writes
- test mode never calls the action, sandbox selected or not
- a failed check-in leaves the card unread and surfaces retry

## Rollback

Branch is unmerged. Revert = close the PR or `git revert` one squash commit.
No data migration, no production write in this run.

## model_assignments

| Role | Invocation id | model_id | Effort | Harness | Status | Rationale |
|---|---|---|---|---|---|---|
| Orchestrator | `claude-opus-5[1m]` | `claude-opus-5` | high | claude-code | inline | Owns frozen intent and the user interview; already holds full repo context |
| Planner | `claude-opus-5[1m]` | `claude-opus-5` | high | claude-code | inline | Gear `direct` funds no separate planner; seed preference Opus Medium is met or exceeded |
| Reviewer | to be routed | — | — | — | routed | Must not be the producing agent (no-self-approval). Routed at the review gate |

## Deviation from gear

Gear `direct` funds no independent review. I am adding one anyway: the tick path
records attendance data, a double-write or false-tick is user-visible and hard to
walk back, and my own verification is a pass, not an approval.
