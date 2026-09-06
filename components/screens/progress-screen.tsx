"use client";

import { useMemo, useState } from "react";

import { type Translation, type UserProfile } from "@/components/avatar";
import { DayPreviewSheet } from "@/components/day-preview-sheet";
import { ProgressBar } from "@/components/progress-bar";
import { Header } from "@/components/screens/header";
import type { ConnectSwitcherContext } from "@/components/connect-switcher";
import { REWARD_TITLES } from "@/components/screens/rewards-screen";
import type { useToday } from "@/components/use-today";
import { nextMedal, TOTAL_CHAPTERS } from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import { dayState, PLAN, type DayState, type PlanEntry } from "@/lib/plan";

const GRACE_DAYS: PlanEntry[] = [
  { day: 29, chapter: 29, date: "2026-10-29", keyPassage: "", title: "Catch-up day" },
  { day: 30, chapter: 30, date: "2026-10-30", keyPassage: "", title: "Catch-up day" },
  { day: 31, chapter: 31, date: "2026-10-31", keyPassage: "", title: "Catch-up day" },
];

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
      <Header heading="Your progress" profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
      <div className="frame__span">
        <section className="page-title compact">
          <p className="eyebrow">YOUR OCTOBER</p>
          <h1>Your Progress</h1>
          <p>28 chapters · Oct 1–28 · 3 catch-up days</p>
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
                  aria-current={entry.date === today.todayLocal ? "date" : undefined}
                >
                  {state === "read" && <span className="cell-glyph" aria-hidden="true">✓</span>}
                  <span className="day-number">{entry.day}</span>
                  {state === "today" && <i className="cell-tag">Today</i>}
                  {state === "today" && <span className="today-ring" aria-hidden="true" />}
                  {state === "catch-up" && <i className="cell-tag" aria-hidden="true">↺</i>}
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
                <i className="cell-tag" aria-hidden="true">↺</i>
              </button>
            ))}
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
              <span className="legend-swatch upcoming-swatch" aria-hidden="true">28</span>
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
              <div className="chapter-ring" style={{ background: `conic-gradient(var(--gold) 0 ${Math.min(100, chaptersRead / TOTAL_CHAPTERS * 100)}%, rgba(255,255,255,.14) 0)` }}>
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
