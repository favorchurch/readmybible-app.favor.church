"use server";

import { z } from "zod";

import { db } from "@/db";
import { checkins } from "@/db/schema";
import { redisDel } from "@/lib/cache/redis";
import { getSessionContext } from "@/lib/session";

const inputSchema = z.object({
  chapter: z.number().int().min(1).max(28),
  readingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});

const PLAN_START = "2026-10-01";
const PLAN_END = "2026-10-31";
const CLOCK_SKEW_DAYS = 1;

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type CheckInResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Honor-based check-in. One row per person per chapter (DB unique
 * constraint backs this up; a repeat call is a no-op). Only accepts dates
 * inside the plan window, up to "tomorrow" to tolerate clock skew, never a
 * future day beyond that.
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

  const clientToleratedMax = addDays(readingDate, CLOCK_SKEW_DAYS);
  if (readingDate < PLAN_START || readingDate > PLAN_END || readingDate > clientToleratedMax) {
    return { ok: false, error: "That date is outside the reading plan window." };
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

