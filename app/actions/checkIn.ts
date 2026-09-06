"use server";

import { z } from "zod";

import { db } from "@/db";
import { checkins } from "@/db/schema";
import { redisDel } from "@/lib/cache/redis";
import { validateCheckIn } from "@/lib/checkin-validation";
import { appNow } from "@/lib/dev-clock";
import { getGroupStatsFresh } from "@/lib/data/stats";
import { groupStateFor, type Stage } from "@/lib/game";
import { getSessionContext } from "@/lib/session";
import { testWritableGroupId } from "@/lib/test-mode-config";

const inputSchema = z.object({
  chapter: z.number().int().min(1).max(28),
  timezone: z.string().min(1),
  /**
   * Test mode only. The client sets this when its write guard believes the
   * session's active group is the sandbox. The client's belief comes from
   * props captured at page render, which go stale if the active group changes
   * elsewhere -- so the server re-checks it here against the session it just
   * resolved. Absent on every normal check-in, leaving that path untouched.
   */
  sandboxGroupId: z.number().int().positive().optional(),
});

export type CheckInGroupState = {
  before: { ratio: number; stage: Stage };
  after: { ratio: number; stage: Stage };
  checkinCount: number;
  memberCount: number;
};

export type CheckInResult =
  | { ok: true; group: CheckInGroupState | null }
  | { ok: false; error: string };

/**
 * Honor-based check-in. One row per person per chapter (DB unique
 * constraint backs this up; a repeat call is a no-op). The server derives
 * reading_date from the plan's date for the chapter -- the client only says
 * which chapter and its own timezone. See lib/checkin-validation.ts for the
 * catch-up window rule.
 *
 * When the person has an active group, `group` carries server-authoritative
 * before/after home state so the completion flow can show a real stage-up
 * (D8) instead of trusting the page's own, possibly-stale groupStats snapshot.
 * The fresh read bypasses the Redis cache so "before" reflects this instant,
 * not up to 5 minutes ago.
 */
export async function checkIn(input: z.infer<typeof inputSchema>): Promise<CheckInResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That check-in didn't look right. Try again." };
  }
  const { chapter, timezone } = parsed.data;

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to check in." };
  }

  // The sandbox unblock is the one place test mode permits a real write, and
  // the client cannot verify its own precondition -- only the session resolved
  // above knows the current active group. Refuse unless the configured
  // sandbox, the claimed sandbox, and the live active group are all the same
  // group, so a stale client prop can never redirect a write to another group.
  if (parsed.data.sandboxGroupId !== undefined) {
    const writable = testWritableGroupId();
    if (
      writable === null ||
      parsed.data.sandboxGroupId !== writable ||
      session.activeGroup?.groupId !== writable
    ) {
      return { ok: false, error: "Test mode: writes are disabled." };
    }
  }

  const validation = validateCheckIn({ chapter, timezone }, appNow());
  if (!validation.ok) {
    return validation;
  }

  const groupId = session.activeGroup?.groupId ?? null;

  const freshBefore = groupId ? await getGroupStatsFresh(groupId, session.campusId) : null;

  const inserted = await db
    .insert(checkins)
    .values({
      rockPersonId: session.rockPersonId,
      groupId,
      chapter,
      readingDate: validation.readingDate,
      timezone,
    })
    .onConflictDoNothing({ target: [checkins.rockPersonId, checkins.chapter] })
    .returning({ id: checkins.id });

  if (groupId) {
    await redisDel(`group:${groupId}:stats`, `campus:${session.campusId ?? "none"}:board:v2`);
  }

  if (!freshBefore) {
    return { ok: true, group: null };
  }

  // A repeat tap (onConflictDoNothing fired) makes no change; only a real
  // insert adds a check-in to the count.
  const checkinCount = freshBefore.checkinCount + (inserted.length > 0 ? 1 : 0);
  const group: CheckInGroupState = {
    before: groupStateFor(freshBefore.checkinCount, freshBefore.memberCount),
    after: groupStateFor(checkinCount, freshBefore.memberCount),
    checkinCount,
    memberCount: freshBefore.memberCount,
  };

  return { ok: true, group };
}
