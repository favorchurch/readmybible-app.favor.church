"use client";

import { Sheet } from "@/components/sheet";

export function ReadingVisibilityNote({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="reading-visibility-title" className="reading-visibility-sheet">
      <section className="reading-visibility-modal" data-section="reading-visibility">
        <div className="sheet-header">
          <h2 id="reading-visibility-title">Who can see this?</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="reading-visibility-body">
          People in your Connect Group can see whether you&apos;ve checked in today. This app does not show how long you read or what Bible app you used.
        </p>
      </section>
    </Sheet>
  );
}
