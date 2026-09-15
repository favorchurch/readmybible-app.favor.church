# Reading Dialog Tick — frozen intent

Run: `77ffb8fd-7669-432e-af88-3ab971fddb44` · base `ef393bd` · branch `worktree-feat+reading-dialog-tick`

## Goal

Replace the two separate "I read today" buttons with a single reading dialog whose
scroll-to-bottom records the day's check-in, celebrates in place, replays on demand,
and simulates without writing in test mode.

## Decisions

**D1 — One entrypoint.** The reading card's primary action opens `ReadingDialog`.
`QUICK VERSE`, `READ FULL CHAPTER`, and the card's `I read today` button are all removed
(`components/screens/today-screen.tsx:373-399`).

**D2 — The dialog is step 1.** `CompletionFlow` step 1 is deleted. The celebration
(coins, trophy, home growth, stage-up) renders in place inside the same sheet, expanding
below the tick row.

**D3 — Dialog content order.**

```
eyebrow + "Matthew 12" + translation select
key verse pull-quote
chapter body                    (NET, KRV)
  — or —
key passage + "Read the rest on Bible.com ↗"   (ESV, CSB, NIV, NLT, MSG, NKJV, NASB, AMP)
──────────────── divider ────────────────
tick row   ✓ Read today · +10
[ I read today ✓ ]
celebration (expands in place after tick)
```

**D4 — Tick rule.** A sentinel sits below the last content block. It entering the viewport
ticks. Instant — no dwell guard, no minimum time.

**D5 — Fire-and-forget.** The check-in call starts at the sentinel moment and is not tied
to the dialog's lifetime. Closing, backgrounding, or navigating away after the tick does
not cancel it.

**D6 — Replay.** Reaching the bottom again replays the celebration animation. Debounced so
resting at the bottom does not loop it.

**D7 — Placebo button.** `I read today ✓` appears after the tick. Tapping it replays the
animation and scrolls the celebration into view. It never writes.

**D8 — Already read.** Same dialog, tick row pre-filled, celebration already expanded.
The sentinel replays the animation but never writes. The reading card's `Read. Nice one.`
opens this same state.

**D9 — Failure.** Animation plays optimistically. One silent auto-retry. If that also fails,
the tick row becomes `Couldn't save — tap to retry` and the reading card stays unread.

**D10 — Test mode (final).** The tick defers to the existing per-action guard rather than
re-deciding anything: it writes exactly when `writesBlocked` says a check-in may be written.

- **Blocked** (test mode, not the sandbox state) — no server call. The animation and
  celebration play from simulated group state behind a `SIMULATED · NOT SAVED` badge.
- **Sandbox state** — a real check-in, same as production. `writesBlocked`
  (`components/test-mode/logic.ts:131`) returns `false` only when the selected group, the
  configured writable group, and the session's real active group are all the same group,
  so the row can land nowhere but the tester's own group. The server re-resolves the
  session and refuses if the client's claim disagrees.

> **History.** D10 was first frozen as "never write in test mode, sandbox or not." That
> made `checkIn` unreachable in test mode, which killed `tests/test-mode-wiring.test.ts:134`
> — the only independent proof that `blocked === false` in the sandbox state, without which
> the sibling `joinByCode` assertion passes for the wrong reason. It also stranded
> `sandboxCheckIn` and the `testWritableGroupId` plumbing as dead code. Raised as a brief
> defect; the user clarified that sandbox writes were never the concern (only writes
> landing in *another* group's progress were), and D10 reverted to the guard-deferring
> form above. 2026-09-15.

**D11 — Every mark-read path routes through the dialog.** Catch-up card, grace-phase chapter
chips, and the progress-screen day preview all open `ReadingDialog` instead of ticking directly.

**D12 — Pre-launch.** `DAY 1 PREVIEW` opens the same dialog in preview mode: no sentinel,
no tick row, one line saying it counts from October 1.

## Non-goals

- Any change to what a check-in writes server-side. `app/actions/checkIn.ts` is untouched.
- Any change to translation licensing or which versions bundle full text.
- Any change to `writesBlocked` semantics for `saveProfile`, `chooseGroup`, `joinByCode`,
  `getOrCreateJoinCode`.
- Reading-time or duration tracking. `components/reading-visibility-note.tsx` promises the
  app does not show how long you read; that promise holds.
- Offline queueing of failed check-ins beyond the single silent retry in D9.

## Blast radius

Client components in this repo only. No Rock write, no Supabase schema change, no external
send. Production is reached only by squash-merge to `main`, which is outside this run.

## Named actions (irreversible)

None.

## Rollback

Revert the single squash commit on `main`, or close the PR unmerged. No data migration to undo.

## Done criteria

1. `pnpm lint` clean.
2. `pnpm build` clean.
3. `pnpm test` — the 317 existing tests still pass.
4. New tests: the sentinel fires the check-in exactly once per chapter; replay and re-entry
   never write; test mode never calls the action; an already-read chapter never writes;
   the D9 failure path surfaces the retry affordance.
5. ego-browser screenshots, reviewed as images: unread dialog top, mid-scroll, the tick
   moment, celebration in place, the test-mode `SIMULATED` badge, and the non-full-text
   (NIV) variant.
