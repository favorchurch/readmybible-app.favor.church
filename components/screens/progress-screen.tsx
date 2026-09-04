"use client";

import { useMemo, useState } from "react";

import { Avatar, type Translation, type UserProfile } from "@/components/avatar";
import { DayPreviewSheet } from "@/components/day-preview-sheet";
import { ProgressBar } from "@/components/progress-bar";
import { StageMini } from "@/components/stage-mini";
import { Header } from "@/components/screens/header";
import { REWARD_TITLES } from "@/components/screens/rewards-screen";
import type { useToday } from "@/components/use-today";
import { nextMedal, stageFor, TOTAL_CHAPTERS } from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import { dayState, PLAN, type DayState, type PlanEntry } from "@/lib/plan";

const GRACE_DAYS: PlanEntry[] = [
  { day: 29, chapter: 29, date: "2026-10-29", keyPassage: "", title: "Catch-up day" },
  { day: 30, chapter: 30, date: "2026-10-30", keyPassage: "", title: "Catch-up day" },
  { day: 31, chapter: 31, date: "2026-10-31", keyPassage: "", title: "Catch-up day" },
];

export function ProgressScreen({
  today,
  chapters,
  chaptersRead,
  coins,
  streakDays,
  groupName,
  campusName,
  campusBoard,
  profile,
  onCatchUp,
  onEditProfile,
  onTranslationChange,
}: {
  today: ReturnType<typeof useToday>;
  chapters: number[];
  chaptersRead: number;
  coins: number;
  streakDays: number;
  groupName: string | null;
  campusName: string | null;
  campusBoard: GroupStanding[];
  profile: UserProfile;
  onCatchUp: (chapter: number) => void;
  onEditProfile: () => void;
  onTranslationChange: (translation: Translation) => void;
}) {
  const completedDays = useMemo(() => new Set(chapters), [chapters]);
  const next = nextMedal(chaptersRead);
  const isPreLaunch = today.displayPhase === "pre-launch";

  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(null);
  const [previewIsRead, setPreviewIsRead] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleCellClick(entry: PlanEntry, cellState: DayState | "grace") {
    if (cellState === "read") {
      setSelectedEntry(entry);
      setPreviewIsRead(true);
      setPreviewOpen(true);
    } else if (cellState === "catch-up" || cellState === "today") {
      onCatchUp(entry.chapter);
    } else if (cellState === "upcoming" || cellState === "grace") {
      setSelectedEntry(entry);
      setPreviewIsRead(false);
      setPreviewOpen(true);
    }
  }

  return (
    <main className="screen progress-screen frame frame--rail">
      <Header heading="Your progress" profile={profile} onEditProfile={onEditProfile} />
      <div className="frame__span">
        <section className="progress-profile-card" aria-label={`${profile.displayName}'s profile and reading highlights`}>
          <Avatar
            color="coral"
            gender={profile.gender}
            hair={profile.hair}
            glasses={profile.glasses}
            facialHair={profile.facialHair}
            face={profile.face}
            hairColor={profile.hairColor}
            skinColor={profile.skinColor}
            shirtColor={profile.shirtColor}
            backgroundColor={profile.backgroundColor}
            preview
          />
          <div className="progress-profile-copy">
            <p className="eyebrow">YOUR PROFILE</p>
            <h2>{profile.displayName}</h2>
            <span>{groupName ?? "Reading solo"}</span>
            <button type="button" onClick={onEditProfile}>
              Edit avatar <b>→</b>
            </button>
          </div>
          {!isPreLaunch && (
            <div className="progress-profile-highlights">
              <div>
                <b>{streakDays}</b>
                <span>day streak</span>
              </div>
              <div>
                <b>{chaptersRead}</b>
                <span>chapters read</span>
              </div>
            </div>
          )}
        </section>
        <section className="page-title compact">
          <p className="eyebrow">YOUR OCTOBER</p>
          <h1>Keep showing up.</h1>
          <p>Grace for the missed days. Joy in the next one.</p>
        </section>
      </div>

      <div className="frame__main">
        <section className="calendar-card" data-section="calendar">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MATTHEW · OCTOBER 2026</p>
              <h2>October</h2>
            </div>
          </div>
          <div className="weekday">
            {"SMTWTFS".split("").map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            <span key="blank-0" className="calendar-blank" aria-hidden="true" />
            <span key="blank-1" className="calendar-blank" aria-hidden="true" />
            <span key="blank-2" className="calendar-blank" aria-hidden="true" />
            <span key="blank-3" className="calendar-blank" aria-hidden="true" />
            {PLAN.map((entry) => {
              const isRead = completedDays.has(entry.chapter);
              const state = dayState(entry, today.todayLocal, isRead);
              const labelState = state === "read" ? "Read" : state === "today" ? "Today" : state === "catch-up" ? "Catch up" : "Upcoming";
              return (
                <button
                  type="button"
                  key={entry.day}
                  data-day={entry.day}
                  data-day-state={state}
                  className={`calendar-cell ${state}-cell`}
                  onClick={() => handleCellClick(entry, state)}
                  aria-label={`Day ${entry.day}, Matthew ${entry.chapter}, ${labelState}`}
                >
                  {state === "read" && <span className="cell-glyph" aria-hidden="true">✓</span>}
                  <span className="day-number">{entry.day}</span>
                  {state === "today" && <span className="sr-only">Today</span>}
                  {state === "today" && <span className="today-ring" aria-hidden="true" />}
                  {state === "catch-up" && <i className="cell-tag">Catch up</i>}
                </button>
              );
            })}
            {GRACE_DAYS.map((entry) => (
              <button
                type="button"
                key={entry.day}
                data-day={entry.day}
                data-day-state="grace"
                className="calendar-cell grace-cell"
                onClick={() => handleCellClick(entry, "grace")}
                aria-label={`October ${entry.day}, Catch up day`}
              >
                <span className="day-number">{entry.day}</span>
                <i className="cell-tag">Catch up</i>
              </button>
            ))}
          </div>
          <div className="calendar-legend" data-section="calendar-legend">
            <div className="legend-item">
              <span className="legend-swatch read-swatch" aria-hidden="true">✓</span>
              <span>Read</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch today-swatch" aria-hidden="true" />
              <span>Today</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch catchup-swatch" aria-hidden="true">Catch up</span>
              <span>Catch up</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch upcoming-swatch" aria-hidden="true">28</span>
              <span>Upcoming</span>
            </div>
          </div>
        </section>
      </div>

      <div className="frame__rail">
        {isPreLaunch ? (
          <section className="plan-facts-card" data-section="plan-facts">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE PLAN</p>
                <h2>Matthew in October</h2>
              </div>
            </div>
            <div className="plan-facts-grid">
              <div className="plan-fact-item">
                <b className="plan-fact-value">28</b>
                <span className="plan-fact-label">chapters</span>
              </div>
              <div className="plan-fact-item">
                <b className="plan-fact-value">1</b>
                <span className="plan-fact-label">chapter a day</span>
              </div>
              <div className="plan-fact-item">
                <b className="plan-fact-value">October 1 to 28</b>
                <span className="plan-fact-label">reading days</span>
              </div>
              <div className="plan-fact-item">
                <b className="plan-fact-value">October 29 to 31</b>
                <span className="plan-fact-label">catch-up days</span>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="stats-card">
              <div className="chapter-ring">
                <span>
                  <b>{chaptersRead}</b>
                  <small>/ {TOTAL_CHAPTERS}</small>
                </span>
              </div>
              <div className="stat-copy">
                <p>CHAPTERS</p>
                <h2>{chaptersRead}/28</h2>
                <ProgressBar value={chaptersRead} max={TOTAL_CHAPTERS} />
                <span>{TOTAL_CHAPTERS - chaptersRead} chapters to go</span>
              </div>
            </section>
            <section className="mini-stats">
              <article>
                <span className="stat-icon coral">●</span>
                <div>
                  <b>{streakDays} days</b>
                  <small>Streak</small>
                </div>
              </article>
              <article>
                <span className="stat-icon gold">◉</span>
                <div>
                  <b>{coins} coins</b>
                  <small>Coins</small>
                </div>
              </article>
            </section>
            {next !== null && (
              <section className="next-reward progress-reward">
                <div className="mini-medal gold">◇</div>
                <div>
                  <p className="eyebrow">UP NEXT</p>
                  <h2>{REWARD_TITLES[next]}</h2>
                  <span>{next - chaptersRead} more chapters</span>
                </div>
                <strong>
                  {chaptersRead} / {next}
                </strong>
              </section>
            )}
          </>
        )}
      </div>

      <section className="leaderboard-card frame__span" data-section="campus-groups">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{(campusName ?? "Favor Church").toUpperCase()} CONNECT GROUPS</p>
            <h2>Groups on the same journey</h2>
          </div>
        </div>
        <p className="gentle-note">Cheer them on.</p>
        {campusBoard.length === 0 ? (
          <p className="gentle-note">No groups on the board yet. October&apos;s coming.</p>
        ) : (
          <div className="campus-groups-grid">
            {campusBoard.map((g) => {
              const currentStage = stageFor(g.ratio);
              const pct = Math.round(g.ratio * 100);
              return (
                <article className="campus-group-card" key={g.groupId}>
                  <div className="campus-group-header">
                    <StageMini name={currentStage} size={42} className="campus-group-mini" />
                    <div className="campus-group-info">
                      <strong>{g.name}</strong>
                      <span className="campus-group-status">{pct}% complete · {currentStage}</span>
                    </div>
                  </div>
                  <ProgressBar value={pct} max={100} />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <DayPreviewSheet
        open={previewOpen}
        entry={selectedEntry}
        isRead={previewIsRead}
        translation={profile.translation}
        onTranslationChange={onTranslationChange}
        onClose={() => setPreviewOpen(false)}
      />
    </main>
  );
}
