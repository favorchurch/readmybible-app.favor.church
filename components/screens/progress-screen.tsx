"use client";

import { useMemo } from "react";

import { Avatar, type UserProfile } from "@/components/avatar";
import { ProgressBar } from "@/components/progress-bar";
import { Header } from "@/components/screens/header";
import { REWARD_TITLES } from "@/components/screens/rewards-screen";
import type { useToday } from "@/components/use-today";
import { nextMedal, stageFor, TOTAL_CHAPTERS } from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import { PLAN } from "@/lib/plan";

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
}) {
  const completedDays = useMemo(() => new Set(chapters), [chapters]);
  const next = nextMedal(chaptersRead);

  return (
    <main className="screen progress-screen">
      <Header heading="Your progress" profile={profile} onEditProfile={onEditProfile} />
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
      </section>
      <section className="page-title compact">
        <p className="eyebrow">YOUR OCTOBER</p>
        <h1>Keep showing up.</h1>
        <p>Grace for the missed days. Joy in the next one.</p>
      </section>
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
      <section className="calendar-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MATTHEW · OCTOBER 2026</p>
            <h2>October</h2>
          </div>
          <span className="calendar-key">
            <i /> Read
          </span>
        </div>
        <div className="weekday">
          {"SMTWTFS".split("").map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          <span />
          <span />
          <span />
          <span />
          {PLAN.map((entry) => {
            const isRead = completedDays.has(entry.chapter);
            const isToday = entry.day === today.dayLabel && today.phase === "active";
            const isPast = entry.date < today.todayLocal;
            if (!isRead && isPast) {
              return (
                <button type="button" key={entry.day} className="missed catchup-day" onClick={() => onCatchUp(entry.chapter)} aria-label={`Catch up Matthew ${entry.chapter}`}>
                  {entry.day}
                  <i>Catch up</i>
                </button>
              );
            }
            return (
              <span key={entry.day} className={isRead ? "read" : isToday ? "today" : ""}>
                {isRead ? "✓" : entry.day}
              </span>
            );
          })}
        </div>
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

      <section className="leaderboard-card">
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
          <ul className="leaderboard-list">
            {campusBoard.map((g) => (
              <li key={g.groupId}>
                {g.name} · {Math.round(g.ratio * 100)}% · {stageFor(g.ratio)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
