"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, type UserProfile } from "@/components/avatar";
import { FullHome } from "@/components/full-home";
import { HomeIllustration, stageIndex } from "@/components/rotatable-home";
import { StageMini } from "@/components/stage-mini";
import { ProgressBar } from "@/components/progress-bar";
import { HomeGrowthSheet } from "@/components/home-growth-sheet";
import { MemberProfileSheet } from "@/components/member-profile-sheet";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import type { RosterMemberView } from "@/components/app-shell";
import type { ConnectSwitcherContext } from "@/components/connect-switcher";
import { Header } from "@/components/screens/header";
import type { useToday } from "@/components/use-today";
import { coinsFor, medals, nextStageMilestone, nextStageProgress, stageFor, TOTAL_CHAPTERS } from "@/lib/game";
import {
  clampReadingChapter,
  GRACE_DATES,
  isChapterRead,
  longDate,
  planEntryForChapter,
  syncViewedChapter,
} from "@/lib/plan";
import type { GroupStats } from "@/lib/data/stats";

// PROTOTYPE QUESTION: which single reading entrypoint makes the full chapter
// feel discoverable without presenting Quick Verse as a competing destination?
type ReadingVariant = "A" | "B" | "C";

function isReadingVariant(value: string | null): value is ReadingVariant {
  return value === "A" || value === "B" || value === "C";
}

type ReadingVariantProps = {
  chapter: number;
  day: number;
  keyPassage: string | null;
  alreadyRead: boolean;
  streakDays: number;
  onStart: (chapter: number) => void;
};

function ReadingAction({ chapter, alreadyRead, onStart, className = "" }: Pick<ReadingVariantProps, "chapter" | "alreadyRead" | "onStart"> & { className?: string }) {
  return (
    <button type="button" className={`reading-prototype-action ${className}`} onClick={() => onStart(chapter)}>
      <span>
        <strong>{alreadyRead ? "Read. Nice one." : `Read Matthew ${chapter}`}</strong>
        <small>Opens the full chapter when it&apos;s available</small>
      </span>
      <b aria-hidden="true">→</b>
    </button>
  );
}

function VariantA({ chapter, day, keyPassage, alreadyRead, streakDays, onStart }: ReadingVariantProps) {
  return (
    <section className={`reading-prototype reading-prototype-a ${alreadyRead ? "is-complete" : ""}`} data-section="reading-prototype-a">
      <div className="prototype-reading-topline">
        <span>TODAY&apos;S READING</span>
        <span>● {streakDays} day streak</span>
      </div>
      <div className="prototype-reading-lockup">
        <div>
          <span className="book-label">GOSPEL OF</span>
          <h2>Matthew {chapter}</h2>
          <p>Day {day} of 28 · Earns 10 coins for your group&apos;s home.</p>
        </div>
        <div className="prototype-chapter-mark">{String(chapter).padStart(2, "0")}</div>
      </div>
      {keyPassage && <p className="prototype-key-passage"><span>KEY PASSAGE</span>{keyPassage}</p>}
      <ReadingAction chapter={chapter} alreadyRead={alreadyRead} onStart={onStart} />
    </section>
  );
}

function VariantB({ chapter, day, keyPassage, alreadyRead, streakDays, onStart }: ReadingVariantProps) {
  return (
    <section className="reading-prototype reading-prototype-b" data-section="reading-prototype-b">
      <div className="chapter-rail-meta">
        <span><b>DAY {String(day).padStart(2, "0")}</b> / 28</span>
        <span>● {streakDays} day streak</span>
      </div>
      <div className="chapter-rail-body">
        <div className="chapter-rail-number">{String(chapter).padStart(2, "0")}</div>
        <div>
          <span className="book-label">MATTHEW</span>
          <h2>Make space for Matthew {chapter}.</h2>
          <p>One chapter today. Ten coins toward your group&apos;s home.</p>
        </div>
      </div>
      <div className="chapter-rail-footer">
        <div>
          <span className="book-label">TODAY&apos;S FOCUS</span>
          <strong>{keyPassage ?? `Matthew ${chapter}`}</strong>
        </div>
        <ReadingAction chapter={chapter} alreadyRead={alreadyRead} onStart={onStart} className="compact" />
      </div>
    </section>
  );
}

