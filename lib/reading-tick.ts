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
