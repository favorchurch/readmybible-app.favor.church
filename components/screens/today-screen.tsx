"use client";

import { useRef, useState } from "react";

import { Avatar, avatarSeedFor, type UserProfile } from "@/components/avatar";
import { HomeIllustration, stageIndex } from "@/components/rotatable-home";
import { ProgressBar } from "@/components/progress-bar";
import { ScripturePopup } from "@/components/scripture-popup";
import type { RosterMemberView } from "@/components/app-shell";
import { Header } from "@/components/screens/header";
import type { useToday } from "@/components/use-today";
import { coinsFor, nextStageProgress, stageFor, TOTAL_CHAPTERS } from "@/lib/game";
import { planEntryForChapter } from "@/lib/plan";
import type { GroupStats } from "@/lib/data/stats";

export function TodayScreen({
  today,
  chapters,
  chaptersRead,
  catchUpChapter,
  streakDays,
  groupName,
  groupStats,
  roster,
  profile,
  onStart,
  onEditProfile,
}: {
  today: ReturnType<typeof useToday>;
  chapters: number[];
  chaptersRead: number;
  catchUpChapter: number | null;
  streakDays: number;
  groupName: string | null;
  groupStats: GroupStats | null;
  roster: RosterMemberView[];
  profile: UserProfile;
  onStart: (chapter: number) => void;
  onEditProfile: () => void;
}) {
  const [quickVerseOpen, setQuickVerseOpen] = useState(false);
  const quickVerseTriggerRef = useRef<HTMLButtonElement>(null);

  if (today.phase === "pre-launch") {
    return (
      <main className="screen today-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} />
        <section className="hero-copy">
          <h1>Starts Wednesday, October 1.</h1>
          <p>Get your Connect Group in and your avatar ready.</p>
        </section>
      </main>
    );
  }

  if (today.phase === "closed") {
    return (
      <main className="screen today-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} />
        <section className="hero-copy">
          <h1>That&apos;s Matthew, start to finish.</h1>
          <p>Thank you for reading with us. You read {chaptersRead} of 28 chapters.</p>
        </section>
      </main>
    );
  }

  const entry = today.entry;
  const alreadyRead = entry ? chapters.includes(entry.chapter) : false;
  const catchUpEntry = catchUpChapter ? planEntryForChapter(catchUpChapter) : null;
  const catchUpDone = catchUpChapter ? chapters.includes(catchUpChapter) : true;
  const ratio = groupStats?.ratio ?? 0;
  const stage = stageFor(ratio);
  const nextStage = nextStageProgress(ratio);
  const groupCoins = coinsFor(groupStats?.checkinCount ?? 0);
  const readersToday = groupStats?.readersTodayIds.length ?? 0;
  const memberCount = groupStats?.memberCount ?? roster.length;

  return (
    <main className="screen today-screen frame">
      <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} />
      <section className="hero-copy">
        <p className="eyebrow">DAY {today.dayLabel} OF {TOTAL_CHAPTERS}</p>
        <h1>{alreadyRead ? "You made space for the Word today." : "Make space for the Word today."}</h1>
      </section>

      {entry && (
        <section className={`reading-card ${alreadyRead ? "is-complete" : ""}`}>
          <div className="reading-topline">
            <span>{alreadyRead ? "TODAY'S READING · COMPLETE" : "TODAY'S READING"}</span>
            <span className="streak">● {streakDays} day streak</span>
          </div>
          <div className="reading-main">
            <div>
              <span className="book-label">GOSPEL OF</span>
              <h2>Matthew {entry.chapter}</h2>
              <p>Earns 10 coins for your group&apos;s home.</p>
            </div>
            <div className="chapter-mark">{String(entry.chapter).padStart(2, "0")}</div>
          </div>
          <button
            type="button"
            className="quick-verse-button"
            ref={quickVerseTriggerRef}
            onClick={() => setQuickVerseOpen(true)}
          >
            <span className="eyebrow">QUICK VERSE</span>
            <strong>{entry.keyPassage}</strong>
          </button>
          <button className="primary-button today-reading-button" onClick={() => onStart(entry.chapter)}>
            <strong>{alreadyRead ? "Read. Nice one." : "I read today"}</strong>
            <span className="button-arrow" aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {quickVerseOpen && entry && (
        <ScripturePopup
          passageRef={entry.keyPassage}
          translation={profile.translation}
          onClose={() => {
            setQuickVerseOpen(false);
            quickVerseTriggerRef.current?.focus();
          }}
        />
      )}

      {catchUpChapter && catchUpEntry && (
        <section className={`catchup-card ${catchUpDone ? "is-complete" : ""}`}>
          <div className="catchup-mark">{catchUpDone ? "✓" : String(catchUpChapter).padStart(2, "0")}</div>
          <div className="catchup-copy">
            <p className="eyebrow">{catchUpDone ? "CAUGHT UP" : "YESTERDAY'S CHAPTER IS STILL OPEN"}</p>
            <h2>Matthew {catchUpChapter}</h2>
            <span>Grace for the missed days. Joy in the next one.</span>
          </div>
          {!catchUpDone && (
            <button type="button" onClick={() => onStart(catchUpChapter)}>
              Mark Matthew {catchUpChapter} read <b>→</b>
            </button>
          )}
        </section>
      )}

      {groupName && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OUR CONNECT</p>
              <h2>We&apos;re building this together</h2>
            </div>
          </div>
          <div className="home-card">
            <HomeIllustration stage={stageIndex(stage)} />
            <div className="home-info">
              <div className="stage-row">
                <span>{stage}</span>
                {nextStage && <span>{nextStage.stage}</span>}
              </div>
              <ProgressBar value={nextStage?.pct ?? 100} max={100} />
              <div className="stage-row detail">
                <strong>{groupCoins} coins</strong>
                {nextStage && <span>{nextStage.pct}% to {nextStage.stage}</span>}
              </div>
            </div>
          </div>
        </section>
      )}

      {groupName && (
        <section className="people-today">
          <div className="avatar-stack">
            {roster.slice(0, 5).map((m) => {
              const seed = avatarSeedFor(m.personId);
              return <Avatar key={m.personId} color={seed.color} skin={seed.skin} hair={seed.hair} small />;
            })}
          </div>
          <div>
            <strong>{readersToday} of {memberCount} have read today</strong>
            <span>Your 10 coins go straight to your Connect.</span>
          </div>
        </section>
      )}
      <p className="daily-note">Read anywhere. Grow together.</p>
    </main>
  );
}
