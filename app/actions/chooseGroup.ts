"use server";

import { z } from "zod";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSessionContext } from "@/lib/session";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
});

export type ChooseGroupResult = { ok: true } | { ok: false; error: string };

/** Lets a person in several Connect Groups pick one as their active group for October. */
export async function chooseGroup(input: z.infer<typeof inputSchema>): Promise<ChooseGroupResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That group didn't look right. Try again." };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to choose a group." };
  }

  const isMember = session.memberships.some((m) => m.groupId === parsed.data.groupId);
  if (!isMember) {
    return { ok: false, error: "You're not a member of that group." };
  }

  await db
    .insert(profiles)
    .values({
      rockPersonId: session.rockPersonId,
      displayName: session.displayName,
      avatar: {},
      activeGroupId: parsed.data.groupId,
    })
    .onConflictDoUpdate({
      target: profiles.rockPersonId,
      set: { activeGroupId: parsed.data.groupId, updatedAt: new Date() },
    });

  return { ok: true };
}
