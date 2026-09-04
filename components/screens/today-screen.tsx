"use client";

import { useRef, useState } from "react";

import { Avatar, avatarSeedFor, defaultAvatarConfig, type Translation, type UserProfile } from "@/components/avatar";
import { HomeIllustration, stageIndex } from "@/components/rotatable-home";
import { StageMini } from "@/components/stage-mini";
import { ProgressBar } from "@/components/progress-bar";
import { ScripturePopup } from "@/components/scripture-popup";
import type { RosterMemberView } from "@/components/app-shell";
import { Header } from "@/components/screens/header";
import type { useToday } from "@/components/use-today";
import { coinsFor, medals, nextStageProgress, stageFor, TOTAL_CHAPTERS } from "@/lib/game";
import { GRACE_DATES, longDate, planEntryForChapter } from "@/lib/plan";
import type { GroupStats } from "@/lib/data/stats";
import { TRANSLATION_META } from "@/lib/scripture/types";

const AVATAR_KEYS = [
  "gender",
  "face",
  "hair",
  "glasses",
  "facialHair",
  "hairColor",
  "skinColor",
  "shirtColor",
  "backgroundColor",
] as const;

/** Whether the reader has customized any avatar field away from the default look. */
function isAvatarSet(profile: UserProfile): boolean {
  return AVATAR_KEYS.some((key) => profile[key] !== defaultAvatarConfig[key]);
}

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
  onReplayCelebration,
  onEditProfile,
  onViewConnect,
  onViewProgress,
  onTranslationChange,
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
  onReplayCelebration: (chapter: number) => void;
  onEditProfile: () => void;
  onViewConnect: () => void;
  onViewProgress: () => void;
  onTranslationChange: (translation: Translation) => void;
}) {
  const [quickVerseOpen, setQuickVerseOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const quickVerseTriggerRef = useRef<HTMLButtonElement>(null);
  const chapterTriggerRef = useRef<HTMLButtonElement>(null);

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

  const dayOneEntry = planEntryForChapter(1);
  const quickVerseEntry = today.displayPhase === "pre-launch" ? dayOneEntry : entry;
  const canReadChapter = TRANSLATION_META[profile.translation].fullText;

  const quickVersePopup = quickVerseOpen && quickVerseEntry && (
    <ScripturePopup
      passageRef={quickVerseEntry.keyPassage}
      translation={profile.translation}
      onTranslationChange={onTranslationChange}
      onClose={() => {
        setQuickVerseOpen(false);
        quickVerseTriggerRef.current?.focus();
      }}
    />
  );

  if (today.displayPhase === "pre-launch" && dayOneEntry) {
    return (
      <main className="screen today-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} />
        <div className="frame--rail">
          <div className="frame__main">
            <section className="hero-copy" data-section="prelaunch-hero">
              <h1>Matthew starts October 1.</h1>
              <p>
                One chapter a day. 28 chapters. Your Connect Group grows a shared home as you read
                together.
              </p>
            </section>

            <section className="day1-preview-card" data-section="day1-preview">
              <div className="reading-topline">
                <span>DAY 1</span>
              </div>
              <div className="reading-main">
                <div>
                  <span className="book-label">GOSPEL OF</span>
                  <h2>Matthew 1</h2>
                  <p>{longDate(dayOneEntry.date)}</p>
                </div>
                <div className="chapter-mark">01</div>
              </div>
              <button
                type="button"
                className="quick-verse-button"
                ref={quickVerseTriggerRef}
                onClick={() => setQuickVerseOpen(true)}
              >
                <span className="eyebrow">QUICK VERSE</span>
                <strong>{dayOneEntry.keyPassage}</strong>
              </button>
            </section>
          </div>

          <div className="frame__rail">
            <section className="readiness-card" data-section="readiness">
              <p className="eyebrow">GET READY</p>
              <h2>Set up before October 1</h2>
              <button type="button" className="readiness-row" onClick={onEditProfile}>
                <span>Avatar</span>
                <strong>{isAvatarSet(profile) ? "Set" : "Default"}</strong>
                <span className="readiness-arrow" aria-hidden="true">→</span>
              </button>
              <button type="button" className="readiness-row" onClick={onViewConnect}>
                <span>Connect Group</span>
                <strong>{groupName ?? "Join with a leader code"}</strong>
                <span className="readiness-arrow" aria-hidden="true">→</span>
              </button>
              <button type="button" className="readiness-row" onClick={onEditProfile}>
                <span>Bible translation</span>
                <strong>{profile.translation}</strong>
                <span className="readiness-arrow" aria-hidden="true">→</span>
              </button>
            </section>

            {groupName && (
              <section className="home-preview-card" data-section="home-preview">
                <HomeIllustration stage={stageIndex("Tent")} />
                <p>Your home starts as a Tent on October 1.</p>
              </section>
            )}

            <section className="how-it-works-card" data-section="how-it-works">
              <p className="eyebrow">HOW THIS WORKS</p>
              <ol>
                <li>
                  <strong>Read.</strong> One Matthew chapter a day, starting October 1.
                </li>
                <li>
                  <strong>Check in.</strong> A quick, honor-based tap once you&apos;ve read.
                </li>
                <li>
                  <strong>Watch your home grow.</strong> Your Connect Group&apos;s home grows as
                  the group reads together.
                </li>
              </ol>
            </section>

            <section className="roadmap-link-row" data-section="roadmap-link">
              <button type="button" className="secondary-link" onClick={onViewProgress}>
                See the full roadmap <span aria-hidden="true">→</span>
              </button>
            </section>
          </div>
        </div>
        {quickVersePopup}
      </main>
    );
  }

  if (today.displayPhase === "grace") {
    const remainingChapters = Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1).filter(
      (chapter) => !chapters.includes(chapter),
    );
    const allRead = chaptersRead === TOTAL_CHAPTERS;
    const graceDayIndex = GRACE_DATES.indexOf(today.todayLocal);
    const graceDaysLeft = graceDayIndex === -1 ? GRACE_DATES.length : GRACE_DATES.length - graceDayIndex;
    const graceDayWord = { 1: "One", 2: "Two", 3: "Three" }[graceDaysLeft] ?? String(graceDaysLeft);
    const graceHero = `${graceDayWord} catch-up day${graceDaysLeft === 1 ? "" : "s"}.`;

    return (
      <main className="screen today-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} />
        <section className="hero-copy">
          <h1>{graceHero}</h1>
          <p>
            {allRead
              ? "You've read every chapter. Well done."
              : `${remainingChapters.length} chapter${remainingChapters.length === 1 ? "" : "s"} left to finish Matthew.`}
          </p>
        </section>

        <section className="grace-dashboard" data-section="grace-dashboard">
          <div className="grace-stat">
            <strong>{chaptersRead}</strong>
            <span>/ {TOTAL_CHAPTERS} chapters complete</span>
          </div>

          {allRead ? (
            <p className="grace-complete-note">All 28 chapters. Well done.</p>
          ) : (
            <div className="grace-chip-list">
              {remainingChapters.map((chapter) => (
                <button key={chapter} type="button" className="chapter-chip" onClick={() => onStart(chapter)}>
                  Matthew {chapter}
                </button>
              ))}
            </div>
          )}

          {groupName && (
            <div className="grace-group-status">
              <span>{groupName}</span>
              <strong>
                {stage} · {Math.round(ratio * 100)}% complete
              </strong>
            </div>
          )}
        </section>
        {quickVersePopup}
      </main>
    );
  }

  if (today.displayPhase === "closed") {
    const earnedMedals = medals(chaptersRead);

    return (
      <main className="screen today-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} />
        <section className="hero-copy">
          <h1>That&apos;s Matthew, start to finish.</h1>
          <p>Thank you for reading with us this October.</p>
        </section>

        <section className="closed-summary" data-section="closed-summary">
          <div className="closed-summary-stat">
            <strong>{chaptersRead}</strong>
            <span>of {TOTAL_CHAPTERS} chapters read</span>
          </div>
          <div className="closed-summary-stat">
            <strong>{earnedMedals.length}</strong>
            <span>medal{earnedMedals.length === 1 ? "" : "s"} earned</span>
          </div>
          {groupName && (
            <div className="closed-summary-stat">
              <strong>{stage}</strong>
              <span>{groupName}&apos;s final home</span>
            </div>
          )}
          <button type="button" className="secondary-link" onClick={onViewProgress}>
            Review your Progress <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="screen today-screen frame">
      <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} />
      <div className="frame--rail">
        <div className="frame__main">
          <section className="hero-copy">
            <p className="eyebrow">DAY {today.dayLabel} OF {TOTAL_CHAPTERS}</p>
            <h1>{alreadyRead ? "You made space for the Word today." : "Make space for the Word today."}</h1>
          </section>

          {entry && (
            <section className={`reading-card ${alreadyRead ? "is-complete" : ""}`} data-section="reading-card">
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
              {canReadChapter && (
                <button
                  type="button"
                  className="quick-verse-button"
                  ref={chapterTriggerRef}
                  onClick={() => setChapterOpen(true)}
                >
                  <span className="eyebrow">READ FULL CHAPTER</span>
                  <strong>Matthew {entry.chapter}</strong>
                </button>
              )}
              <button
                className="primary-button today-reading-button"
                onClick={() => (alreadyRead ? onReplayCelebration(entry.chapter) : onStart(entry.chapter))}
              >
                <strong>{alreadyRead ? "Read. Nice one." : "I read today"}</strong>
                <span className="button-arrow" aria-hidden="true">→</span>
              </button>
            </section>
          )}

          {catchUpChapter && catchUpEntry && (
            <section className={`catchup-card ${catchUpDone ? "is-complete" : ""}`} data-section="catch-up">
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
        </div>

        {groupName && (
          <div className="frame__rail">
            <section className="section-block" data-section="home-snapshot">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">OUR CONNECT</p>
                  <h2>We&apos;re building this together</h2>
                </div>
              </div>
              <div className="home-card">
                <HomeIllustration stage={stageIndex(stage)} />
                <div className="home-info">
                  <div className="stage-row home-info-next-row">
                    {nextStage && (
                      <span className="stage-name-row home-info-next">
                        <StageMini name={nextStage.stage} size={38} className="home-info-mini" aria-hidden />
                        <span>{nextStage.stage}</span>
                      </span>
                    )}
                  </div>
                  <ProgressBar value={nextStage?.pct ?? 100} max={100} />
                  <div className="stage-row detail">
                    <strong>{groupCoins} coins</strong>
                    {nextStage && <span>{nextStage.pct}% to {nextStage.stage}</span>}
                  </div>
                </div>
              </div>
            </section>

            <section className="people-today" data-section="readers-today">
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
          </div>
        )}
      </div>
      <p className="daily-note">Read anywhere. Grow together.</p>
      {quickVersePopup}
      {chapterOpen && entry && (
        <ScripturePopup
          passageRef={`Matthew ${entry.chapter}`}
          translation={profile.translation}
          onTranslationChange={onTranslationChange}
          onClose={() => {
            setChapterOpen(false);
            chapterTriggerRef.current?.focus();
          }}
        />
      )}
    </main>
  );
}
