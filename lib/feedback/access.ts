import type { SessionContext } from "@/lib/session";

function parsePersonIds(value: string | undefined): number[] {
  return (value ?? "")
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((personId) => Number.isInteger(personId) && personId > 0);
}

export function getFeedbackReviewerPersonIds(value = process.env.FEEDBACK_REVIEWER_PERSON_IDS): number[] {
  return parsePersonIds(value);
}

/**
 * Feedback reviewers are an explicit allowlist, intentionally separate from
 * ADMIN_PERSON_IDS and Connect leadership scope.
 */
export function isFeedbackReviewer(session: SessionContext): boolean {
  return session.status === "ok" && getFeedbackReviewerPersonIds().includes(session.rockPersonId);
}
