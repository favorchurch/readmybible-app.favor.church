"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { checkIn } from "@/app/actions/checkIn";
import { chooseGroup } from "@/app/actions/chooseGroup";
import { getOrCreateJoinCode } from "@/app/actions/getOrCreateJoinCode";
import { joinByCode } from "@/app/actions/joinByCode";
import { saveProfile } from "@/app/actions/saveProfile";
import {
  Avatar,
  avatarSeedFor,
  defaultAvatarConfig,
  type AvatarConfig,
  type Translation,
  type UserProfile,
} from "@/components/avatar";
import { Brand } from "@/components/brand";
import { CompletionFlow } from "@/components/completion-flow";
import { homeStages, HomeIllustration, RotatableHome, stageIndex } from "@/components/rotatable-home";
import { NavIcon, type NavIconName } from "@/components/nav-icon";
import { ProfileEditor } from "@/components/profile-editor";
import { ProgressBar } from "@/components/progress-bar";
import { useToday } from "@/components/use-today";
import {
  coinsFor,
  medals as medalsReached,
  nextMedal,
  nextStageProgress,
  stageFor,
  streak as computeStreak,
  TOTAL_CHAPTERS,
} from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import { PLAN, planEntryForChapter } from "@/lib/plan";
import { ScripturePopup } from "@/components/scripture-popup";
import type { GroupStats } from "@/lib/data/stats";
import type { GroupMembership } from "@/lib/session";

type Tab = "today" | "connect" | "rewards" | "progress";

export type RosterMemberView = {
  personId: number;
  name: string;
  isLeader: boolean;
  readToday: boolean;
};

export type AppShellProps = {
  displayName: string;
  avatar: AvatarConfig;
  translation: Translation;
  memberships: GroupMembership[];
  activeGroup: GroupMembership | null;
  needsGroupChoice: boolean;
  isLeader: boolean;
  campusName: string | null;
  roster: RosterMemberView[];
  chapters: number[];
  readingDates: string[];
  groupStats: GroupStats | null;
  campusBoard: GroupStanding[];
  appBaseUrl: string;
};

const navItems: { id: Tab; label: string; icon: NavIconName }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "connect", label: "Connect", icon: "people" },
  { id: "rewards", label: "Rewards", icon: "medal" },
  { id: "progress", label: "Progress", icon: "progress" },
];

const REWARD_META: Record<number, { tone: string; kind: "medal" | "trophy"; shape: string }> = {
  3: { tone: "bronze", kind: "medal", shape: "small" },
  7: { tone: "silver", kind: "medal", shape: "medium" },
  14: { tone: "gold", kind: "medal", shape: "star" },
  21: { tone: "violet", kind: "trophy", shape: "medium" },
  28: { tone: "navy", kind: "trophy", shape: "large" },
};

const REWARD_TITLES: Record<number, string> = {
  3: "First steps",
  7: "One week in",
  14: "Halfway there",
  21: "Three weeks strong",
  28: "All of Matthew",
};

function toUserProfile(displayName: string, avatar: AvatarConfig, translation: Translation): UserProfile {
  return { ...defaultAvatarConfig, ...avatar, displayName, translation };
}

function Header({
  heading,
  profile,
  onEditProfile,
}: {
  heading: string;
  profile: UserProfile;
  onEditProfile: () => void;
}) {
  return (
    <header className="topbar">
      <Brand />
      <button className="header-person" onClick={onEditProfile} aria-label="Edit your avatar">
        <span>
          {heading}
          <small>Edit profile</small>
        </span>
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
          small
        />
      </button>
    </header>
  );
}

