"use client";

import { useMemo, useState } from "react";

import { type Translation, type UserProfile } from "@/components/avatar";
import { DayPreviewSheet } from "@/components/day-preview-sheet";
import { NoteIndicator, useNotesPresence } from "@/components/notes";
import { ProgressBar } from "@/components/progress-bar";
import { Header } from "@/components/screens/header";
import type { ConnectSwitcherContext } from "@/components/connect-switcher";
import { REWARD_TITLES } from "@/components/screens/rewards-screen";
import type { useToday } from "@/components/use-today";
import { nextMedal } from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import {
  assignmentReference,
  calendarLeadingBlankCount,
  dayState,
  isAssignmentCompleted,
  PLAN,
  REVIEW_DATES,
  TOTAL_ASSIGNMENTS,
  type DayState,
  type PlanEntry,
} from "@/lib/plan";

const CALENDAR_LEADING_BLANKS = calendarLeadingBlankCount();
const CALENDAR_DAYS = [
  ...PLAN.map((entry) => ({ kind: "assignment" as const, date: entry.date, entry })),
  ...REVIEW_DATES.map((date) => ({ kind: "review" as const, date })),
].sort((a, b) => a.date.localeCompare(b.date));

function campusGroupCountLabel(count: number): string {
  return `${count} Connect Group${count === 1 ? "" : "s"} on this campus.`;
}

