"use server";

import { z } from "zod";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { TRANSLATIONS } from "@/lib/scripture/types";
import { getSessionContext } from "@/lib/session";

// Mirrors the type unions in components/avatar.tsx -- keep in sync with those.
const genders = ["male", "female"] as const;
const faces = ["narrow", "normal", "round"] as const;
const hairStyles = [
  "crop",
  "curls",
  "bob",
  "bun",
  "bald",
  "waves",
  "graybun",
  "pixie",
  "long-curly",
  "medium-curly",
  "short-curly",
  "long-straight",
  "medium-straight",
  "short-straight",
  "long-wavy",
  "medium-wavy",
  "short-wavy",
  "extra-short",
  "ponytail",
] as const;
const glassesStyles = ["none", "round", "wayfarer"] as const;
const facialHairStyles = ["none", "mustache", "stubble", "beard"] as const;

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a #rrggbb color");

const avatarSchema = z
  .object({
    gender: z.enum(genders),
    face: z.enum(faces),
    hair: z.enum(hairStyles),
    glasses: z.enum(glassesStyles),
    facialHair: z.enum(facialHairStyles),
    hairColor: hexColor,
    skinColor: hexColor,
    shirtColor: hexColor,
    backgroundColor: hexColor,
  })
  .strict();

const inputSchema = z.object({
  displayName: z.string().trim().min(1).max(24),
  avatar: avatarSchema,
  translation: z.enum(TRANSLATIONS),
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
