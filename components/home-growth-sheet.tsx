"use client";

import { Sheet } from "@/components/sheet";
import { homeStages, stageIndex } from "@/components/rotatable-home";
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
          Every chapter your Connect Group reads adds to your shared progress. Your home grows by the percentage of Matthew your group has completed, so a group of 5 and a group of 15 grow at the same pace.
        </p>

        <p className="home-growth-principle">
          Coins celebrate every chapter. Group completion percentage decides the home stage.
        </p>

        <div className="home-growth-formula">
          <span className="formula-label">How progress is calculated</span>
          <p className="formula-text">group check-ins divided by members times 28</p>
        </div>

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
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </Sheet>
  );
}
