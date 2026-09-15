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
chapter body, every verse numbered, key verses tinted in place   (all 11 versions — D14)
"Read the entire chapter on Bible.com ↗"
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

**D13 — The no-scroll dwell.** D4 made the tick instant on reaching the end. When this was
written, eight translations bundled only the key passage, so their dialog body was a few
verses plus a link — on a phone often entirely in view on open. D14 has since given every
version the whole chapter, so that short body now appears only when a live chapter fetch
fails and the bundled key passage is served instead; the dwell still exists for that case.
Historically: "reading records the day" would otherwise have meant "opening the sheet records
the day" for most of the audience, while NET/KRV readers scroll
a real chapter to earn the same tick.

The rule is not "which translation". It is whether the reader had to scroll:
IntersectionObserver reports the current state the instant `observe()` is called, so a first
callback that already intersects means the end was in view before any scrolling. That case
waits `NO_SCROLL_DWELL_MS` (5s) with a visible bar; any later intersection is a real scroll
and ticks instantly, exactly as D4 said. Keying off `hasFullText` instead would be wrong both
ways — a NET chapter can fit a desktop viewport, and a short body can still overflow a small
phone.

The dwell is a local gate only. Nothing about how long the sheet was open is recorded, sent,
or shown, so the reading-time non-goal below still holds.

### D14 — every version shows the whole chapter

Supersedes the earlier split where only the `fullText` versions rendered a chapter and the rest
showed their curated key passage plus a Bible.com link for the remainder.

Five versions (NET, CSB, NIV, NASB2020, KRV) resolve the chapter from bundled data; the other
six (ESV, NLT, MSG, NKJV, NASB, AMP) resolve it from a live per-chapter fetch. Both paths
already existed — `LIVE_FETCH_VERSIONS` covered exactly those six — so the change is that the
dialog now *asks* for `Matthew {chapter}` on every version instead of forking on `fullText`.

Consequences worth naming:

- The key-verse pull-quote is gone. With the whole chapter on screen it printed the same verses
  twice in one scroll. Those verses are tinted where they sit instead (`data-key-verse`).
- `getPassage` returns `verses`, the passage keyed by verse number, so each verse can carry a
  numbered superscript. `text` stays on the response, derived from `verses`, for callers that
  want the flat string. The tick arms off `verses`, because that is what the dialog actually
  renders: arming off `text` let a stale cached body (text present, verses absent) render the
  "available at Bible.com" line and tick the reader in anyway.
- A chapter that cannot be fetched falls back to the bundled key passage rather than to
  nothing, so a bolls.life outage cannot make the day unreadable or uncheckable for the six
  live-fetch versions. Misses are sent `Cache-Control: no-store` so an outage is never cached
  for a day.
- `hasFullText` is no longer a rendering input to `ReadingDialog` and was removed from its
  props rather than left as a dead one.
- This widens what the app serves beyond the original per-publisher quotation limit that
  `D-csb-niv-source` recorded (that decision lived in `intent/DECISIONS.md`, archived in
  `docs/history.jsonl`). It was taken deliberately and with the licensing tradeoff stated.

## Non-goals

- Any change to what a check-in writes server-side. `app/actions/checkIn.ts` is untouched.
- Any change to which versions *bundle* full text on disk. (D14 did change what the app
  *serves* — every version now shows a whole chapter. The licensing widening is recorded
  there and is the one item in this run that needs explicit owner sign-off.)
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
