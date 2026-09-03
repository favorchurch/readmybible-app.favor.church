"use server";

import { z } from "zod";

import { db } from "@/db";
import { checkins } from "@/db/schema";
import { redisDel } from "@/lib/cache/redis";
import { validateCheckIn } from "@/lib/checkin-validation";
import { getSessionContext } from "@/lib/session";

const inputSchema = z.object({
  chapter: z.number().int().min(1).max(28),
  readingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});

export type CheckInResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Honor-based check-in. One row per person per chapter (DB unique
 * constraint backs this up; a repeat call is a no-op). Only accepts dates
 * inside the plan window, up to "tomorrow" (server-derived local today) to
 * tolerate clock skew, never a future day beyond that. See
 * lib/checkin-validation.ts for the window and chapter/day rules.
 */
export async function checkIn(input: z.infer<typeof inputSchema>): Promise<CheckInResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That check-in didn't look right. Try again." };
  }
  const { chapter, readingDate, timezone } = parsed.data;

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to check in." };
  }

  const validation = validateCheckIn({ chapter, readingDate, timezone });
  if (!validation.ok) {
    return validation;
  }

  const groupId = session.activeGroup?.groupId ?? null;

  await db
    .insert(checkins)
    .values({
      rockPersonId: session.rockPersonId,
      groupId,
      chapter,
      readingDate,
      timezone,
    })
    .onConflictDoNothing({ target: [checkins.rockPersonId, checkins.chapter] });

  if (groupId) {
    await redisDel(`group:${groupId}:stats`, `campus:${session.campusId ?? "none"}:board`);
  }

  return { ok: true };
}
