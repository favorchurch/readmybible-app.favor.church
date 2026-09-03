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

  // group_id is the primary key, so a concurrent request for the same group
  // and a `code` collision with someone else's group are both just a no-op
  // insert here -- re-reading by group_id afterward picks up whichever row
  // exists (ours, or the one that raced us), and a `code` collision with no
  // row for this group yet falls through to try another random code.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = randomJoinCode();
    await db
      .insert(joinCodes)
      .values({ groupId: group.groupId, code, createdBy: session.rockPersonId })
      .onConflictDoNothing();

    const [row] = await db.select().from(joinCodes).where(eq(joinCodes.groupId, group.groupId)).limit(1);
    if (row) return { ok: true, code: row.code };
  }

  return { ok: false, error: "Something went wrong on our side. Try again in a bit." };
}