function VariantC({ chapter, day, keyPassage, alreadyRead, streakDays, onStart }: ReadingVariantProps) {
  return (
    <section className="reading-prototype reading-prototype-c" data-section="reading-prototype-c">
      <div className="reading-sheet-heading">
        <span className="book-label">YOUR READING / DAY {day}</span>
        <span>● {streakDays} day streak</span>
      </div>
      <div className="reading-sheet-title">
        <div className="reading-sheet-number">{String(chapter).padStart(2, "0")}</div>
        <div>
          <p>Gospel of</p>
          <h2>Matthew</h2>
          <strong>Chapter {chapter}</strong>
        </div>
      </div>
      <div className="reading-sheet-note">
        <span>Carry this with you</span>
        <strong>{keyPassage ?? "A chapter to read at your pace."}</strong>
      </div>
      <ReadingAction chapter={chapter} alreadyRead={alreadyRead} onStart={onStart} />
    </section>
  );
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
  avatarCustomized,
  onStart,
  onEditProfile,
  onViewConnect,
  onViewProgress,
  connectSwitcher,
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
  avatarCustomized: boolean;
  onStart: (chapter: number) => void;
  onEditProfile: () => void;
  onViewConnect: () => void;
  onViewProgress: () => void;
  connectSwitcher?: ConnectSwitcherContext;
}) {
  const entry = today.entry;
  const searchParams = useSearchParams();
  const rawReadingVariant = searchParams?.get("variant") ?? null;
  const initialReadingVariant: ReadingVariant = isReadingVariant(rawReadingVariant) ? rawReadingVariant : "A";
  const [readingVariant, setReadingVariant] = useState<ReadingVariant>(initialReadingVariant);
  useEffect(() => {
    function onPrototypeVariantChange(event: Event) {
      const next = event instanceof CustomEvent ? event.detail : null;
      if (typeof next === "string" && isReadingVariant(next)) setReadingVariant(next);
    }

    window.addEventListener("reading-prototype-change", onPrototypeVariantChange);
    return () => window.removeEventListener("reading-prototype-change", onPrototypeVariantChange);
  }, []);
  const [growthSheetOpen, setGrowthSheetOpen] = useState(false);
  const [tentPeopleOpen, setTentPeopleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RosterMemberView | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [syncedChapter, setSyncedChapter] = useState(entry?.chapter ?? 1);
  const [viewed, setViewed] = useState(() => entry?.chapter ?? 1);

  const syncedView = syncViewedChapter(entry?.chapter ?? null, syncedChapter, viewed);
  if (entry && syncedView.syncedChapter !== syncedChapter) {
    setSyncedChapter(syncedView.syncedChapter);
    setViewed(syncedView.viewedChapter);
  }

  const viewedChapter = entry ? Math.min(entry.chapter, clampReadingChapter(syncedView.viewedChapter, entry.chapter)) : 1;
  const viewedEntry = planEntryForChapter(viewedChapter);
  const viewingUnavailable = Boolean(entry && viewedChapter > entry.chapter);
  const todayAlreadyRead = entry ? isChapterRead(entry.chapter, chapters) : false;
  const alreadyRead = entry ? isChapterRead(viewedChapter, chapters) : false;
  const catchUpEntry = catchUpChapter ? planEntryForChapter(catchUpChapter) : null;
  const catchUpDone = catchUpChapter ? chapters.includes(catchUpChapter) : true;
  const ratio = groupStats?.ratio ?? 0;
  const stage = stageFor(ratio);
  const nextStage = nextStageProgress(ratio);
  const groupCoins = coinsFor(groupStats?.checkinCount ?? 0);
  const readersToday = groupStats?.readersTodayIds.length ?? 0;
  const memberCount = groupStats?.memberCount ?? roster.length;

  const dayOneEntry = planEntryForChapter(1);

  if (today.displayPhase === "pre-launch" && dayOneEntry) {
    return (
      <main className="screen today-screen prelaunch-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
        <div className="frame--rail">
          <div className="frame__main">
            <section className="hero-copy" data-section="prelaunch-hero">
              <h1>Matthew starts October 1.</h1>
              <p>
                One chapter a day. 28 chapters. Your Connect Group grows a shared home as you read
                together.
              </p>
            </section>

            <section className="readiness-card" data-section="readiness">
              <p className="eyebrow">GET READY</p>
              <h2>Set up before October 1</h2>
              <button type="button" className="readiness-row" onClick={onEditProfile}>
                <span className="readiness-label">Avatar</span>
                <span className="readiness-value">
                  <strong>{avatarCustomized ? "Set" : "Default"}</strong>
                  <span className="readiness-arrow" aria-hidden="true">→</span>
                </span>
              </button>
              <button type="button" className="readiness-row" onClick={onViewConnect}>
                <span className="readiness-label">Connect Group</span>
                <span className="readiness-value">
                  <strong>{groupName ?? "Join with a leader code"}</strong>
                  <span className="readiness-arrow" aria-hidden="true">→</span>
                </span>
              </button>
              <button type="button" className="readiness-row" onClick={onEditProfile}>
                <span className="readiness-label">Bible translation</span>
                <span className="readiness-value">
                  <strong>{profile.translation}</strong>
                  <span className="readiness-arrow" aria-hidden="true">→</span>
                </span>
              </button>
            </section>

            <section className="day1-preview-card" data-section="day1-preview">
              <div className="reading-topline">
                <span>DAY 1 PREVIEW</span>
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
                onClick={() => onStart(1)}
              >
                <span className="eyebrow">PREVIEW DAY 1</span>
                <strong>{dayOneEntry.keyPassage}</strong>
              </button>
            </section>
          </div>

          <div className="frame__rail">
              <section className="home-preview-card" data-section="home-preview">
                <HomeIllustration stage={stageIndex("Tent")} />
                <p>Your home starts as a Tent on October 1.</p>
                <div className="home-preview-actions">
                  {groupName && (
                    <button
                      type="button"
                      className="primary-button open-home-button"
                      onClick={() => setHomeOpen(true)}
                      aria-haspopup="dialog"
                    >
                      Open Home <span aria-hidden="true">↗</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="home-growth-trigger secondary-link"
                    data-section="home-growth-trigger"
                    data-trigger="home-growth-sheet"
                    aria-haspopup="dialog"
                    onClick={() => setGrowthSheetOpen(true)}
                  >
                    How your home grows
                  </button>
                </div>
              </section>

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
        <HomeGrowthSheet
          open={growthSheetOpen}
          onClose={() => setGrowthSheetOpen(false)}
          currentStage={stage}
        />
        <MemberProfileSheet
          open={profileSheetOpen}
          onClose={() => setProfileSheetOpen(false)}
          member={selectedMember}
          todayLocal={today.todayLocal}
        />
        {homeOpen && groupName && (
          <FullHome
            onClose={() => setHomeOpen(false)}
            groupName={groupName}
            coins={groupCoins}
            groupCheckinCount={groupStats?.checkinCount ?? null}
            stage={stageIndex("Tent")}
            progress={nextStage}
            milestone={nextStageMilestone(ratio)}
            overallPct={Math.round(ratio * 100)}
            today={today}
            roster={roster}
            profile={profile}
            selectedMemberId={selectedMember?.personId ?? null}
            onSelectMember={(member) => {
              setSelectedMember(member);
              setProfileSheetOpen(true);
            }}
            onViewPlan={onViewProgress}
          />
        )}
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
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
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
      </main>
    );
  }

  if (today.displayPhase === "closed") {
    const earnedMedals = medals(chaptersRead);

    return (
      <main className="screen today-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
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
      <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
      <div className="frame--rail">
        <div className="frame__main">
          <section className="hero-copy">
            <p className="eyebrow">DAY {today.dayLabel} OF {TOTAL_CHAPTERS}</p>
            <h1>{todayAlreadyRead ? "You made space for the Word today." : "Make space for the Word today."}</h1>
          </section>

          {entry && (
            <>
              <nav className="reading-navigation" aria-label="Reading chapter navigation">
                <button
                  type="button"
                  aria-label="Previous chapter"
                  disabled={viewedChapter === 1}
                  onClick={() => setViewed(clampReadingChapter(viewedChapter - 1, entry.chapter))}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  aria-label="Next chapter"
                  disabled={viewedChapter >= entry.chapter}
                  onClick={() => setViewed(Math.min(entry.chapter, viewedChapter + 1))}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </nav>

              {viewingUnavailable ? (
                <section className="day-preview-status upcoming-status" data-section="reading-unavailable" aria-live="polite">
                  <p className="eyebrow">NOT AVAILABLE YET</p>
                  <h2>Matthew {viewedChapter} isn&apos;t available yet.</h2>
                  <p>We&apos;ll open this chapter when its reading day arrives.</p>
                </section>
              ) : (
                viewedEntry && (
                  <>
                    {readingVariant === "A" && (
                      <VariantA
                        chapter={viewedChapter}
                        day={viewedEntry.day}
                        keyPassage={viewedEntry.keyPassage}
                        alreadyRead={alreadyRead}
                        streakDays={streakDays}
                        onStart={onStart}
                      />
                    )}
                    {readingVariant === "B" && (
                      <VariantB
                        chapter={viewedChapter}
                        day={viewedEntry.day}
                        keyPassage={viewedEntry.keyPassage}
                        alreadyRead={alreadyRead}
                        streakDays={streakDays}
                        onStart={onStart}
                      />
                    )}
                    {readingVariant === "C" && (
                      <VariantC
                        chapter={viewedChapter}
                        day={viewedEntry.day}
                        keyPassage={viewedEntry.keyPassage}
                        alreadyRead={alreadyRead}
                        streakDays={streakDays}
                        onStart={onStart}
                      />
                    )}
                  </>
                )
              )}
            </>
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
                <button
                  type="button"
                  className="tent-toggle-button"
                  data-section="tent-toggle"
                  onClick={() => setTentPeopleOpen((open) => !open)}
                  aria-pressed={tentPeopleOpen}
                  aria-label={tentPeopleOpen ? "Hide group around home" : "Gather group around home"}
                >
                  {tentPeopleOpen ? "Hide group" : "Gather group"}
                </button>
              </div>
              <div className="home-card">
                <div className="home-scene-wrap">
                  <HomeIllustration stage={stageIndex(stage)} />
                </div>
                {tentPeopleOpen && (
                  <div className="tent-people-overlay" role="group" aria-label="Group members gathered around the home">
                    {roster.map((member) => {
                      return (
                        <button
                          type="button"
                          key={member.personId}
                          className="tent-person-chip"
                          onClick={() => {
                            setSelectedMember(member);
                            setProfileSheetOpen(true);
                          }}
                          title={member.name}
                          aria-label={`View ${member.name}'s profile`}
                        >
                          <div className="tent-person-avatar">
                            <Avatar color="coral" {...member.avatar} small />
                            {member.readToday && <b className="tent-person-check" aria-hidden="true">✓</b>}
                          </div>
                          <span className="tent-person-name">{member.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
                  <button
                    type="button"
                    className="primary-button open-home-button"
                    onClick={() => setHomeOpen(true)}
                    aria-haspopup="dialog"
                  >
                    Open Home <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </div>
            </section>

            <section className="people-today" data-section="readers-today">
              <div className="avatar-stack">
                {roster.slice(0, 5).map((m) => (
                  <Avatar key={m.personId} color="coral" {...(m.isSelf ? profile : m.avatar)} small />
                ))}
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
      <MemberProfileSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        member={selectedMember}
        todayLocal={today.todayLocal}
      />
      {homeOpen && groupName && (
        <FullHome
          onClose={() => setHomeOpen(false)}
          groupName={groupName}
          coins={groupCoins}
          groupCheckinCount={groupStats?.checkinCount ?? null}
          stage={stageIndex(stage)}
          progress={nextStage}
          milestone={nextStageMilestone(ratio)}
          overallPct={Math.round(ratio * 100)}
          today={today}
          roster={roster}
          profile={profile}
          selectedMemberId={selectedMember?.personId ?? null}
          onSelectMember={(member) => {
            setSelectedMember(member);
            setProfileSheetOpen(true);
          }}
          onViewReading={() => setHomeOpen(false)}
          onViewPlan={onViewProgress}
        />
      )}
      {!homeOpen && <PrototypeSwitcher />}
    </main>
  );
}
