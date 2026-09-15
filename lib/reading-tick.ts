/**
 * The scroll-to-bottom check-in (D4-D10 of docs/reading-dialog-tick.md).
 *
 * Reaching the bottom of the reading dialog is what records the day, not a
 * button press. That moves a write onto a gesture users make casually, so the
 * decision of whether a given sentinel entry may write lives here as a pure
 * function rather than inside the component -- `tests/reading-tick.test.ts`
 * covers it directly, which is the only way the "fires exactly once" and
 * "never writes in test mode" rules are actually guarded (see issue #58 for
 * why component wiring alone is not a guarantee we can test).
 *
 * This module imports no server action. The caller passes an already-guarded
 * check-in, exactly as `app-shell.tsx` does for every other write.
 */
import type { CheckInGroupState, CheckInResult } from "@/app/actions/checkIn";
import { TOTAL_CHAPTERS, groupStateFor, stageFor } from "@/lib/game";

/**
 * The dialog's tick state. A discriminated union rather than a phase string
 * plus sibling fields, so "ticked but no group to celebrate with" and
 * "failed but no error to show" are not representable.
 */
export type TickState =
  | { kind: "idle" }
  | { kind: "ticked"; group: CheckInGroupState | null; simulated: boolean }
  | { kind: "retrying" }
  | { kind: "failed"; error: string };

/**
 * May this sentinel entry perform a real check-in write?
 *
 * Every `false` branch here is a decision, not a guard against a bug:
 * - `preview`       D12, pre-launch has nothing to check into yet.
 * - `writesBlocked` D10, the existing per-action guard, passed straight through
 *                   rather than re-decided here. In the sandbox state it is
 *                   `false` and the tick writes for real -- that is the
 *                   sandbox's purpose, and `writesBlocked` has already pinned
 *                   the target to the tester's own active group. Any other test
 *                   mode state blocks, and the dialog simulates instead.
 * - `alreadyRead`   D8, re-opening a finished chapter replays, never re-writes.
 * - `alreadyFired`  D5/D6, the sentinel re-enters the viewport every time the
 *                   user scrolls back down. Only the first entry per chapter writes.
 */
export function shouldWrite(args: {
  alreadyRead: boolean;
  alreadyFired: boolean;
  writesBlocked: boolean;
  preview: boolean;
}): boolean {
  if (args.preview) return false;
  if (args.writesBlocked) return false;
  if (args.alreadyRead) return false;
  if (args.alreadyFired) return false;
  return true;
}

/**
 * D13: how long the end of the reading must stay on screen before it ticks,
 * when it was already on screen the moment the dialog opened.
 *
 * Eight of the ten translations bundle only the key passage, so their dialog
 * body is a few verses plus a link -- on a phone that is often entirely within
 * view without scrolling, which would make "reading records the day" mean
 * "opening the sheet records the day" for most readers, while NET/KRV readers
 * scroll a real chapter to earn the same tick. The dwell restores a deliberate
 * pause for the short body without asking the long one to wait twice.
 *
 * Deliberately short. This is honour-based by design (D4) and is not a
 * reading-speed test -- it exists so the tick follows an intent to read rather
 * than the act of opening a sheet.
 */
export const NO_SCROLL_DWELL_MS = 5000;

/**
 * What a sentinel intersection callback should do.
 *
 * The discriminator is the observer's *first* callback, not the translation or
 * the body length: IntersectionObserver reports the current state immediately
 * on observe(), so a first callback that is already intersecting means the end
 * of the reading was in view before the reader scrolled at all. Anything later
 * means they scrolled it into view, which is the gesture D4 wanted, and ticks
 * instantly as before.
 *
 * Keying off `hasFullText` instead would be wrong in both directions: a NET
 * chapter can fit on a desktop viewport, and a short body can still overflow a
 * small phone.
 */
export type SentinelAction =
  | { kind: "tick" }
  | { kind: "dwell"; delayMs: number }
  | { kind: "cancel" };

export function sentinelAction(args: { isIntersecting: boolean; isFirstCallback: boolean }): SentinelAction {
  if (!args.isIntersecting) return { kind: "cancel" };
  if (args.isFirstCallback) return { kind: "dwell", delayMs: NO_SCROLL_DWELL_MS };
  return { kind: "tick" };
}

/**
 * D9: one silent retry, then surface it. The animation has already played by
 * the time this runs, so a single transient failure must not be shown to the
 * user -- but a second one must, because the reading card will stay unread and
 * silently disagreeing with the celebration they just watched is worse than
 * asking them to tap once.
 *
 * The server's unique constraint makes a duplicate check-in a no-op, so
 * retrying a request that actually succeeded but whose response was lost is
 * safe (app/actions/checkIn.ts:40).
 */
export async function checkInWithRetry(
  action: () => Promise<CheckInResult>,
  onRetry?: () => void,
): Promise<CheckInResult> {
  const first = await action().catch(() => null);
  if (first?.ok) return first;
  onRetry?.();
  const second = await action().catch(() => null);
  if (second) return second;
  return first ?? { ok: false, error: "We couldn't save that just now. Tap to try again." };
}

/**
 * D10: the celebration needs a `CheckInGroupState` to render, and in test mode
 * no server call produced one. Build the same shape from the panel's simulated
 * group ratio so the tester sees a real celebration -- including a stage-up
 * when the added check-in crosses a milestone -- behind the SIMULATED badge.
 */
export function simulatedCheckInGroup(args: {
  ratio: number;
  memberCount: number;
}): CheckInGroupState {
  const members = Math.max(1, args.memberCount);
  const totalSlots = members * TOTAL_CHAPTERS;
  const beforeCheckins = Math.round(args.ratio * totalSlots);
  const afterCheckins = Math.min(totalSlots, beforeCheckins + 1);
  return {
    before: { ratio: args.ratio, stage: stageFor(args.ratio) },
    after: groupStateFor(afterCheckins, members),
    checkinCount: afterCheckins,
    memberCount: members,
  };
}
