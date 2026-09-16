import { z } from "zod";

export const FEEDBACK_CATEGORIES = ["Read My Bible App", "Experience with Favor Connects"] as const;

export const feedbackCategorySchema = z.enum(FEEDBACK_CATEGORIES);

export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;
