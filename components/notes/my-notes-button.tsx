"use client";

import { ScrollIcon } from "./icons";

export function MyNotesButton({
  onClick,
  className = "",
  variant = "default",
}: {
  onClick: () => void;
  className?: string;
  variant?: "default" | "pill" | "inline";
}) {
  const tooltip = "Write in your personal revelations";

  if (variant === "pill") {
    return (
      <button
        type="button"
        className={`my-notes-pill-btn ${className}`}
        onClick={onClick}
        title={tooltip}
        aria-label={`My Notes. ${tooltip}`}
      >
        <ScrollIcon size={16} />
        <span>My Notes</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`my-notes-button ${className}`}
      onClick={onClick}
      title={tooltip}
      aria-label={`My Notes. ${tooltip}`}
    >
      <ScrollIcon size={18} />
      <span>My Notes</span>
    </button>
  );
}
