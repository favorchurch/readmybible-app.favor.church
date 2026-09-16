"use client";

import { useState } from "react";

import { submitFeedback } from "@/app/actions/submitFeedback";
import { Sheet } from "@/components/sheet";
import { useToastAction } from "@/components/toast";
import { FEEDBACK_CATEGORIES, feedbackCategorySchema, type FeedbackCategory } from "@/lib/feedback/constants";

export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const runToastAction = useToastAction();
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [textualFeedback, setTextualFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!category) {
      setError("Choose a category first.");
      return;
    }
    if (!textualFeedback.trim()) {
      setError("Add a little detail so we know what to improve.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await runToastAction(
        "Sending your feedback…",
        "Feedback sent. Thanks for helping us improve!",
        () => submitFeedback({ category, textualFeedback }),
        "We couldn't send your feedback. Please try again.",
      );
      if (result.ok) {
        setCategory("");
        setTextualFeedback("");
        onClose();
      }
    } catch {
      setError("We couldn't send your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} labelledBy="feedback-title" className="feedback-sheet">
      <div className="feedback-heading">
        <p className="eyebrow">HELP US GROW</p>
        <h2 id="feedback-title">Add your Feedback</h2>
        <p className="feedback-intro">
          Tell us what would make Read My Bible a better place to read and grow together.
        </p>
      </div>
      <form className="feedback-form" onSubmit={handleSubmit}>
        <label className="feedback-field" htmlFor="feedback-category">
          <span>Category</span>
          <select
            id="feedback-category"
            aria-label="Category"
            value={category}
            onChange={(event) => {
              const nextCategory = event.target.value;
              if (nextCategory === "") {
                setCategory("");
                return;
              }
              const parsedCategory = feedbackCategorySchema.safeParse(nextCategory);
              if (parsedCategory.success) setCategory(parsedCategory.data);
            }}
            disabled={submitting}
          >
            <option value="">Choose a category</option>
            {FEEDBACK_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="feedback-field" htmlFor="feedback-text">
          <span>Textual Feedback</span>
          <textarea
            id="feedback-text"
            aria-label="Textual Feedback"
            value={textualFeedback}
            onChange={(event) => setTextualFeedback(event.target.value)}
            maxLength={5000}
            rows={7}
            disabled={submitting}
            placeholder="What happened, and what would you change?"
          />
          <small>{textualFeedback.length}/5,000</small>
        </label>
        <p className="feedback-note">Your feedback is identified and reviewed by the Read My Bible team.</p>
        {error && <p className="error-note" role="alert">{error}</p>}
        <button type="submit" className="primary-button feedback-submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Sending…" : "Send feedback"}
        </button>
      </form>
    </Sheet>
  );
}
