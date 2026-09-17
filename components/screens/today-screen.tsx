"use client";

import { useState, useSyncExternalStore } from "react";

import { Avatar, type UserProfile } from "@/components/avatar";
import { FullHome } from "@/components/full-home";
import { HomeIllustration, stageIndex } from "@/components/rotatable-home";
import { StageMini } from "@/components/stage-mini";
import { ProgressBar } from "@/components/progress-bar";
import { HomeGrowthSheet } from "@/components/home-growth-sheet";
import { MemberProfileSheet } from "@/components/member-profile-sheet";
import { MyNotesButton, NotebookModal } from "@/components/notes";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import type { RosterMemberView } from "@/components/app-shell";
import type { ConnectSwitcherContext } from "@/components/connect-switcher";
import { Header } from "@/components/screens/header";
import type { useToday } from "@/components/use-today";
import { coinsFor, nextStageMilestone, nextStageProgress, stageFor } from "@/lib/game";
import {
  assignmentReference,
  clampReadingChapter,
  isAssignmentCompleted,
  longDate,
  PLAN,
  PLAN_END,
  PLAN_START,
  planEntryForChapter,
  reviewForDate,
  syncViewedChapter,
  TOTAL_ASSIGNMENTS,
  unfinishedAssignmentsUpTo,
  type PlanEntry,
} from "@/lib/plan";
import type { GroupStats } from "@/lib/data/stats";

const campaignStartLabel = longDate(PLAN_START).replace(/^[^,]+,\s*/, "");

// PROTOTYPE QUESTION: which single reading entrypoint makes the full chapter
// feel discoverable without presenting Quick Verse as a competing destination?
type ReadingVariant = "A" | "B" | "C";
// "shipped" is the reviewed production card. A/B/C are design prototypes and
// are unreachable outside development, so a shared ?variant= link cannot put a
// real user on one.
type ReadingSurface = "shipped" | ReadingVariant;

const PROTOTYPES_ENABLED = process.env.NODE_ENV !== "production";

function isReadingVariant(value: string | null): value is ReadingVariant {
  return value === "A" || value === "B" || value === "C";
}

function isReadingSurface(value: string | null): value is ReadingSurface {
  return value === "shipped" || isReadingVariant(value);
}

function subscribeToReadingSurface(onChange: () => void) {
  if (!PROTOTYPES_ENABLED) return () => {};
  window.addEventListener("reading-prototype-change", onChange);
  return () => window.removeEventListener("reading-prototype-change", onChange);
}

function readReadingSurface(): ReadingSurface {
  if (!PROTOTYPES_ENABLED) return "shipped";
  const value = new URLSearchParams(window.location.search).get("variant");
  return isReadingSurface(value) ? value : "shipped";
}

function readingSurfaceServerSnapshot(): ReadingSurface {
  return "shipped";
}

type ReadingVariantProps = {
  entry?: PlanEntry | null;
  chapter: number;
  day: number;
  keyPassage: string | null;
  alreadyRead: boolean;
  streakDays: number;
  onStart: (target: PlanEntry | number) => void;
};

function ReadingAction({
  entry,
  chapter,
  alreadyRead,
  onStart,
  className = "",
}: Pick<ReadingVariantProps, "chapter" | "alreadyRead" | "onStart"> & {
  entry?: PlanEntry | null;
  className?: string;
}) {
  const ref = entry ? assignmentReference(entry) : `Matthew ${chapter}`;
  const target = entry ?? chapter;
  return (
    <button type="button" className={`reading-prototype-action ${className}`} onClick={() => onStart(target)}>
      <span>
        <strong>{alreadyRead ? "Read. Nice one." : `Read ${ref}`}</strong>
        <small>Opens the full chapter</small>
      </span>
      <b aria-hidden="true">→</b>
    </button>
  );
}

