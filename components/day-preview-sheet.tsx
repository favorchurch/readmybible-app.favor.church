"use client";

import { useRef, useState } from "react";

import type { Translation } from "@/components/avatar";
import { ScripturePopup } from "@/components/scripture-popup";
import { Sheet } from "@/components/sheet";
import { checkInOpensLabel, longDate, type PlanEntry } from "@/lib/plan";

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
  const [quickVerseOpen, setQuickVerseOpen] = useState(false);
  const quickVerseTriggerRef = useRef<HTMLButtonElement>(null);

  if (!open || !entry) return null;

  const isGraceDay = entry.day >= 29;

  return (
    <Sheet open={open} onClose={onClose} labelledBy="day-preview-title" className="day-preview-sheet">
      <div data-section="day-preview" className="day-preview-content">
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">{isGraceDay ? `OCTOBER ${entry.day}` : `DAY ${entry.day} OF 28`}</p>
        <h2 id="day-preview-title">{isGraceDay ? `Grace Day ${entry.day - 28}` : `Matthew ${entry.chapter}`}</h2>
        <p className="day-preview-date">{longDate(entry.date)}</p>
        {entry.title ? <p className="day-preview-title-copy">{entry.title}</p> : null}

        {entry.keyPassage ? (
          <div className="day-preview-verse-wrap">
            <button
              type="button"
              className="quick-verse-button day-preview-verse-btn"
              ref={quickVerseTriggerRef}
              onClick={() => setQuickVerseOpen(true)}
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
            <p className="day-preview-opens">Read ahead any time. {checkInOpensLabel(entry)}</p>
          </div>
        )}
      </div>

      {quickVerseOpen && entry.keyPassage && (
        <ScripturePopup
          passageRef={entry.keyPassage}
          translation={translation}
          onTranslationChange={onTranslationChange}
          onClose={() => {
            setQuickVerseOpen(false);
            quickVerseTriggerRef.current?.focus();
          }}
        />
      )}
    </Sheet>
  );
}
