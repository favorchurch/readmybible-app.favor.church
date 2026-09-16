import { z } from "zod";

/** Keep the database CHECK in drizzle/0001_add_feedback.sql synchronized when categories change. */
export const FEEDBACK_CATEGORIES = ["Read My Bible App", "Experience with Favor Connects"] as const;

export const feedbackCategorySchema = z.enum(FEEDBACK_CATEGORIES);

export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;
