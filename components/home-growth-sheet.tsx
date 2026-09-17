"use client";

import { Sheet } from "@/components/sheet";
import { homeStages, stageIndex } from "@/components/rotatable-home";
import { StageMini } from "@/components/stage-mini";
import type { Stage } from "@/lib/game";

export function HomeGrowthSheet({
  open,
  onClose,
  currentStage,
}: {
  open: boolean;
  onClose: () => void;
  currentStage: Stage;
}) {
  const currentIndex = stageIndex(currentStage);

  return (
    <Sheet open={open} onClose={onClose} labelledBy="home-growth-title" className="home-growth-sheet">
      <section className="home-growth-modal" data-section="home-growth-sheet">
        <div className="sheet-header">
          <h2 id="home-growth-title">How your home grows</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="home-growth-intro">
          Every reading your Connect Group and its leaders complete adds to your shared progress -- so a small group and a large group grow at the same pace.
        </p>

        <div className="home-growth-stages">
          <span className="stages-title">Home stages</span>
          <ol className="growth-stage-list">
            {homeStages.map((stage, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <li
                  key={stage.name}
                  className={`growth-stage-item ${isCurrent ? "current" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="growth-stage-badge">{idx + 1}</span>
                  <div className="growth-stage-details">
                    <div className="growth-stage-name-row">
                      <strong>{stage.name}</strong>
                      {isCurrent && <span className="growth-stage-pill">Current stage</span>}
                    </div>
                    <span className="growth-stage-note">{stage.note}</span>
                  </div>
                  <StageMini name={stage.name} size={53} className="growth-stage-mini" />
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </Sheet>
  );
}
