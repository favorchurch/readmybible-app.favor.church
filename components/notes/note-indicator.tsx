"use client";

import { LockIcon, ScrollIcon } from "./icons";

export function NoteIndicator({
  exists,
  isShared = false,
  isOwner = true,
  onClick,
  className = "",
  size = 14,
}: {
  exists: boolean;
  isShared?: boolean;
  isOwner?: boolean;
  onClick?: () => void;
  className?: string;
  size?: number;
}) {
  if (!exists) return null;

  const label = isOwner
    ? isShared
      ? "My note (Shared with connect & leaders)"
      : "My note (Private)"
    : isShared
      ? "Shared note available"
      : "Private note written";

  const content = (
    <span
      className={`note-indicator-badge ${isShared ? "is-shared" : "is-private"} ${className}`}
      title={label}
      aria-label={label}
    >
      <ScrollIcon size={size} className="note-indicator-icon" />
      {!isShared && <LockIcon size={Math.max(10, size - 4)} className="note-indicator-lock" />}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="note-indicator-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title={label}
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return content;
}