function formatChapterMark(entry?: PlanEntry | null, fallbackChapter?: number): string {
  const chs = entry?.chapters && entry.chapters.length > 0 ? entry.chapters : entry?.chapter ? [entry.chapter] : fallbackChapter ? [fallbackChapter] : [1];
  if (chs.length > 1) {
    return `${chs[0]}–${chs[chs.length - 1]}`;
  }
  return String(chs[0]).padStart(2, "0");
}

type ShippedReadingCardProps = ReadingVariantProps & { isToday: boolean };

function ShippedReadingCard({
  entry,
  chapter,
  day,
  isToday,
  alreadyRead,
  streakDays,
  onStart,
}: ShippedReadingCardProps) {
  const ref = entry ? assignmentReference(entry) : `Matthew ${chapter}`;
  const target = entry ?? chapter;
  const chapterMark = formatChapterMark(entry, chapter);

  return (
    <section
      className={`reading-card ${alreadyRead ? "is-complete" : ""}`}
      data-section="reading-card"
      aria-live="polite"
    >
      <div className="reading-topline">
        <span>
          {isToday ? "TODAY'S READING" : `DAY ${day}`}
          {alreadyRead ? " · COMPLETE" : ""}
        </span>
        <span className="streak">● {streakDays} day streak</span>
      </div>
      <div className="reading-main">
        <div>
          <span className="book-label">GOSPEL OF</span>
          <h2>{ref}</h2>
          <p>Earns 10 points for your group&apos;s home.</p>
        </div>
        <div className="chapter-mark">{chapterMark}</div>
      </div>
      {/* D1: one entrypoint. Reading is what records the day, so
          there is nothing else here to tap. */}
      <button className="primary-button today-reading-button" onClick={() => onStart(target)}>
        <strong>{alreadyRead ? "Read. Nice one." : `Read ${ref}`}</strong>
        <span className="button-arrow" aria-hidden="true">→</span>
      </button>
    </section>
  );
}

function VariantA({ entry, chapter, day, keyPassage, alreadyRead, streakDays, onStart }: ReadingVariantProps) {
  const ref = entry ? assignmentReference(entry) : `Matthew ${chapter}`;
  const chapterMark = formatChapterMark(entry, chapter);

  return (
    <section className={`reading-prototype reading-prototype-a ${alreadyRead ? "is-complete" : ""}`} data-section="reading-prototype-a">
      <div className="prototype-reading-topline">
        <span>TODAY&apos;S READING</span>
        <span>● {streakDays} day streak</span>
      </div>
      <div className="prototype-reading-lockup">
        <div>
          <span className="book-label">GOSPEL OF</span>
          <h2>{ref}</h2>
          <p>Day {day} of {TOTAL_ASSIGNMENTS} · Earns 10 points for your group&apos;s home.</p>
        </div>
        <div className="prototype-chapter-mark">{chapterMark}</div>
      </div>
      {keyPassage && <p className="prototype-key-passage"><span>KEY PASSAGE</span>{keyPassage}</p>}
      <ReadingAction entry={entry} chapter={chapter} alreadyRead={alreadyRead} onStart={onStart} />
    </section>
  );
}

function VariantB({ entry, chapter, day, keyPassage, alreadyRead, streakDays, onStart }: ReadingVariantProps) {
  const ref = entry ? assignmentReference(entry) : `Matthew ${chapter}`;
  const chapterMark = formatChapterMark(entry, chapter);

  return (
    <section className="reading-prototype reading-prototype-b" data-section="reading-prototype-b">
      <div className="chapter-rail-meta">
        <span><b>DAY {String(day).padStart(2, "0")}</b> / {TOTAL_ASSIGNMENTS}</span>
        <span>● {streakDays} day streak</span>
      </div>
      <div className="chapter-rail-body">
        <div className="chapter-rail-number">{chapterMark}</div>
        <div>
          <span className="book-label">MATTHEW</span>
          <h2>Make space for {ref}.</h2>
          <p>One assignment today. Ten points toward your group&apos;s home.</p>
        </div>
      </div>
      <div className="chapter-rail-footer">
        <div>
          <span className="book-label">TODAY&apos;S FOCUS</span>
          <strong>{keyPassage ?? ref}</strong>
        </div>
        <ReadingAction entry={entry} chapter={chapter} alreadyRead={alreadyRead} onStart={onStart} className="compact" />
      </div>
    </section>
  );
}

