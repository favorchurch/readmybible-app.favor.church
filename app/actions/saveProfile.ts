"use server";

import { z } from "zod";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSessionContext } from "@/lib/session";

const translations = ["NET", "ESV", "CSB", "NIV", "NLT"] as const;

const inputSchema = z.object({
  displayName: z.string().trim().min(1).max(24),
  avatar: z.record(z.string(), z.unknown()),
  translation: z.enum(translations),
});

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

export async function saveProfile(input: z.infer<typeof inputSchema>): Promise<SaveProfileResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That profile didn't look right. Try again." };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to save a profile." };
  }

  await db
    .insert(profiles)
    .values({
      rockPersonId: session.rockPersonId,
      displayName: parsed.data.displayName,
      avatar: parsed.data.avatar,
      translation: parsed.data.translation,
    })
    .onConflictDoUpdate({
      target: profiles.rockPersonId,
      set: {
        displayName: parsed.data.displayName,
        avatar: parsed.data.avatar,
        translation: parsed.data.translation,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
}
