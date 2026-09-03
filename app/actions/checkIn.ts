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

const inputSchema = z.object({
  chapter: z.number().int().min(1).max(28),
  timezone: z.string().min(1),
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
    await redisDel(`group:${groupId}:stats`, `campus:${session.campusId ?? "none"}:board`);
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