export function AppShell(props: AppShellProps) {
  const router = useRouter();
  const today = useToday();

  // The server-sent profile is the source of truth. `optimisticProfile`
  // briefly overrides it between a saveProfile call and the router.refresh()
  // that re-fetches this page with the saved value -- avoiding a state/effect
  // sync loop by deriving rather than mirroring props into state.
  const baseProfile = useMemo(
    () => toUserProfile(props.displayName, props.avatar, props.translation),
    [props.displayName, props.translation, props.avatar],
  );
  const [optimisticProfile, setOptimisticProfile] = useState<UserProfile | null>(null);
  const profile = optimisticProfile ?? baseProfile;

  const [tab, setTab] = useState<Tab>("today");
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [flowChapter, setFlowChapter] = useState<number | null>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const chapters = useMemo(() => Array.from(new Set(props.chapters)), [props.chapters]);
  const chaptersRead = chapters.length;
  const coins = coinsFor(chaptersRead);
  const currentStreak = computeStreak(props.readingDates, today.todayLocal);
  const groupName = props.activeGroup?.groupName ?? null;

  const catchUpChapter = useMemo(() => {
    const ceiling = today.entry ? today.entry.chapter - 1 : Math.min(today.dayLabel, TOTAL_CHAPTERS);
    for (let chapter = ceiling; chapter >= 1; chapter -= 1) {
      if (!chapters.includes(chapter)) return chapter;
    }
    return null;
  }, [chapters, today]);

  function startReading(chapter: number) {
    setCheckInError(null);
    setFlowChapter(chapter);
    setFlowStep(1);
  }

  async function finishReading() {
    if (flowChapter === null) return;
    setPending(true);
    setCheckInError(null);
    const result = await checkIn({ chapter: flowChapter, timezone: today.timezone });
    setPending(false);
    if (result.ok) {
      setFlowStep(2);
      router.refresh();
    } else {
      setCheckInError("Something went wrong on our side. Try again in a bit.");
    }
  }

  async function handleSaveProfile(next: UserProfile) {
    setSavingProfile(true);
    setOptimisticProfile(next);
    try {
      window.localStorage.setItem("read-my-bible-profile-cache", JSON.stringify(next));
    } catch {
      /* Profile still works for this session without device storage. */
    }
    const { displayName, translation, ...avatar } = next;
    const result = await saveProfile({ displayName, translation, avatar });
    setSavingProfile(false);
    setProfileOpen(false);
    if (result.ok) router.refresh();
  }

  async function handleChooseGroup(groupId: number) {
    setPending(true);
    await chooseGroup({ groupId });
    setPending(false);
    router.refresh();
  }

  async function handleJoinCode(code: string) {
    setJoinError(null);
    setPending(true);
    const result = await joinByCode({ code });
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setJoinError(result.error);
    }
    return result;
  }

  function selectTab(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (props.needsGroupChoice) {
    return (
      <GroupPickerScreen memberships={props.memberships} pending={pending} onChoose={handleChooseGroup} />
    );
  }

  if (!props.activeGroup) {
    return (
      <div className="app-shell">
        <div className="paper-noise" />
        <SoloScreen error={joinError} pending={pending} onJoin={handleJoinCode} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="paper-noise" />
      {tab === "today" && (
        <TodayScreen
          today={today}
          chapters={chapters}
          chaptersRead={chaptersRead}
          catchUpChapter={catchUpChapter}
          streakDays={currentStreak}
          groupName={groupName}
          groupStats={props.groupStats}
          roster={props.roster}
          profile={profile}
          onStart={startReading}
          onEditProfile={() => setProfileOpen(true)}
        />
      )}
      {tab === "connect" && (
        <ConnectScreen
          groupName={groupName}
          campusName={props.campusName}
          isLeader={props.isLeader}
          roster={props.roster}
          groupStats={props.groupStats}
          appBaseUrl={props.appBaseUrl}
          profile={profile}
          onEditProfile={() => setProfileOpen(true)}
        />
      )}
      {tab === "rewards" && (
        <RewardsScreen profile={profile} chapters={chaptersRead} onEditProfile={() => setProfileOpen(true)} />
      )}
      {tab === "progress" && (
        <ProgressScreen
          today={today}
          chapters={chapters}
          chaptersRead={chaptersRead}
          coins={coins}
          streakDays={currentStreak}
          groupName={groupName}
          campusName={props.campusName}
          campusBoard={props.campusBoard}
          profile={profile}
          onCatchUp={startReading}
          onEditProfile={() => setProfileOpen(true)}
        />
      )}
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button key={item.id} data-tab={item.id} className={tab === item.id ? "active" : ""} onClick={() => selectTab(item.id)}>
            <NavIcon icon={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>
      {flowChapter !== null && (
        <CompletionFlow
          step={flowStep}
          chapter={flowChapter}
          isCatchUp={flowChapter !== today.entry?.chapter}
          chaptersRead={chaptersRead}
          groupName={groupName}
          streakDays={currentStreak}
          error={checkInError}
          pending={pending}
          onClose={() => {
            setFlowStep(0);
            setFlowChapter(null);
            setCheckInError(null);
          }}
          onComplete={finishReading}
        />
      )}
      {profileOpen && (
        <ProfileEditor profile={profile} saving={savingProfile} onClose={() => setProfileOpen(false)} onSave={handleSaveProfile} />
      )}
      {pending && <span className="sr-only" role="status">Saving…</span>}
    </div>
  );
}

function TodayScreen({
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
      <main className="screen today-screen">
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
      <main className="screen today-screen">
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
    <main className="screen today-screen">
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

function ConnectScreen({
  groupName,
  campusName,
  isLeader,
  roster,
  groupStats,
  appBaseUrl,
  profile,
  onEditProfile,
}: {
  groupName: string | null;
  campusName: string | null;
  isLeader: boolean;
  roster: RosterMemberView[];
  groupStats: GroupStats | null;
  appBaseUrl: string;
  profile: UserProfile;
  onEditProfile: () => void;
}) {
  const ratio = groupStats?.ratio ?? 0;
  const stage = stageFor(ratio);
  const selectedStage = stageIndex(stage);
  const nextStage = nextStageProgress(ratio);
  const groupCoins = coinsFor(groupStats?.checkinCount ?? 0);
  const readersToday = groupStats?.readersTodayIds.length ?? 0;
  const memberCount = groupStats?.memberCount ?? roster.length;
  const sorted = useMemo(() => [...roster].sort((a, b) => Number(b.readToday) - Number(a.readToday)), [roster]);

  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLeader) return;
    let cancelled = false;
    getOrCreateJoinCode().then((result) => {
      if (cancelled) return;
      if (result.ok) setJoinCode(result.code);
      else setCodeError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [isLeader]);

  useEffect(() => {
    if (!joinCode || !appBaseUrl) return;
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(`${appBaseUrl}/join/${joinCode}`).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [joinCode, appBaseUrl]);

  const stillReading = roster.filter((m) => !m.readToday);

  return (
    <main className="screen connect-screen">
      <Header heading={groupName ?? "Connect"} profile={profile} onEditProfile={onEditProfile} />
      <section className="connect-title">
        <h1>{groupName}</h1>
        <p>
          {campusName ?? "Favor Church"} · {memberCount} members
        </p>
      </section>
      <section className="big-home-card">
        <RotatableHome stage={selectedStage} completed={false} />
        <div className="big-home-info">
          <div>
            <p>CURRENT HOME</p>
            <h2>{stage}</h2>
            <span className="home-note">{homeStages[selectedStage].note}</span>
          </div>
          <div className="coin-chip">◉ {groupCoins}</div>
        </div>
        <ProgressBar value={nextStage?.pct ?? 100} max={100} />
        <div className="upgrade-copy">
          <strong>{nextStage ? `${nextStage.pct}% to ${nextStage.stage}` : "All stages reached"}</strong>
          <span>Next group upgrade</span>
        </div>
      </section>

      {isLeader && (
        <section className="leader-box">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LEADER TOOLS</p>
              <h2>Bring someone in</h2>
            </div>
          </div>
          <p>Show this code or QR to anyone in the room who isn&apos;t in a Connect Group yet. They enter it in the app and they&apos;re in.</p>
          <div className="leader-code-row">
            <div className="leader-code">
              <span className="eyebrow">GROUP CODE</span>
              <strong>{joinCode ?? (codeError ? "----" : "Loading…")}</strong>
            </div>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR code to join ${groupName}`} width={96} height={96} />
            )}
          </div>
          {codeError && <p className="error-note">{codeError}</p>}
          {stillReading.length > 0 && (
            <div className="leader-nudge">
              <p className="eyebrow">STILL READING</p>
              <span>{stillReading.map((m) => m.name).join(", ")} haven&apos;t checked in today. A quick message goes a long way.</span>
            </div>
          )}
        </section>
      )}

      <section className="member-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WHO&apos;S READ TODAY</p>
            <h2>{readersToday} of {memberCount} have read</h2>
          </div>
          <div className="status-key">
            <i /> Read
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="gentle-note">Nobody yet. Be the first one today.</p>
        ) : (
          <div className="member-grid">
            {sorted.map((m) => {
              const seed = avatarSeedFor(m.personId);
              return (
                <article className={`member-card ${m.readToday ? "read" : "waiting"}`} key={m.personId}>
                  <div className="member-avatar">
                    <Avatar color={seed.color} skin={seed.skin} hair={seed.hair} />
                    {m.readToday && <b>✓</b>}
                  </div>
                  <strong>{m.name}</strong>
                  <span>{m.readToday ? "Read today" : "Not yet"}</span>
                </article>
              );
            })}
          </div>
        )}
        <p className="gentle-note">We cheer for groups, not against people.</p>
      </section>
      <a className="secondary-link connect-portal-link" href="https://connect.favor.church">
        Manage your group on connect.favor.church
      </a>
    </main>
  );
}

const REWARD_THRESHOLDS = [3, 7, 14, 21, 28];

function RewardsScreen({ profile, chapters, onEditProfile }: { profile: UserProfile; chapters: number; onEditProfile: () => void }) {
  const earned = medalsReached(chapters);
  const next = nextMedal(chapters);
  return (
    <main className="screen rewards-screen">
      <Header heading="Rewards" profile={profile} onEditProfile={onEditProfile} />
      <section className="page-title">
        <h1>Rewards</h1>
        <p>Rewards celebrate consistency, not comparison.</p>
      </section>
      <section className="shelf-cabinet">
        <div className="shelf-row">
          {REWARD_THRESHOLDS.slice(0, 3).map((threshold) => (
            <Reward key={threshold} threshold={threshold} earned={earned.includes(threshold)} />
          ))}
        </div>
        <div className="wood-shelf" />
        <div className="shelf-row two">
          {REWARD_THRESHOLDS.slice(3).map((threshold) => (
            <Reward key={threshold} threshold={threshold} earned={earned.includes(threshold)} />
          ))}
        </div>
        <div className="wood-shelf" />
      </section>
      {next !== null && (
        <section className="next-reward">
          <div className="mini-medal gold">◇</div>
          <div>
            <p className="eyebrow">NEXT REWARD</p>
            <h2>{REWARD_TITLES[next]}</h2>
            <span>{next - chapters} more chapters</span>
          </div>
          <strong>
            {chapters} / {next}
          </strong>
        </section>
      )}
    </main>
  );
}

function Reward({ threshold, earned }: { threshold: number; earned: boolean }) {
  const meta = REWARD_META[threshold];
  const title = REWARD_TITLES[threshold];
  return (
    <article className={`reward ${earned ? "earned" : "locked"}`}>
      {meta.kind === "trophy" ? (
        <div className={`shelf-award trophy-award ${meta.tone} trophy-${meta.shape}`}>
          <span className="trophy-cup">★</span>
          <i />
          <b />
          <em>{threshold}</em>
        </div>
      ) : (
        <div className={`shelf-award medal-award ${meta.tone} medal-${meta.shape}`}>
          <i className="medal-ribbons" />
          <b className="medal-face">{meta.shape === "star" ? "★" : "✦"}</b>
          <span>{threshold}</span>
        </div>
      )}
      <strong>{title}</strong>
      <span>{earned ? "Earned" : `${threshold} chapters`}</span>
    </article>
  );
}

function ProgressScreen({
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

function GroupPickerScreen({
  memberships,
  pending,
  onChoose,
}: {
  memberships: GroupMembership[];
  pending: boolean;
  onChoose: (groupId: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(memberships.find((m) => m.isLeader)?.groupId ?? memberships[0]?.groupId ?? null);
  return (
    <div className="app-shell">
      <div className="paper-noise" />
      <main className="screen picker-screen">
        <Brand />
        <section className="hero-copy">
          <h1>Which group are you reading with?</h1>
          <p>You&apos;re in more than one Connect Group. Pick one for October. You can switch later.</p>
        </section>
        <div className="picker-list">
          {memberships.map((m) => (
            <button
              key={m.groupId}
              type="button"
              className={`picker-option ${selected === m.groupId ? "selected" : ""}`}
              onClick={() => setSelected(m.groupId)}
              aria-pressed={selected === m.groupId}
            >
              {m.groupName}
            </button>
          ))}
        </div>
        <button className="primary-button" disabled={pending || selected === null} onClick={() => selected !== null && onChoose(selected)}>
          <strong>Read with this group</strong>
        </button>
      </main>
    </div>
  );
}

function SoloScreen({
  error,
  pending,
  onJoin,
}: {
  error: string | null;
  pending: boolean;
  onJoin: (code: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [entering, setEntering] = useState(false);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <main className="screen solo-screen">
      <Brand />
      <section className="hero-copy">
        <h1>You&apos;re reading solo for now.</h1>
        <p>Ask a Connect Group leader for their group code and join in. Your coins come with you.</p>
      </section>
      {!entering ? (
        <button className="primary-button" onClick={() => setEntering(true)}>
          <strong>Enter a group code</strong>
        </button>
      ) : (
        <form
          className="join-code-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await onJoin(code.trim().toUpperCase());
          }}
        >
          <label>
            <span>Group code</span>
            <input
              ref={inputRef}
              value={code}
              maxLength={4}
              autoCapitalize="characters"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="F52A"
            />
          </label>
          {error && <p className="error-note">{error}</p>}
          <button className="primary-button" type="submit" disabled={pending || code.trim().length !== 4}>
            <strong>Join group</strong>
          </button>
        </form>
      )}
      <a className="secondary-link" href="https://connect.favor.church">
        Find a Connect Group at connect.favor.church
      </a>
    </main>
  );
}
