"use client";

import { useState } from "react";

import { COINS_PER_CHAPTER, nextMedal } from "@/lib/game";
import { planEntryForChapter } from "@/lib/plan";
import { ProgressBar } from "@/components/progress-bar";

const LOCATIONS: Array<[string, string]> = [
  ["⌂", "Home"],
  ["▤", "Commute"],
  ["□", "Work"],
  ["☕", "Café"],
  ["♧", "Outside"],
  ["·", "Elsewhere"],
];

export function CompletionFlow({
  step,
  chapter,
  isCatchUp,
  chaptersRead,
  groupName,
  streakDays,
  onClose,
  onComplete,
}: {
  step: number;
  chapter: number;
  isCatchUp: boolean;
  chaptersRead: number;
  groupName: string | null;
  streakDays: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [location, setLocation] = useState("Home");
  const entry = planEntryForChapter(chapter);
  const nextTrophyAt = nextMedal(chaptersRead);
  const trophyProgress = nextTrophyAt ? Math.min(chaptersRead, nextTrophyAt) : chaptersRead;
  const home = groupName ?? "your reading";

  if (!step) return null;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal-sheet">
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
            <button className="primary-button" onClick={onComplete}>
              I read today <span>✓</span>
            </button>
            <p className="honor-note">This is an honor-based check-in. Take your time.</p>
          </>
        ) : isCatchUp ? (
          <>
            <button className="close-button" onClick={onClose} aria-label="Close">
              ×
            </button>
            <div className="celebration-mark">✦</div>
            <p className="eyebrow centered">CAUGHT UP</p>
            <h2 id="modal-title" className="centered">
              Matthew {chapter} is done!
            </h2>
            <p className="reward-line">
              <b>+{COINS_PER_CHAPTER} coins</b> for {home}
            </p>
            <p className="catchup-modal-note">
              This counts toward finishing Matthew. Your daily streak stays at {streakDays} day
              {streakDays === 1 ? "" : "s"}.
            </p>
            <div className="location-question">
              <strong>Where did you read today?</strong>
              <span>Optional, just for fun.</span>
              <div className="location-grid">
                {LOCATIONS.map(([icon, label]) => (
                  <button
                    key={label}
                    type="button"
                    className={location === label ? "selected" : ""}
                    onClick={() => setLocation(label)}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button className="primary-button" onClick={onClose}>
              See what changed <span>→</span>
            </button>
          </>
        ) : (
          <div className="today-completion">
            <button className="close-button" onClick={onClose} aria-label="Close congratulations">
              ×
            </button>
            <div className="celebration-mark">✦</div>
            <p className="eyebrow centered">TODAY&apos;S READING COMPLETE</p>
            <h2 id="modal-title" className="centered">
              Read. Nice one.
            </h2>
            <p className="completion-note">
              Matthew {chapter} is complete. Your faithful step is helping {home} build together.
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
            <button className="primary-button completion-close" onClick={onClose}>
              Close <span>✓</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
