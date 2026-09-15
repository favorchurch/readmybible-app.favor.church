"use client";

import type { CheckInGroupState } from "@/app/actions/checkIn";
import { COINS_PER_CHAPTER, nextMedal, stageTransition } from "@/lib/game";
import { ProgressBar } from "@/components/progress-bar";
import { HomeIllustration, stageIndex } from "@/components/rotatable-home";

/**
 * The reward half of a completed reading: coins, next trophy, the group's home
 * growth, and a stage-up when the check-in crossed a milestone.
 *
 * D2 of docs/reading-dialog-tick.md moved this inside the reading dialog, so it
 * renders as content rather than owning a Sheet or a close button -- the dialog
 * owns both. It carries no heading id either; the dialog's own title labels the
 * sheet.
 *
 * `replayKey` changes on every replay (D6/D7) and is used only to re-trigger
 * the entry animation; nothing reads its value.
 */
export function Celebration({
  chapter,
  isCatchUp,
  chaptersRead,
  groupName,
  group,
  simulated,
  replayKey,
}: {
  chapter: number;
  isCatchUp: boolean;
  chaptersRead: number;
  groupName: string | null;
  group: CheckInGroupState | null;
  simulated: boolean;
  replayKey: number;
}) {
  const nextTrophyAt = nextMedal(chaptersRead);
  const trophyProgress = nextTrophyAt ? Math.min(chaptersRead, nextTrophyAt) : chaptersRead;
  const home = groupName ?? "your reading";
  const stageChange = group ? stageTransition(group.before.ratio, group.after.ratio) : null;

  return (
    <div id="today-completion" className="today-completion reading-celebration" key={replayKey} data-section="celebration">
      {isCatchUp && <p className="eyebrow centered">CAUGHT UP</p>}
      <p className="completion-note">
        {isCatchUp
          ? `Matthew ${chapter} is complete. This chapter counts toward finishing Matthew with ${home}.`
          : `Matthew ${chapter} is complete. Your faithful step is helping ${home} build together.`}
      </p>
      {simulated && (
        <p className="simulated-badge" data-section="simulated-badge">
          SIMULATED · NOT SAVED
        </p>
      )}
      <div className="coin-reward-card">
        <strong>+{COINS_PER_CHAPTER}</strong>
        <div>
          <span>POINTS ADDED</span>
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
    </div>
  );
}
