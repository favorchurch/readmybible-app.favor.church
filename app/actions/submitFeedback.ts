"use server";

import { z } from "zod";

import { db } from "@/db";
import { feedback } from "@/db/schema";
import { FEEDBACK_CATEGORIES, feedbackCategorySchema } from "@/lib/feedback/constants";
import { getSessionContext } from "@/lib/session";

const inputSchema = z
  .object({
    category: feedbackCategorySchema,
    textualFeedback: z.string().trim().min(1).max(5000),
  })
  .strict();

export type SubmitFeedbackInput = z.infer<typeof inputSchema>;
export type SubmitFeedbackResult = { ok: true } | { ok: false; error: string };

export async function submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Choose one of these categories and add up to 5,000 characters of feedback: ${FEEDBACK_CATEGORIES.join(" or ")}.`,
    };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to send feedback." };
  }

  try {
    await db.insert(feedback).values({
      rockPersonId: session.rockPersonId,
      category: parsed.data.category,
      textualFeedback: parsed.data.textualFeedback,
    });
  } catch (error) {
    console.error("submitFeedback failed while saving identified feedback", {
      error,
      rockPersonId: session.rockPersonId,
    });
    return { ok: false, error: "We couldn't send your feedback. Please try again." };
  }

  return { ok: true };
}
