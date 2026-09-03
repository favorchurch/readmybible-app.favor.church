"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { joinCodes, joinEvents } from "@/db/schema";
import { joinGroup, RockApiError, RockConfigError } from "@/lib/rock/client";
import { getSessionContext } from "@/lib/session";

const inputSchema = z.object({
  code: z.string().trim().toUpperCase().length(4),
});

export type JoinByCodeResult =
  | { ok: true; groupId: number; outcome: "joined" | "reactivated" | "already_member" }
  | { ok: false; error: string };

/** Joins the logged-in person to the Connect Group matching a 4-character code. See intent/FLOWS.md. */
export async function joinByCode(input: z.infer<typeof inputSchema>): Promise<JoinByCodeResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That code didn't match a group. Check it with your leader and try again." };
  }
  const { code } = parsed.data;

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to join a group." };
  }

  const [row] = await db.select().from(joinCodes).where(eq(joinCodes.code, code)).limit(1);
  if (!row) {
    await db.insert(joinEvents).values({
      groupId: null,
      rockPersonId: session.rockPersonId,
      code,
      outcome: "invalid_code",
    });
    return { ok: false, error: "That code didn't match a group. Check it with your leader and try again." };
  }

  try {
    const { outcome } = await joinGroup(row.groupId, session.rockPersonId);
    await db.insert(joinEvents).values({
      groupId: row.groupId,
      rockPersonId: session.rockPersonId,
      code,
      outcome,
    });
    return { ok: true, groupId: row.groupId, outcome };
  } catch (error) {
    await db.insert(joinEvents).values({
      groupId: row.groupId,
      rockPersonId: session.rockPersonId,
      code,
      outcome: "error",
    });
    if (error instanceof RockConfigError) {
      console.error(JSON.stringify({ event: "rock_write_failed", reason: "missing_api_key", code }));
    } else if (error instanceof RockApiError) {
      console.error(JSON.stringify({ event: "rock_write_failed", status: error.status, code }));
    }
    return { ok: false, error: "Something went wrong on our side. Try again in a bit." };
  }
}
