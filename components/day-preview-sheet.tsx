"use client";

import { useRef, useState } from "react";

import type { Translation } from "@/components/avatar";
import { ReadingDialog } from "@/components/reading-dialog";
import { Sheet } from "@/components/sheet";
import { assignmentReference, checkInOpensLabel, longDate, type PlanEntry } from "@/lib/plan";

export function DayPreviewSheet({
  open,
  entry,
  isRead = false,
  translation = "NET",
  onTranslationChange,
  onClose,
}: {
  open: boolean;
  entry: PlanEntry | null;
  isRead?: boolean;
  translation?: Translation;
  onTranslationChange: (translation: Translation) => void;
  onClose: () => void;
}) {
  const [readingOpen, setReadingOpen] = useState(false);
  const readingTriggerRef = useRef<HTMLButtonElement>(null);

  if (!open || !entry) return null;

  const isGraceDay = entry.day >= 29;

  return (
    <Sheet open={open} onClose={onClose} labelledBy="day-preview-title" className="day-preview-sheet">
      <div data-section="day-preview" className="day-preview-content">
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">{isGraceDay ? `OCTOBER ${entry.day}` : `DAY ${entry.day} OF 20`}</p>
        <h2 id="day-preview-title">{isGraceDay ? `Grace Day ${entry.day - 28}` : assignmentReference(entry)}</h2>
        <p className="day-preview-date">{longDate(entry.date)}</p>
        {entry.title ? <p className="day-preview-title-copy">{entry.title}</p> : null}

        {entry.keyPassage ? (
          <div className="day-preview-verse-wrap">
            <button
              type="button"
              className="quick-verse-button day-preview-verse-btn"
              ref={readingTriggerRef}
              onClick={() => setReadingOpen(true)}
            >
              <span className="eyebrow">KEY PASSAGE</span>
              <span className="day-preview-verse-row">
                <strong>{entry.keyPassage}</strong>
                <span className="day-preview-verse-arrow" aria-hidden="true">→</span>
              </span>
            </button>
          </div>
        ) : null}

        {isRead ? (
          <div className="day-preview-status read-status">
            <span className="status-badge read-badge" aria-hidden="true">✓</span>
            <p className="day-preview-note">Read on {longDate(entry.date)}.</p>
          </div>
        ) : (
          <div className="day-preview-status upcoming-status">
            <p className="day-preview-opens">This is a preview of the plan. {checkInOpensLabel(entry)}</p>
          </div>
        )}
      </div>

      {readingOpen && entry.keyPassage && (
        <ReadingDialog
          chapter={entry.chapter}
          chapters={entry.chapters}
          passageRef={assignmentReference(entry)}
          keyPassageRef={entry.keyPassage}
          assignmentTitle={entry.title}
          translation={translation}
          mode="preview"
          isCatchUp={false}
          chaptersRead={0}
          groupName={null}
          group={null}
          tick={{ kind: "idle" }}
          onReachBottom={() => {}}
          onRetry={() => {}}
          onTranslationChange={onTranslationChange}
          onClose={() => {
            setReadingOpen(false);
            readingTriggerRef.current?.focus();
          }}
        />
      )}
    </Sheet>
  );
}
