"use client";

import { useState } from "react";
import { useNotifications } from "./NotificationContext";
import type { NudgeButtonProps } from "./types";

export function NudgeButton({
  targetPersonId,
  groupId,
  targetName,
  className = "",
  disabled = false,
  onNudgeSent,
  sendNudge: propSendNudge,
}: NudgeButtonProps) {
  const context = useNotifications();
  const sendNudge = propSendNudge ?? context.sendNudge;

  const [status, setStatus] = useState<"idle" | "pending" | "success" | "already-nudged" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleClick() {
    if (status === "pending" || disabled) return;

    setStatus("pending");
    setFeedback(null);

    try {
      const result = await sendNudge({ targetPersonId, groupId });
      if (result.ok) {
        setStatus("success");
        onNudgeSent?.();
      } else if (result.reason === "already-nudged") {
        setStatus("already-nudged");
        setFeedback(result.error);
      } else {
        setStatus("error");
        setFeedback(result.error);
      }
    } catch {
      setStatus("error");
      setFeedback("Something went wrong. Please try again.");
    }
  }

  const isPending = status === "pending";
  const isSuccess = status === "success";
  const isAlreadyNudged = status === "already-nudged";

  let label = "Nudge";
  if (isPending) label = "Nudging…";
  else if (isSuccess) label = "✓ Nudged";
  else if (isAlreadyNudged) label = "Already nudged today";

  const ariaLabel = targetName ? `Nudge ${targetName}` : "Nudge member";

  return (
    <div className="nudge-btn-wrap">
      <button
        type="button"
        className={`nudge-btn ${isPending ? "nudge-btn--pending" : ""} ${
          isSuccess ? "nudge-btn--success" : ""
        } ${isAlreadyNudged ? "nudge-btn--disabled" : ""} ${className}`}
        onClick={handleClick}
        disabled={disabled || isPending || isSuccess || isAlreadyNudged}
        aria-label={ariaLabel}
        aria-busy={isPending}
        data-testid="nudge-button"
      >
        <span>{label}</span>
      </button>
      {feedback && (
        <p className="nudge-btn-feedback" role="status" data-testid="nudge-feedback">
          {feedback}
        </p>
      )}
    </div>
  );
}
