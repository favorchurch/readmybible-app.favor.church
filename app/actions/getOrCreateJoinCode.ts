"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { joinCodes } from "@/db/schema";
import { randomJoinCode } from "@/lib/join-code";
import { getSessionContext } from "@/lib/session";

export type JoinCodeResult = { ok: true; code: string } | { ok: false; error: string };

const MAX_ATTEMPTS = 8;

/**
 * Returns the active group's join code, creating one the first time a
 * leader opens the Connect tab. See intent/FLOWS.md. Only a leader or
 * assistant leader of the active group may create one.
 */
export async function getOrCreateJoinCode(): Promise<JoinCodeResult> {
  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in." };
  }
  const group = session.activeGroup;
  if (!group || !group.isLeader) {
    return { ok: false, error: "Only a group leader can create a join code." };
  }

  const [existing] = await db.select().from(joinCodes).where(eq(joinCodes.groupId, group.groupId)).limit(1);
  if (existing) {
    return { ok: true, code: existing.code };
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = randomJoinCode();
    try {
      await db.insert(joinCodes).values({
        groupId: group.groupId,
        code,
        createdBy: session.rockPersonId,
      });
      return { ok: true, code };
    } catch {
      // Unique constraint on `code` collided -- try again with a new one.
      // A concurrent request for the same group could also have inserted
      // its row first; check for that before giving up.
      const [raced] = await db.select().from(joinCodes).where(eq(joinCodes.groupId, group.groupId)).limit(1);
      if (raced) return { ok: true, code: raced.code };
    }
  }

  return { ok: false, error: "Something went wrong on our side. Try again in a bit." };
}