function VariantC({ entry, chapter, day, keyPassage, alreadyRead, streakDays, onStart }: ReadingVariantProps) {
  const chapterMark = formatChapterMark(entry, chapter);
  const chs = entry?.chapters && entry.chapters.length > 0 ? entry.chapters : entry?.chapter ? [entry.chapter] : [chapter];

  return (
    <section className="reading-prototype reading-prototype-c" data-section="reading-prototype-c">
      <div className="reading-sheet-heading">
        <span className="book-label">YOUR READING / DAY {day}</span>
        <span>● {streakDays} day streak</span>
      </div>
      <div className="reading-sheet-title">
        <div className="reading-sheet-number">{chapterMark}</div>
        <div>
          <p>Gospel of</p>
          <h2>Matthew</h2>
          <strong>{chs.length > 1 ? `Chapters ${chs[0]}–${chs[chs.length - 1]}` : `Chapter ${chapter}`}</strong>
        </div>
      </div>
      <div className="reading-sheet-note">
        <span>Carry this with you</span>
        <strong>{keyPassage ?? "A chapter to read at your pace."}</strong>
      </div>
      <ReadingAction entry={entry} chapter={chapter} alreadyRead={alreadyRead} onStart={onStart} />
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
  allowPreLaunchNavigation = true,
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
  onStart: (target: PlanEntry | number) => void;
  onEditProfile: () => void;
  onViewConnect: () => void;
  onViewProgress: () => void;
  connectSwitcher?: ConnectSwitcherContext;
  allowPreLaunchNavigation?: boolean;
}) {
  const entry = today.entry;
  const readingVariant = useSyncExternalStore(
    subscribeToReadingSurface,
    readReadingSurface,
    readingSurfaceServerSnapshot,
  );
  const [growthSheetOpen, setGrowthSheetOpen] = useState(false);
  const [tentPeopleOpen, setTentPeopleOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RosterMemberView | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [syncedChapter, setSyncedChapter] = useState(entry?.chapter ?? 1);
  const [viewed, setViewed] = useState(() => entry?.chapter ?? 1);

  const syncedView = syncViewedChapter(entry?.chapter ?? null, syncedChapter, viewed);
  if (entry && syncedView.syncedChapter !== syncedChapter) {
    setSyncedChapter(syncedView.syncedChapter);
    setViewed(syncedView.viewedChapter);
  }

  const viewedChapter = entry ? Math.min(entry.chapter, clampReadingChapter(syncedView.viewedChapter, entry.chapter)) : 1;
  const viewedEntry = planEntryForChapter(viewedChapter) ?? entry;
  const viewingUnavailable = Boolean(entry && viewedEntry && viewedEntry.day > entry.day);
  const todayAlreadyRead = entry ? isAssignmentCompleted(entry, chapters) : false;
  const alreadyRead = viewedEntry ? isAssignmentCompleted(viewedEntry, chapters) : false;
  const catchUpEntry = catchUpChapter ? planEntryForChapter(catchUpChapter) : null;
  const catchUpDone = catchUpEntry ? isAssignmentCompleted(catchUpEntry, chapters) : true;
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
              <h1>Matthew starts on {campaignStartLabel}.</h1>
              <p>
                20 reading assignments. 28 chapters. Your Connect Group grows a shared home as you read
                together.
              </p>
            </section>

            <section className="readiness-card" data-section="readiness">
              <p className="eyebrow">GET READY</p>
              <h2>Set up before {campaignStartLabel}</h2>
              <button type="button" className="readiness-row" onClick={onEditProfile}>
                <span className="readiness-label">Avatar</span>
                <span className="readiness-value">
                  <strong>{avatarCustomized ? "Set" : "Default"}</strong>
                  <span className="readiness-arrow" aria-hidden="true">→</span>
                </span>
              </button>
              {allowPreLaunchNavigation ? (
                <button type="button" className="readiness-row" onClick={onViewConnect}>
                  <span className="readiness-label">Connect Group</span>
                  <span className="readiness-value">
                    <strong>{groupName ?? "Join with a leader code"}</strong>
                    <span className="readiness-arrow" aria-hidden="true">→</span>
                  </span>
                </button>
              ) : (
                <div className="readiness-row readiness-row-static" aria-disabled="true">
                  <span className="readiness-label">Connect Group</span>
                  <span className="readiness-value">
                    <strong>{groupName ?? "Join with a leader code"}</strong>
                  </span>
                </div>
              )}
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
                  <h2>{assignmentReference(dayOneEntry)}</h2>
                  <p>{longDate(dayOneEntry.date)}</p>
                </div>
                <div className="chapter-mark">{formatChapterMark(dayOneEntry)}</div>
              </div>
              <button
                type="button"
                className="quick-verse-button"
                onClick={() => onStart(dayOneEntry)}
              >
                <span className="eyebrow">PREVIEW DAY 1</span>
                <strong>{dayOneEntry.keyPassage}</strong>
              </button>
            </section>
          </div>

          <div className="frame__rail">
              <section className="home-preview-card" data-section="home-preview">
                <HomeIllustration stage={stageIndex("Tent")} />
                <p>Your home starts as a Tent on {campaignStartLabel}.</p>
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
                  <strong>Read.</strong> One Matthew chapter a day, starting {campaignStartLabel}.
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

            {allowPreLaunchNavigation && (
              <section className="roadmap-link-row" data-section="roadmap-link">
                <button type="button" className="secondary-link" onClick={onViewProgress}>
                  See the full roadmap <span aria-hidden="true">→</span>
                </button>
              </section>
            )}
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

  if (today.displayPhase === "review" || today.displayPhase === "grace" || today.displayPhase === "closed") {
    const review = reviewForDate(today.todayLocal);
    const unfinished = unfinishedAssignmentsUpTo(today.todayLocal, chapters);
    const allCaughtUp = unfinished.length === 0;
    const isPostPlan = today.todayLocal > PLAN_END;
    const heroTitle = isPostPlan ? "Review & Catch Up" : review.title;
    const heroSubtitle = allCaughtUp
      ? "You're caught up on all assignments so far. Well done."
      : `${unfinished.length} assignment${unfinished.length === 1 ? "" : "s"} left to catch up.`;

    return (
      <main className="screen today-screen frame">
        <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
        <section className="hero-copy" data-section="review-hero">
          <p className="eyebrow">{review.chaptersSummary.toUpperCase()}</p>
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
        </section>

        <section className="grace-dashboard" data-section="review-dashboard">
          <div className="grace-stat">
            <strong>{chaptersRead}</strong>
            <span>/ {TOTAL_ASSIGNMENTS} assignments complete</span>
          </div>

          <div style={{ marginTop: "var(--space-4)" }}>
            <p className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>WEEKLY REVELATION</p>
            <p style={{ fontStyle: "italic", color: "var(--ink)", marginBottom: "var(--space-3)" }}>
              &ldquo;{review.revelationPrompt}&rdquo;
            </p>
            {review.keyPassages && review.keyPassages.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 var(--space-4) 0", display: "grid", gap: "var(--space-2)" }}>
                {review.keyPassages.map((kp) => (
                  <li key={kp.ref} style={{ fontSize: "13px", color: "var(--ink-muted)" }}>
                    <strong style={{ color: "var(--navy)", marginRight: "var(--space-2)" }}>{kp.ref}</strong>
                    <span>{kp.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>
              <MyNotesButton onClick={() => setNotesOpen(true)} />
            </div>
          </div>

          <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--line)" }}>
            <p className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>
              {allCaughtUp ? "READING PROGRESS" : "CATCH UP ON UNFINISHED READINGS"}
            </p>
            {allCaughtUp ? (
              <p className="grace-complete-note">All scheduled assignments complete. Well done.</p>
            ) : (
              <div className="grace-chip-list" data-section="unfinished-assignments">
                {unfinished.map((item) => (
                  <button
                    key={item.day}
                    type="button"
                    className="chapter-chip"
                    onClick={() => onStart(item)}
                  >
                    {assignmentReference(item)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {groupName && (
            <div className="grace-group-status">
              <span>{groupName}</span>
              <strong>
                {stage} · {Math.round(ratio * 100)}% complete
              </strong>
            </div>
          )}
        </section>
        {notesOpen && (
          <NotebookModal
            open
            initialPage={today.todayLocal <= PLAN_END && today.todayLocal >= PLAN_START ? today.todayLocal : "general"}
            onClose={() => setNotesOpen(false)}
          />
        )}
      </main>
    );
  }

  const canGoPrevious = Boolean(viewedEntry && viewedEntry.day > 1);
  const canGoNext = Boolean(entry && viewedEntry && viewedEntry.day < entry.day);

  function handlePrevAssignment() {
    if (!viewedEntry || !canGoPrevious) return;
    const prev = PLAN.find((e) => e.day === viewedEntry.day - 1);
    if (prev) setViewed(prev.chapter);
  }

  function handleNextAssignment() {
    if (!viewedEntry || !entry || !canGoNext) return;
    const next = PLAN.find((e) => e.day === viewedEntry.day + 1);
    if (next) setViewed(next.chapter);
  }

  return (
    <main className="screen today-screen frame">
      <Header heading={`Good morning, ${profile.displayName}`} profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
      <div className="frame--rail">
        <div className="frame__main">
          <section className="hero-copy">
            <p className="eyebrow">DAY {today.dayLabel} OF {TOTAL_ASSIGNMENTS}</p>
            <h1>{todayAlreadyRead ? "You made space for the Word today." : "Make space for the Word today."}</h1>
          </section>

          {entry && (
            <>
              <nav className="reading-navigation" aria-label="Reading chapter navigation">
                <button
                  type="button"
                  aria-label="Previous chapter"
                  disabled={!canGoPrevious}
                  onClick={handlePrevAssignment}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  aria-label="Next chapter"
                  disabled={!canGoNext}
                  onClick={handleNextAssignment}
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
                    {readingVariant === "shipped" && (
                      <ShippedReadingCard
                        entry={viewedEntry}
                        chapter={viewedChapter}
                        day={viewedEntry.day}
                        isToday={Boolean(entry && viewedEntry.day === entry.day)}
                        keyPassage={viewedEntry.keyPassage}
                        alreadyRead={alreadyRead}
                        streakDays={streakDays}
                        onStart={onStart}
                      />
                    )}
                    {readingVariant === "A" && (
                      <VariantA
                        entry={viewedEntry}
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
                        entry={viewedEntry}
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
                        entry={viewedEntry}
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
              <div className="catchup-mark">{catchUpDone ? "✓" : String(catchUpEntry.day).padStart(2, "0")}</div>
              <div className="catchup-copy">
                <p className="eyebrow">{catchUpDone ? "CAUGHT UP" : "YESTERDAY'S ASSIGNMENT IS STILL OPEN"}</p>
                <h2>{assignmentReference(catchUpEntry)}</h2>
                <span>Grace for the missed days. Joy in the next one.</span>
              </div>
              {!catchUpDone && (
                <button type="button" onClick={() => onStart(catchUpEntry)}>
                  Mark {assignmentReference(catchUpEntry)} read <b>→</b>
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
                    <strong>{groupCoins} points</strong>
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
                <span>Your 10 points go straight to your Connect.</span>
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
      {notesOpen && (
        <NotebookModal
          open
          initialPage={viewedEntry?.date ?? (today.todayLocal <= PLAN_END && today.todayLocal >= PLAN_START ? today.todayLocal : "general")}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </main>
  );
}
