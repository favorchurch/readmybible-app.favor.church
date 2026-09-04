"use client";

import type { CheckInGroupState } from "@/app/actions/checkIn";
import { COINS_PER_CHAPTER, nextMedal, stageTransition } from "@/lib/game";
import { planEntryForChapter } from "@/lib/plan";
import { ProgressBar } from "@/components/progress-bar";
import { HomeIllustration, stageIndex } from "@/components/rotatable-home";
import { Sheet } from "@/components/sheet";

export function CompletionFlow({
  step,
  chapter,
  isCatchUp,
  chaptersRead,
  groupName,
  group,
  error,
  pending,
  onClose,
  onComplete,
}: {
  step: number;
  chapter: number;
  isCatchUp: boolean;
  chaptersRead: number;
  groupName: string | null;
  group: CheckInGroupState | null;
  error?: string | null;
  pending?: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const entry = planEntryForChapter(chapter);
  const nextTrophyAt = nextMedal(chaptersRead);
  const trophyProgress = nextTrophyAt ? Math.min(chaptersRead, nextTrophyAt) : chaptersRead;
  const home = groupName ?? "your reading";
  const stageChange = group ? stageTransition(group.before.ratio, group.after.ratio) : null;

  return (
    <Sheet open={Boolean(step)} onClose={onClose} labelledBy="modal-title">
      {step === 1 ? (
        <>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
          <p className="eyebrow">{isCatchUp ? "CATCH-UP READING" : "TODAY'S READING"}</p>
          <h2 id="modal-title">Matthew {chapter}</h2>
          {entry && <p className="passage-note">{entry.title}</p>}
          <div className="reading-prompt">
            <span>{String(chapter).padStart(2, "0")}</span>
            <div>
              <strong>Read Matthew chapter {chapter}</strong>
              <small>Use your Bible or preferred Bible app.</small>
            </div>
          </div>
          <button className="primary-button" onClick={onComplete} disabled={pending}>
            I read today <span>✓</span>
          </button>
          {error && <p className="error-note">{error}</p>}
          <p className="honor-note">This is an honor-based check-in. Take your time.</p>
        </>
      ) : (
        <div className="today-completion">
          <button className="close-button" onClick={onClose} aria-label="Close congratulations">
            ×
          </button>
          <div className="celebration-mark">✦</div>
          <p className="eyebrow centered">{isCatchUp ? "CAUGHT UP" : "TODAY'S READING COMPLETE"}</p>
          <h2 id="modal-title" className="centered">
            {isCatchUp ? `Matthew ${chapter} is done!` : "Read. Nice one."}
          </h2>
          <p className="completion-note">
            {isCatchUp
              ? `Matthew ${chapter} is complete. This chapter counts toward finishing Matthew with ${home}.`
              : `Matthew ${chapter} is complete. Your faithful step is helping ${home} build together.`}
          </p>
          <div className="coin-reward-card">
            <strong>+{COINS_PER_CHAPTER}</strong>
            <div>
              <span>COINS ADDED</span>
              <b>To {home}</b>
            </div>
          </div>
          {nextTrophyAt !== null && (
            <div className="trophy-progress-card">
              <div className="completion-trophy" aria-hidden="true">
                <span>★</span>
                <i />
              </div>
              <div className="trophy-progress-copy">
                <p>NEXT TROPHY</p>
                <div>
                  <strong>{nextTrophyAt} chapters</strong>
                  <span>
                    {trophyProgress} / {nextTrophyAt} chapters
                  </span>
                </div>
                <ProgressBar value={trophyProgress} max={nextTrophyAt} />
                <small>{nextTrophyAt - trophyProgress} more chapters to unlock</small>
              </div>
            </div>
          )}
          {group && (
            <p className="home-progress-line">
              <strong>
                {Math.round(group.before.ratio * 100)}% → {Math.round(group.after.ratio * 100)}%
              </strong>{" "}
              of {home}&apos;s shared home, now a {group.after.stage}.
            </p>
          )}
          {stageChange && (
            <div className="stage-up" data-section="stage-up">
              <HomeIllustration stage={stageIndex(stageChange.to)} />
              <p>
                <strong>{home}</strong> grew from a {stageChange.from} to a {stageChange.to}.
              </p>
            </div>
          )}
          <button className="primary-button completion-close" onClick={onClose}>
            Close <span>✓</span>
          </button>
        </div>
      )}
    </Sheet>
  );
}
