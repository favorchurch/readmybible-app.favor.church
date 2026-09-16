"use server";

import { desc } from "drizzle-orm";

import { db } from "@/db";
import { feedback } from "@/db/schema";
import { isFeedbackReviewer } from "@/lib/feedback/access";
import { feedbackCategorySchema, type FeedbackCategory } from "@/lib/feedback/constants";
import { getSessionContext } from "@/lib/session";

export type FeedbackReviewItem = {
  id: number;
  submittedByPersonId: number;
  category: FeedbackCategory;
  textualFeedback: string;
  submittedAt: string;
};

export type GetFeedbackResult =
  | { ok: true; items: FeedbackReviewItem[] }
  | { ok: false; error: string };

export async function getFeedback(): Promise<GetFeedbackResult> {
  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to view feedback." };
  }
  if (!isFeedbackReviewer(session)) {
    return { ok: false, error: "You don't have access to submitted feedback." };
  }

  try {
    const rows = await db
      .select({
        id: feedback.id,
        submittedByPersonId: feedback.rockPersonId,
        category: feedback.category,
        textualFeedback: feedback.textualFeedback,
        submittedAt: feedback.createdAt,
      })
      .from(feedback)
      .orderBy(desc(feedback.createdAt), desc(feedback.id));

    const items: FeedbackReviewItem[] = [];
    for (const row of rows) {
      const category = feedbackCategorySchema.safeParse(row.category);
      if (!category.success) {
        console.error("getFeedback skipped a row with an invalid category", { feedbackId: row.id });
        continue;
      }
      items.push({
        id: row.id,
        submittedByPersonId: row.submittedByPersonId,
        category: category.data,
        textualFeedback: row.textualFeedback,
        submittedAt: row.submittedAt.toISOString(),
      });
    }

    return { ok: true, items };
  } catch (error) {
    console.error("getFeedback failed while loading submitted feedback", {
      error,
      rockPersonId: session.rockPersonId,
    });
    return { ok: false, error: "We couldn't load submitted feedback. Please try again." };
  }
}
