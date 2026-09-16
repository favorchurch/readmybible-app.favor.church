import { afterEach, describe, expect, it } from "vitest";

import { getFeedbackReviewerPersonIds, isFeedbackReviewer } from "@/lib/feedback/access";
import type { SessionContext } from "@/lib/session";

const session = (rockPersonId: number): Extract<SessionContext, { status: "ok" }> => ({
  status: "ok",
  rockPersonId,
  rockGender: null,
  displayName: "Test reviewer",
  memberships: [],
  sectionMemberships: [],
  activeGroup: null,
  needsGroupChoice: false,
  campusId: null,
  isLeader: false,
  isAdminScope: false,
  defaultTranslation: "NIV",
});

afterEach(() => {
  delete process.env.FEEDBACK_REVIEWER_PERSON_IDS;
});

describe("feedback reviewer access", () => {
  it("parses only positive numeric reviewer IDs", () => {
    expect(getFeedbackReviewerPersonIds("42, 7, nope, 0, -3, 42")).toEqual([42, 7, 42]);
  });

  it("does not inherit Connect or admin scope", () => {
    process.env.FEEDBACK_REVIEWER_PERSON_IDS = "42";
    expect(isFeedbackReviewer(session(42))).toBe(true);
    expect(isFeedbackReviewer(session(99))).toBe(false);
  });
});