export function ProgressScreen({
  today,
  chapters,
  chaptersRead,
  coins,
  streakDays,
  campusBoard,
  profile,
  onCatchUp,
  onEditProfile,
  onTranslationChange,
  connectSwitcher,
}: {
  today: ReturnType<typeof useToday>;
  chapters: number[];
  chaptersRead: number;
  coins: number;
  streakDays: number;
  groupName: string | null;
  campusBoard: GroupStanding[];
  profile: UserProfile;
  onCatchUp: (chapter: number) => void;
  onEditProfile: () => void;
  onTranslationChange: (translation: Translation) => void;
  connectSwitcher?: ConnectSwitcherContext;
}) {
  const completedAssignmentDays = useMemo(
    () => new Set(PLAN.filter((entry) => isAssignmentCompleted(entry, chapters)).map((entry) => entry.day)),
    [chapters],
  );
  const next = nextMedal(chaptersRead);
  const isPreLaunch = today.displayPhase === "pre-launch";
  const { hasNote, isShared: noteIsShared } = useNotesPresence();

  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(null);
  const [previewIsRead, setPreviewIsRead] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleCellClick(entry: PlanEntry, cellState: DayState) {
    if (cellState === "read") {
      setSelectedEntry(entry);
      setPreviewIsRead(true);
      setPreviewOpen(true);
    } else if (cellState === "catch-up" || cellState === "today") {
      onCatchUp(entry.chapter);
    } else if (cellState === "upcoming") {
      setSelectedEntry(entry);
      setPreviewIsRead(false);
      setPreviewOpen(true);
    }
  }

  return (
    <main className="screen progress-screen frame frame--rail">
      <Header heading="Your progress" profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
      <div className="frame__span">
        <section className="page-title compact">
          <p className="eyebrow">YOUR OCTOBER</p>
          <h1>Your Progress</h1>
          <p>20 assignments · Oct 5–30 · 6 review days</p>
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
            {Array.from({ length: CALENDAR_LEADING_BLANKS }, (_, index) => (
              <span key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />
            ))}
            {CALENDAR_DAYS.map((day) => {
              const dayNumber = Number(day.date.slice(-2));
              if (day.kind === "review") {
                return (
                  <span
                    key={day.date}
                    data-date={day.date}
                    data-day-state="review"
                    className="calendar-cell review-cell"
                    aria-label={`October ${dayNumber}, Review day`}
                  >
                    <span className="day-number">{dayNumber}</span>
                    <i className="cell-tag" aria-hidden="true">↺</i>
                    {hasNote(day.date) && (
                      <NoteIndicator
                        exists
                        isShared={noteIsShared(day.date)}
                        isOwner
                        size={10}
                        className="calendar-note-indicator"
                      />
                    )}
                  </span>
                );
              }

              const entry = day.entry;
              const isRead = completedAssignmentDays.has(entry.day);
              const state = dayState(entry, today.todayLocal, isRead);
              const labelState = state === "read" ? "Read" : state === "today" ? "Today" : state === "catch-up" ? "Catch up" : "Upcoming";
              return (
                <button
                  type="button"
                  key={entry.day}
                  data-day={entry.day}
                  data-date={day.date}
                  data-day-state={state}
                  className={`calendar-cell ${state}-cell`}
                  onClick={() => handleCellClick(entry, state)}
                  aria-label={`Day ${entry.day}, ${assignmentReference(entry)}, ${labelState}`}
                  aria-current={entry.date === today.todayLocal ? "date" : undefined}
                >
                  {state === "read" && <span className="cell-glyph" aria-hidden="true">✓</span>}
                  <span className="day-number">{dayNumber}</span>
                  {state === "today" && <i className="cell-tag">Today</i>}
                  {state === "today" && <span className="today-ring" aria-hidden="true" />}
                  {state === "catch-up" && <i className="cell-tag" aria-hidden="true">↺</i>}
                  {hasNote(day.date) && (
                    <NoteIndicator
                      exists
                      isShared={noteIsShared(day.date)}
                      isOwner
                      size={10}
                      className="calendar-note-indicator"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="calendar-legend" data-section="calendar-legend">
            <div className="legend-item">
              <span className="legend-swatch read-swatch" aria-hidden="true">✓</span>
              <span>Read</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch today-swatch" aria-hidden="true">•</span>
              <span>Today</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch catchup-swatch" aria-hidden="true">↺</span>
              <span>Catch-up</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch upcoming-swatch" aria-hidden="true">20</span>
              <span>Upcoming</span>
            </div>
          </div>
          <p className="calendar-preview-note">Tap an upcoming day for a preview. Reading and check-ins open on its scheduled day.</p>
        </section>
      </div>

      <div className="frame__rail">
        {isPreLaunch ? (
          <>
            <section className="plan-facts-card" data-section="plan-facts">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">THE PLAN</p>
                  <h2>One chapter. Each day.</h2>
                </div>
              </div>
              <p>Start with Matthew 1 on October 1. Miss a day? There is room to catch up, including October 29–31.</p>
            </section>

            <p className="campus-group-count" data-section="campus-group-count">
              {campusGroupCountLabel(campusBoard.length)}
            </p>
          </>
        ) : (
          <>
            <section className="stats-card">
              <div className="chapter-ring" style={{ background: `conic-gradient(var(--gold) 0 ${Math.min(100, chaptersRead / TOTAL_ASSIGNMENTS * 100)}%, rgba(255,255,255,.14) 0)` }}>
                <span>
                  <b>{chaptersRead}</b>
                  <small>/ {TOTAL_ASSIGNMENTS}</small>
                </span>
              </div>
              <div className="stat-copy">
                <p>ASSIGNMENTS</p>
                <h2>{chaptersRead}/{TOTAL_ASSIGNMENTS}</h2>
                <ProgressBar value={chaptersRead} max={TOTAL_ASSIGNMENTS} />
                <span>{TOTAL_ASSIGNMENTS - chaptersRead} assignments to go</span>
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
                  <b>{coins} points</b>
                  <small>Points</small>
                </div>
              </article>
            </section>
            {next !== null && (
              <section className="next-reward progress-reward">
                <div className="mini-medal gold">◇</div>
                <div>
                  <p className="eyebrow">UP NEXT</p>
                  <h2>{REWARD_TITLES[next]}</h2>
                  <span>{next - chaptersRead} more assignments</span>
                </div>
                <strong>
                  {chaptersRead} / {next}
                </strong>
              </section>
            )}
            <p className="campus-group-count" data-section="campus-group-count">
              {campusGroupCountLabel(campusBoard.length)}
            </p>
          </>
        )}
      </div>

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
